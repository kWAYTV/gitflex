export const EVIDENCE_KINDS = [
  "source-usage",
  "configuration",
  "dependency-with-structure",
  "dependency",
  "development-dependency",
  "convention",
  "documentation",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export type EvidenceWeights = Readonly<Record<EvidenceKind, number>>;

/** Initial heuristics from the analysis spec; callers may override per run. */
export const DEFAULT_EVIDENCE_WEIGHTS: EvidenceWeights = {
  configuration: 0.95,
  convention: 0.4,
  dependency: 0.65,
  "dependency-with-structure": 0.9,
  "development-dependency": 0.45,
  documentation: 0.15,
  "source-usage": 1,
};

/**
 * Each additional distinct evidence kind closes this share of the remaining gap,
 * scaled by its own weight, so stacked weak signals stay weak.
 */
export const CORROBORATION_FACTOR = 0.25;

export function combineConfidence(weights: readonly number[]): number {
  const sorted = [...weights].sort((a, b) => b - a);
  let confidence = sorted[0] ?? 0;
  for (const weight of sorted.slice(1)) {
    confidence += (1 - confidence) * weight * CORROBORATION_FACTOR;
  }
  return Math.round(Math.min(confidence, 1) * 1000) / 1000;
}
