import type { Dimension } from "@gitflex/scoring/types";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  contribution: "Contribution",
  influence: "Influence",
  maintainability: "Maintainability",
  reliability: "Reliability",
  security: "Security",
  uniqueness: "Uniqueness",
};

export const DIMENSION_DESCRIPTIONS: Record<Dimension, string> = {
  contribution: "Authored and shared work over time.",
  influence: "Adoption of original repositories. Popularity, not quality.",
  maintainability:
    "Structure, tests, types, docs and tooling that keep code changeable.",
  reliability:
    "Tests, CI, pinned dependencies, maintenance and release practices.",
  security: "Findings, dependency hygiene, policies and security automation.",
  uniqueness:
    "Breadth of original, non-trivial work across technologies and domains.",
};

export type ConfidenceLevel = "High" | "Medium" | "Low";

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.75) {
    return "High";
  }
  return confidence >= 0.4 ? "Medium" : "Low";
}
