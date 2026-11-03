import type { ScoringConfig } from "./types";

/** Bump whenever a definition, weight or threshold changes so snapshots stay comparable. */
export const SCORING_VERSION = "2026.11.1";

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  dimensionWeights: {
    contribution: 0.15,
    influence: 0.15,
    maintainability: 0.2,
    reliability: 0.2,
    security: 0.2,
    uniqueness: 0.1,
  },
  grades: [
    { grade: "S", min: 9 },
    { grade: "A", min: 8 },
    { grade: "B", min: 7 },
    { grade: "C", min: 6 },
    { grade: "D", min: 5 },
    { grade: "E", min: 0 },
  ],
  metricWeights: {},
  negativeThreshold: 40,
  positiveThreshold: 70,
  version: SCORING_VERSION,
};
