import { getTechnology } from "@gitflex/technologies/lookup";

import {
  daysSince,
  formatterCredit,
  isTyped,
  type RepositoryFacts,
  type ScoringContext,
} from "./context";
import { clamp, logScale, sampleConfidence } from "./normalize";
import type { Dimension, RepositoryEvidence } from "./types";

export interface MetricMeasurement {
  confidence: number;
  repositories: RepositoryEvidence[];
  /** 0-1. */
  score: number;
  summary: string;
}

export interface MetricDefinition {
  /** Documented definition shown next to the score. */
  description: string;
  dimension: Dimension;
  id: string;
  label: string;
  /** Returns `null` when there is no evidence; the metric is then unknown, not failed. */
  measure: (context: ScoringContext) => MetricMeasurement | null;
  /** Shown when `measure` returns `null`. */
  unknownReason: string;
  weight: number;
}

/** Repositories needed before a coverage metric reaches full confidence. */
const COVERAGE_SAMPLE = 8;
/** Metrics that use repository activity as a stand-in for authored commits. */
const PROXY_CONFIDENCE_CAP = 0.5;
const NOT_COLLECTED = "Not collected yet.";
const NO_SECURITY_ANALYSIS =
  "Static security analysis has not run yet. No findings is not treated as a pass.";
const NO_CODE_ANALYSIS =
  "Requires source code analysis, which has not run yet.";

function evidenceOf(facts: RepositoryFacts, value: number): RepositoryEvidence {
  return {
    fullName: facts.repository.fullName,
    repositoryId: facts.repository.id,
    value: clamp(value),
  };
}

function byValue(a: RepositoryEvidence, b: RepositoryEvidence): number {
  return b.value - a.value || a.fullName.localeCompare(b.fullName);
}

/**
 * Size-weighted share of repositories that meet a criterion.
 * `measureRepository` returns 0-1, or `null` to leave a repository out of the population.
 */
function coverage(
  population: readonly RepositoryFacts[],
  measureRepository: (facts: RepositoryFacts) => number | null,
  describe: (met: number, total: number) => string
): MetricMeasurement | null {
  let weighted = 0;
  let totalWeight = 0;
  let met = 0;
  const repositories: RepositoryEvidence[] = [];
  for (const facts of population) {
    const value = measureRepository(facts);
    if (value === null) {
      continue;
    }
    weighted += facts.weight * value;
    totalWeight += facts.weight;
    if (value >= 0.5) {
      met += 1;
    }
    repositories.push(evidenceOf(facts, value));
  }
  if (repositories.length === 0) {
    return null;
  }
  return {
    confidence: sampleConfidence(repositories.length, COVERAGE_SAMPLE),
    repositories: repositories.toSorted(byValue),
    score: weighted / totalWeight,
    summary: describe(met, repositories.length),
  };
}

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function inRepositories(what: string) {
  return (met: number, total: number) =>
    `${what} in ${met} of ${total} ${total === 1 ? "repository" : "repositories"}.`;
}

function withDependencies(facts: RepositoryFacts): boolean {
  return facts.repository.hasDependencies && facts.repository.signals !== null;
}

function dependencyHygiene(facts: RepositoryFacts): number | null {
  if (!withDependencies(facts)) {
    return null;
  }
  const lockfile = (facts.repository.signals?.lockfiles.length ?? 0) > 0;
  const automation = facts.practices.has("dependency-automation");
  return (lockfile ? 0.7 : 0) + (automation ? 0.3 : 0);
}

/** Mean of the top `count` values, padding with zeros so one outlier cannot carry the metric. */
function topMean(values: readonly number[], count: number): number {
  const top = values.toSorted((a, b) => b - a).slice(0, count);
  return top.reduce((sum, value) => sum + value, 0) / count;
}

const INFLUENCE_TOP = 5;

function popularity(
  context: ScoringContext,
  measureRepository: (facts: RepositoryFacts) => number,
  cap: number,
  noun: string
): MetricMeasurement | null {
  const owned = context.original.filter(
    (facts) => facts.repository.ownership !== "collaborator"
  );
  if (owned.length === 0) {
    return null;
  }
  const repositories = owned
    .map((facts) => evidenceOf(facts, logScale(measureRepository(facts), cap)))
    .filter((evidence) => evidence.value > 0)
    .toSorted(byValue);
  const total = owned.reduce((sum, facts) => sum + measureRepository(facts), 0);
  return {
    confidence: 1,
    repositories,
    score: topMean(
      repositories.map((evidence) => evidence.value),
      INFLUENCE_TOP
    ),
    summary: `${total} ${noun} across ${owned.length} original repositories; the top ${INFLUENCE_TOP} count equally.`,
  };
}

function recentlyActive(
  context: ScoringContext,
  ownership: (facts: RepositoryFacts) => boolean,
  cap: number,
  what: string
): MetricMeasurement | null {
  const population = context.original.filter(ownership);
  if (population.length === 0) {
    return null;
  }
  const active = population.filter((facts) => {
    const days = daysSince(facts.repository.pushedAt, context.now);
    return days !== null && days <= 365;
  });
  return {
    confidence: Math.min(
      PROXY_CONFIDENCE_CAP,
      sampleConfidence(population.length, COVERAGE_SAMPLE)
    ),
    repositories: active.map((facts) => evidenceOf(facts, 1)).toSorted(byValue),
    score: logScale(active.length, cap),
    summary: `${active.length} ${what} pushed in the last year. Based on repository activity, not individual commits.`,
  };
}

const DOMAIN_EXCLUDED = new Set(["language", "developer-tooling"]);

export const METRICS: readonly MetricDefinition[] = [
  {
    description:
      "Share of code repositories with test files; a test framework without test files earns half.",
    dimension: "reliability",
    id: "testing",
    label: "Test infrastructure",
    measure: (context) =>
      coverage(
        context.code,
        (facts) => {
          if ((facts.repository.signals?.testFiles ?? 0) > 0) {
            return 1;
          }
          return facts.practices.has("automated-testing") ? 0.5 : 0;
        },
        inRepositories("Tests found")
      ),
    unknownReason: "No analyzed repository contains source files.",
    weight: 0.25,
  },
  {
    description: "Share of analyzed repositories with a CI pipeline.",
    dimension: "reliability",
    id: "ci",
    label: "Continuous integration",
    measure: (context) =>
      coverage(
        context.analyzed,
        (facts) => (facts.practices.has("continuous-integration") ? 1 : 0),
        inRepositories("CI configured")
      ),
    unknownReason: "No analyzed repositories.",
    weight: 0.2,
  },
  {
    description: "Error handling patterns in source code.",
    dimension: "reliability",
    id: "error-handling",
    label: "Error handling",
    measure: () => null,
    unknownReason: NO_CODE_ANALYSIS,
    weight: 0.15,
  },
  {
    description:
      "Repositories with dependencies that commit a lockfile (70%) and automate updates (30%).",
    dimension: "reliability",
    id: "dependency-hygiene",
    label: "Dependency hygiene",
    measure: (context) =>
      coverage(
        context.analyzed,
        dependencyHygiene,
        inRepositories("Dependencies pinned")
      ),
    unknownReason: "No analyzed repository declares dependencies.",
    weight: 0.15,
  },
  {
    description:
      "Recency of the five most recently pushed original repositories: full credit within 90 days, none after two years.",
    dimension: "reliability",
    id: "maintenance",
    label: "Maintenance activity",
    measure: (context) => {
      const recent = context.original
        .filter((facts) => !facts.repository.isArchived)
        .map((facts) => ({
          days: daysSince(facts.repository.pushedAt, context.now),
          facts,
        }))
        .filter(
          (entry): entry is { days: number; facts: RepositoryFacts } =>
            entry.days !== null
        )
        .toSorted((a, b) => a.days - b.days)
        .slice(0, 5);
      if (recent.length === 0) {
        return null;
      }
      const values = recent.map(({ days }) =>
        clamp(1 - (days - 90) / (730 - 90))
      );
      return {
        confidence: sampleConfidence(recent.length, 5),
        repositories: recent
          .map(({ facts }, index) => evidenceOf(facts, values[index] ?? 0))
          .toSorted(byValue),
        score: values.reduce((sum, value) => sum + value, 0) / values.length,
        summary: `Most recent push ${plural(Math.round(recent[0]?.days ?? 0), "day")} ago.`,
      };
    },
    unknownReason: "No active original repositories.",
    weight: 0.15,
  },
  {
    description:
      "Share of code repositories with release automation, a changelog or container builds.",
    dimension: "reliability",
    id: "release-practices",
    label: "Release and build practices",
    measure: (context) =>
      coverage(
        context.code,
        (facts) => {
          const { signals } = facts.repository;
          return signals?.releaseAutomation ||
            signals?.changelog ||
            facts.practices.has("containerization")
            ? 1
            : 0;
        },
        inRepositories("Release practices found")
      ),
    unknownReason: "No analyzed repository contains source files.",
    weight: 0.1,
  },

  {
    description: "Critical and high severity static analysis findings.",
    dimension: "security",
    id: "critical-findings",
    label: "Critical and high findings",
    measure: () => null,
    unknownReason: NO_SECURITY_ANALYSIS,
    weight: 0.4,
  },
  {
    description: "Medium severity static analysis findings.",
    dimension: "security",
    id: "medium-findings",
    label: "Medium findings",
    measure: () => null,
    unknownReason: NO_SECURITY_ANALYSIS,
    weight: 0.15,
  },
  {
    description:
      "Repositories with dependencies that commit a lockfile (70%) and automate updates (30%).",
    dimension: "security",
    id: "dependency-hygiene",
    label: "Dependency hygiene",
    measure: (context) =>
      coverage(
        context.analyzed,
        dependencyHygiene,
        inRepositories("Dependencies pinned")
      ),
    unknownReason: "No analyzed repository declares dependencies.",
    weight: 0.15,
  },
  {
    description:
      "Share of code repositories with a security policy (60%) and code owners (40%).",
    dimension: "security",
    id: "security-configuration",
    label: "Security configuration",
    measure: (context) =>
      coverage(
        context.code,
        (facts) =>
          (facts.repository.signals?.securityPolicy ? 0.6 : 0) +
          (facts.repository.signals?.codeowners ? 0.4 : 0),
        inRepositories("Security policy found")
      ),
    unknownReason: "No analyzed repository contains source files.",
    weight: 0.15,
  },
  {
    description: "Secure coding patterns in source code.",
    dimension: "security",
    id: "secure-coding",
    label: "Secure coding",
    measure: () => null,
    unknownReason: NO_SECURITY_ANALYSIS,
    weight: 0.1,
  },
  {
    description:
      "Share of analyzed repositories with security scanning; dependency automation alone earns half.",
    dimension: "security",
    id: "security-automation",
    label: "Security automation",
    measure: (context) =>
      coverage(
        context.analyzed,
        (facts) => {
          if (facts.practices.has("security-scanning")) {
            return 1;
          }
          return facts.practices.has("dependency-automation") ? 0.5 : 0;
        },
        inRepositories("Security scanning configured")
      ),
    unknownReason: "No analyzed repositories.",
    weight: 0.05,
  },

  {
    description:
      "Share of source files under conventional directories such as src/, lib/ or packages/, in repositories with at least five source files.",
    dimension: "maintainability",
    id: "organization",
    label: "Code organization",
    measure: (context) =>
      coverage(
        context.code,
        (facts) => {
          const { signals } = facts.repository;
          if (!signals || signals.sourceFiles < 5) {
            return null;
          }
          return clamp(
            signals.structuredSourceFiles / signals.sourceFiles / 0.8
          );
        },
        inRepositories("Structured source")
      ),
    unknownReason: "No analyzed repository has at least five source files.",
    weight: 0.2,
  },
  {
    description:
      "Ratio of test files to source files; one test file per four source files earns full credit.",
    dimension: "maintainability",
    id: "testing",
    label: "Testing practices",
    measure: (context) =>
      coverage(
        context.code,
        (facts) => {
          const { signals } = facts.repository;
          return signals
            ? clamp(signals.testFiles / signals.sourceFiles / 0.25)
            : null;
        },
        inRepositories("Substantial tests")
      ),
    unknownReason: "No analyzed repository contains source files.",
    weight: 0.2,
  },
  {
    description:
      "Share of analyzed repositories written in a statically typed language or using a type checker or schema validation.",
    dimension: "maintainability",
    id: "type-safety",
    label: "Type safety",
    measure: (context) =>
      coverage(
        context.analyzed,
        (facts) => {
          if (facts.primaryLanguage === null) {
            return null;
          }
          return isTyped(facts) ? 1 : 0;
        },
        inRepositories("Static types")
      ),
    unknownReason: "No analyzed repository has an application language.",
    weight: 0.15,
  },
  {
    description:
      "README (60%), docs or contributing guide (20%) and a repository description (20%).",
    dimension: "maintainability",
    id: "documentation",
    label: "Documentation",
    measure: (context) =>
      coverage(
        context.code,
        (facts) => {
          const { description, signals } = facts.repository;
          return (
            (signals?.readme ? 0.6 : 0) +
            (signals?.docsDirectory || signals?.contributing ? 0.2 : 0) +
            (description ? 0.2 : 0)
          );
        },
        inRepositories("Documented")
      ),
    unknownReason: "No analyzed repository contains source files.",
    weight: 0.15,
  },
  {
    description: "Language-aware complexity of functions and modules.",
    dimension: "maintainability",
    id: "complexity",
    label: "Complexity",
    measure: () => null,
    unknownReason: NO_CODE_ANALYSIS,
    weight: 0.15,
  },
  {
    description:
      "Share of analyzed repositories with a linter or formatter; a toolchain formatter such as gofmt earns half.",
    dimension: "maintainability",
    id: "linting",
    label: "Linting and formatting",
    measure: (context) =>
      coverage(
        context.analyzed,
        (facts) =>
          facts.primaryLanguage === null ? null : formatterCredit(facts),
        inRepositories("Linting configured")
      ),
    unknownReason: "No analyzed repository has an application language.",
    weight: 0.1,
  },
  {
    description:
      "Share of repositories with dependencies that commit a lockfile.",
    dimension: "maintainability",
    id: "dependency-management",
    label: "Dependency management",
    measure: (context) =>
      coverage(
        context.analyzed,
        (facts) =>
          withDependencies(facts)
            ? Number((facts.repository.signals?.lockfiles.length ?? 0) > 0)
            : null,
        inRepositories("Lockfile committed")
      ),
    unknownReason: "No analyzed repository declares dependencies.",
    weight: 0.05,
  },

  {
    description:
      "Original repositories with at least ten source files; fifty earns full credit, logarithmically.",
    dimension: "uniqueness",
    id: "original-projects",
    label: "Original projects",
    measure: (context) => {
      if (context.code.length === 0) {
        return null;
      }
      const projects = context.code.filter(
        (facts) => (facts.repository.signals?.sourceFiles ?? 0) >= 10
      );
      return {
        confidence: sampleConfidence(context.code.length, COVERAGE_SAMPLE),
        repositories: projects
          .map((facts) => evidenceOf(facts, 1))
          .toSorted(byValue),
        score: logScale(projects.length, 50),
        summary: `${projects.length} non-trivial original projects.`,
      };
    },
    unknownReason: "No analyzed repository contains source files.",
    weight: 0.3,
  },
  {
    description:
      "Distinct technologies with strong or declared evidence; eighty earns full credit, logarithmically.",
    dimension: "uniqueness",
    id: "technical-diversity",
    label: "Technical diversity",
    measure: (context) => {
      if (context.analyzed.length === 0) {
        return null;
      }
      const technologies = new Set(
        context.analyzed.flatMap((facts) => [...facts.technologies])
      );
      return {
        confidence: sampleConfidence(context.analyzed.length, COVERAGE_SAMPLE),
        repositories: [],
        score: logScale(technologies.size, 80),
        summary: `${technologies.size} distinct technologies.`,
      };
    },
    unknownReason: "No analyzed repositories.",
    weight: 0.3,
  },
  {
    description:
      "Distinct domains (frontend, backend, data and so on) with at least one demonstrated technology; twelve earns full credit.",
    dimension: "uniqueness",
    id: "domain-breadth",
    label: "Distinct domains",
    measure: (context) => {
      if (context.analyzed.length === 0) {
        return null;
      }
      const domains = new Set(
        context.analyzed.flatMap((facts) =>
          [...facts.technologies]
            .map((id) => getTechnology(id)?.category)
            .filter(
              (category): category is NonNullable<typeof category> =>
                category !== undefined && !DOMAIN_EXCLUDED.has(category)
            )
        )
      );
      return {
        confidence: sampleConfidence(context.analyzed.length, COVERAGE_SAMPLE),
        repositories: [],
        score: clamp(domains.size / 12),
        summary: `${domains.size} domains: ${[...domains].sort().join(", ") || "none"}.`,
      };
    },
    unknownReason: "No analyzed repositories.",
    weight: 0.25,
  },
  {
    description:
      "Distinct application languages that are significant in at least one repository; twelve earns full credit, logarithmically.",
    dimension: "uniqueness",
    id: "language-breadth",
    label: "Language breadth",
    measure: (context) => {
      if (context.analyzed.length === 0) {
        return null;
      }
      const languages = new Set(
        context.analyzed.flatMap((facts) => facts.significantLanguages)
      );
      return {
        confidence: sampleConfidence(context.analyzed.length, COVERAGE_SAMPLE),
        repositories: [],
        score: logScale(languages.size, 12),
        summary: `${languages.size} significant languages.`,
      };
    },
    unknownReason: "No analyzed repositories.",
    weight: 0.15,
  },

  {
    description:
      "Owned, non-fork repositories pushed in the last year; twenty earns full credit, logarithmically.",
    dimension: "contribution",
    id: "authored-work",
    label: "Authored work",
    measure: (context) =>
      recentlyActive(
        context,
        (facts) => facts.repository.ownership === "owner",
        20,
        "owned repositories"
      ),
    unknownReason: "No owned repositories.",
    weight: 0.35,
  },
  {
    description:
      "Organization and collaborator repositories pushed in the last year; ten earns full credit, logarithmically.",
    dimension: "contribution",
    id: "collaboration",
    label: "Collaboration",
    measure: (context) =>
      recentlyActive(
        context,
        (facts) => facts.repository.ownership !== "owner",
        10,
        "shared repositories"
      ),
    unknownReason: "No organization or collaborator repositories.",
    weight: 0.25,
  },
  {
    description:
      "Merged pull requests across repositories, normalized per window.",
    dimension: "contribution",
    id: "merged-pull-requests",
    label: "Merged pull requests",
    measure: () => null,
    unknownReason: NOT_COLLECTED,
    weight: 0.2,
  },
  {
    description: "Pull request reviews given to others.",
    dimension: "contribution",
    id: "reviews",
    label: "Reviews",
    measure: () => null,
    unknownReason: NOT_COLLECTED,
    weight: 0.2,
  },

  {
    description:
      "Stars on original repositories, logarithmic up to 1,000 per repository; mean of the top five.",
    dimension: "influence",
    id: "stars",
    label: "Stars",
    measure: (context) =>
      popularity(context, (facts) => facts.repository.stars, 1000, "stars"),
    unknownReason: "No original repositories.",
    weight: 0.4,
  },
  {
    description:
      "Forks of original repositories, logarithmic up to 200 per repository; mean of the top five.",
    dimension: "influence",
    id: "forks",
    label: "Forks",
    measure: (context) =>
      popularity(context, (facts) => facts.repository.forks, 200, "forks"),
    unknownReason: "No original repositories.",
    weight: 0.3,
  },
  {
    description: "Distinct outside contributors to original repositories.",
    dimension: "influence",
    id: "external-contributors",
    label: "External contributors",
    measure: () => null,
    unknownReason: NOT_COLLECTED,
    weight: 0.3,
  },
];
