import { TECHNOLOGIES } from "@gitflex/technologies/registry";
import type { Ecosystem, Technology } from "@gitflex/technologies/types";
import picomatch from "picomatch";
import type { Dependency } from "../manifests/types";
import {
  combineConfidence,
  DEFAULT_EVIDENCE_WEIGHTS,
  type EvidenceKind,
  type EvidenceWeights,
} from "./weights";

export type UsageType =
  | "active"
  | "integrated"
  | "declared"
  | "tooling"
  | "inferred";

export interface Evidence {
  kind: EvidenceKind;
  /** Rule that fired, e.g. `package:npm:next` or `config:next.config.{js,ts}`. */
  rule: string;
  /** File path, optionally with a `#fragment` naming the manifest entry. */
  source: string;
  weight: number;
}

export interface DetectedTechnology {
  confidence: number;
  evidence: Evidence[];
  /** Total matches before per-kind truncation. */
  evidenceCount: number;
  technologyId: string;
  usageType: UsageType;
}

export interface DetectionInput {
  dependencies: readonly Dependency[];
  /** Evidence records kept per technology and kind; the full count is still reported. */
  maxEvidencePerKind?: number;
  paths: readonly string[];
  weights?: Partial<EvidenceWeights>;
}

const USAGE_BY_KIND: Record<EvidenceKind, UsageType> = {
  configuration: "integrated",
  convention: "inferred",
  dependency: "declared",
  "dependency-with-structure": "integrated",
  "development-dependency": "tooling",
  documentation: "inferred",
  "source-usage": "active",
};

interface CompiledRule {
  pattern: string;
  test: (path: string) => boolean;
}

interface CompiledTechnology {
  configFiles: CompiledRule[];
  conventions: CompiledRule[];
  structure: CompiledRule[];
  technology: Technology;
}

/** Rules match at any depth so monorepo packages (`apps/web/next.config.ts`) are found. */
function compile(patterns: readonly string[] | undefined): CompiledRule[] {
  return (patterns ?? []).map((pattern) => {
    const matcher = picomatch(
      pattern.startsWith("**/") ? pattern : `**/${pattern}`,
      { dot: true }
    );
    return { pattern, test: (path: string) => matcher(path) };
  });
}

const COMPILED: readonly CompiledTechnology[] = TECHNOLOGIES.map(
  (technology) => ({
    configFiles: compile(technology.detection.configFiles),
    conventions: compile(technology.detection.conventions),
    structure: compile(technology.detection.structure),
    technology,
  })
);

interface PackageIndex {
  exact: Map<string, string[]>;
  prefixes: [prefix: string, technologyId: string][];
}

const PACKAGE_INDEX = new Map<Ecosystem, PackageIndex>();
for (const { id, detection } of TECHNOLOGIES) {
  for (const matcher of detection.packages ?? []) {
    let index = PACKAGE_INDEX.get(matcher.ecosystem);
    if (!index) {
      index = { exact: new Map(), prefixes: [] };
      PACKAGE_INDEX.set(matcher.ecosystem, index);
    }
    for (const name of matcher.names ?? []) {
      index.exact.set(name, [...(index.exact.get(name) ?? []), id]);
    }
    for (const prefix of matcher.prefixes ?? []) {
      index.prefixes.push([prefix, id]);
    }
  }
}

function matchPackage(
  ecosystem: Ecosystem,
  name: string
): Array<{ technologyId: string; rule: string }> {
  const index = PACKAGE_INDEX.get(ecosystem);
  if (!index) {
    return [];
  }
  const matches = (index.exact.get(name) ?? []).map((technologyId) => ({
    rule: `package:${ecosystem}:${name}`,
    technologyId,
  }));
  for (const [prefix, technologyId] of index.prefixes) {
    if (
      name.startsWith(prefix) &&
      !matches.some((match) => match.technologyId === technologyId)
    ) {
      matches.push({ rule: `package:${ecosystem}:${prefix}*`, technologyId });
    }
  }
  return matches;
}

class EvidenceCollector {
  readonly #byTechnology = new Map<string, Map<string, Evidence>>();

  add(technologyId: string, evidence: Evidence): void {
    let records = this.#byTechnology.get(technologyId);
    if (!records) {
      records = new Map();
      this.#byTechnology.set(technologyId, records);
    }
    records.set(`${evidence.kind}|${evidence.source}`, evidence);
  }

  has(technologyId: string): boolean {
    return this.#byTechnology.has(technologyId);
  }

  entries() {
    return this.#byTechnology.entries();
  }
}

function firstMatch(rules: readonly CompiledRule[], paths: readonly string[]) {
  for (const rule of rules) {
    const path = paths.find(rule.test);
    if (path) {
      return { path, rule };
    }
  }
  return null;
}

function allMatches(rules: readonly CompiledRule[], paths: readonly string[]) {
  return rules.flatMap((rule) =>
    paths.filter(rule.test).map((path) => ({ path, rule }))
  );
}

function collectDependencyEvidence(
  collector: EvidenceCollector,
  dependencies: readonly Dependency[],
  weights: EvidenceWeights
): void {
  for (const dependency of dependencies) {
    const kind: EvidenceKind =
      dependency.scope === "production"
        ? "dependency"
        : "development-dependency";
    for (const { rule, technologyId } of matchPackage(
      dependency.ecosystem,
      dependency.name
    )) {
      collector.add(technologyId, {
        kind,
        rule,
        source: `${dependency.manifestPath}#${dependency.name}`,
        weight: weights[kind],
      });
    }
  }
}

function collectFileEvidence(
  collector: EvidenceCollector,
  paths: readonly string[],
  weights: EvidenceWeights
): void {
  for (const { configFiles, conventions, structure, technology } of COMPILED) {
    for (const { path, rule } of allMatches(configFiles, paths)) {
      collector.add(technology.id, {
        kind: "configuration",
        rule: `config:${rule.pattern}`,
        source: path,
        weight: weights.configuration,
      });
    }
    // Structure only confirms a dependency; on its own a `pages/` directory proves nothing.
    if (collector.has(technology.id)) {
      const match = firstMatch(structure, paths);
      if (match) {
        collector.add(technology.id, {
          kind: "dependency-with-structure",
          rule: `structure:${match.rule.pattern}`,
          source: match.path,
          weight: weights["dependency-with-structure"],
        });
      }
    }
    const convention = firstMatch(conventions, paths);
    if (convention) {
      collector.add(technology.id, {
        kind: "convention",
        rule: `convention:${convention.rule.pattern}`,
        source: convention.path,
        weight: weights.convention,
      });
    }
  }
}

function summarize(
  technologyId: string,
  records: Iterable<Evidence>,
  maxPerKind: number
): DetectedTechnology {
  const evidence = [...records].sort(
    (a, b) => b.weight - a.weight || a.source.localeCompare(b.source)
  );
  const strongestByKind = new Map<EvidenceKind, number>();
  const keptPerKind = new Map<EvidenceKind, number>();
  const kept: Evidence[] = [];
  for (const record of evidence) {
    strongestByKind.set(
      record.kind,
      Math.max(strongestByKind.get(record.kind) ?? 0, record.weight)
    );
    const count = keptPerKind.get(record.kind) ?? 0;
    if (count < maxPerKind) {
      kept.push(record);
      keptPerKind.set(record.kind, count + 1);
    }
  }
  const [strongest] = evidence;
  return {
    confidence: combineConfidence([...strongestByKind.values()]),
    evidence: kept,
    evidenceCount: evidence.length,
    technologyId,
    usageType: strongest ? USAGE_BY_KIND[strongest.kind] : "inferred",
  };
}

export function detectTechnologies(
  input: DetectionInput
): DetectedTechnology[] {
  const weights: EvidenceWeights = {
    ...DEFAULT_EVIDENCE_WEIGHTS,
    ...input.weights,
  };
  const collector = new EvidenceCollector();
  collectDependencyEvidence(collector, input.dependencies, weights);
  collectFileEvidence(collector, input.paths, weights);

  const maxPerKind = input.maxEvidencePerKind ?? 5;
  const detections = [...collector.entries()].map(([technologyId, records]) =>
    summarize(technologyId, records.values(), maxPerKind)
  );
  return detections.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      a.technologyId.localeCompare(b.technologyId)
  );
}
