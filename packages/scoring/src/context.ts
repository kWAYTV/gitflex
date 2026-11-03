import {
  hasToolchainFormatter,
  isApplicationLanguage,
  isStaticallyTyped,
} from "@gitflex/technologies/languages";
import { getTechnology } from "@gitflex/technologies/lookup";
import { implies, PRACTICES } from "@gitflex/technologies/practices";
import type { TechnologyCategory } from "@gitflex/technologies/types";

import { repositoryWeight } from "./normalize";
import type { ScoringInput, ScoringRepository } from "./types";

/** Technologies below this confidence are weak signals and never count toward a score. */
export const MIN_TECHNOLOGY_CONFIDENCE = 0.6;

export interface RepositoryFacts {
  categories: ReadonlySet<TechnologyCategory>;
  practices: ReadonlySet<string>;
  primaryLanguage: string | null;
  repository: ScoringRepository;
  /** Application languages that are primary or at least 10% of the repository. */
  significantLanguages: readonly string[];
  technologies: ReadonlySet<string>;
  weight: number;
}

export interface ScoringContext {
  /** Analyzed, non-fork repositories. */
  analyzed: readonly RepositoryFacts[];
  /** Analyzed, non-fork repositories with path signals and at least one source file. */
  code: readonly RepositoryFacts[];
  now: Date;
  /** Non-fork repositories, analyzed or not. */
  original: readonly RepositoryFacts[];
}

function primaryLanguageOf(repository: ScoringRepository): string | null {
  const application = repository.languages.filter((language) =>
    isApplicationLanguage({ id: language.languageId, type: language.type })
  );
  const primary =
    application.find((language) => language.role === "primary") ??
    application.toSorted((a, b) => b.percentage - a.percentage)[0];
  return primary?.languageId ?? null;
}

function toFacts(repository: ScoringRepository): RepositoryFacts {
  const technologies = new Set<string>();
  const categories = new Set<TechnologyCategory>();
  for (const detection of repository.technologies) {
    if (detection.confidence < MIN_TECHNOLOGY_CONFIDENCE) {
      continue;
    }
    technologies.add(detection.technologyId);
    const category = getTechnology(detection.technologyId)?.category;
    if (category) {
      categories.add(category);
    }
  }
  const practices = new Set(
    PRACTICES.filter((practice) =>
      [...technologies].some((id) => implies(practice, id))
    ).map((practice) => practice.id)
  );
  const significantLanguages = repository.languages
    .filter(
      (language) =>
        isApplicationLanguage({
          id: language.languageId,
          type: language.type,
        }) &&
        (language.role === "primary" || language.percentage >= 10)
    )
    .map((language) => language.languageId);

  return {
    categories,
    practices,
    primaryLanguage: primaryLanguageOf(repository),
    repository,
    significantLanguages,
    technologies,
    weight: repositoryWeight(repository.sizeKb),
  };
}

export function createContext(input: ScoringInput): ScoringContext {
  // Sorting makes floating-point sums independent of input order.
  const original = input.repositories
    .filter((repository) => !repository.isFork)
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .map(toFacts);
  const analyzed = original.filter((facts) => facts.repository.analyzed);
  const code = analyzed.filter(
    (facts) => (facts.repository.signals?.sourceFiles ?? 0) > 0
  );
  return { analyzed, code, now: input.now, original };
}

export function isTyped(facts: RepositoryFacts): boolean {
  return (
    facts.practices.has("static-typing") ||
    (facts.primaryLanguage !== null && isStaticallyTyped(facts.primaryLanguage))
  );
}

export function formatterCredit(facts: RepositoryFacts): number {
  if (facts.practices.has("linting-and-formatting")) {
    return 1;
  }
  return facts.primaryLanguage !== null &&
    hasToolchainFormatter(facts.primaryLanguage)
    ? 0.5
    : 0;
}

const DAY_MS = 86_400_000;

export function daysSince(date: Date | null, now: Date): number | null {
  return date ? Math.max(0, (now.getTime() - date.getTime()) / DAY_MS) : null;
}
