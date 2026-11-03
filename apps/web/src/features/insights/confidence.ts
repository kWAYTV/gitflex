/** Cautious wording: confidence reflects evidence strength, never proficiency. */
export function evidenceStrength(confidence: number): string {
  if (confidence >= 0.9) {
    return "Strong evidence";
  }
  if (confidence >= 0.6) {
    return "Declared";
  }
  return "Weak signal";
}

export const USAGE_LABELS: Record<string, string> = {
  active: "Actively used",
  declared: "Declared dependency",
  inferred: "Inferred from structure",
  integrated: "Configured in project",
  tooling: "Development tooling",
};

export const EVIDENCE_KIND_LABELS: Record<string, string> = {
  configuration: "Configuration file",
  convention: "Project convention",
  dependency: "Dependency",
  "dependency-with-structure": "Dependency + project structure",
  "development-dependency": "Development dependency",
  documentation: "Documentation",
  "source-usage": "Source usage",
};

const CATEGORY_LABELS: Record<string, string> = {
  devops: "DevOps",
  "full-stack": "Full-stack",
};

export function categoryLabel(category: string): string {
  const override = CATEGORY_LABELS[category];
  if (override) {
    return override;
  }
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
