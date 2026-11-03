export const DIMENSIONS = [
  "reliability",
  "security",
  "maintainability",
  "uniqueness",
  "contribution",
  "influence",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export interface RepositorySignals {
  changelog: boolean;
  codeowners: boolean;
  contributing: boolean;
  docsDirectory: boolean;
  licenseFile: boolean;
  lockfiles: readonly string[];
  readme: boolean;
  releaseAutomation: boolean;
  securityPolicy: boolean;
  sourceFiles: number;
  structuredSourceFiles: number;
  testFiles: number;
}

export interface ScoringRepository {
  /** Whether the repository has a completed analysis; unanalyzed repositories only feed metadata metrics. */
  analyzed: boolean;
  description: string | null;
  forks: number;
  fullName: string;
  hasDependencies: boolean;
  id: string;
  isArchived: boolean;
  isFork: boolean;
  languages: readonly {
    languageId: string;
    percentage: number;
    role: string;
    type: string;
  }[];
  ownership: "owner" | "organization" | "collaborator";
  pushedAt: Date | null;
  /** `null` when the analysis predates repository signals. */
  signals: RepositorySignals | null;
  sizeKb: number;
  stars: number;
  technologies: readonly { confidence: number; technologyId: string }[];
}

export interface ScoringInput {
  /** Reference time for recency metrics; pass the scan completion time, never the wall clock. */
  now: Date;
  repositories: readonly ScoringRepository[];
}

export interface GradeThreshold {
  grade: string;
  /** Inclusive lower bound on the 0-10 overall score. */
  min: number;
}

export interface ScoringConfig {
  dimensionWeights: Record<Dimension, number>;
  grades: readonly GradeThreshold[];
  /** Overrides for metric weights, keyed by `dimension.metric`. */
  metricWeights: Readonly<Record<string, number>>;
  negativeThreshold: number;
  positiveThreshold: number;
  version: string;
}

export interface RepositoryEvidence {
  fullName: string;
  repositoryId: string;
  /** Contribution of this repository to the metric, 0-1. */
  value: number;
}

export type Assessment = "positive" | "neutral" | "negative" | "unknown";

export interface MetricResult {
  assessment: Assessment;
  confidence: number;
  description: string;
  id: string;
  label: string;
  repositories: RepositoryEvidence[];
  /** 0-100, or `null` when there is no evidence to measure. */
  score: number | null;
  summary: string;
  weight: number;
}

export interface DimensionResult {
  confidence: number;
  dimension: Dimension;
  metrics: MetricResult[];
  score: number | null;
  weight: number;
}

export interface ProfileScore {
  confidence: number;
  dimensions: DimensionResult[];
  grade: string | null;
  overall: number | null;
  version: string;
}
