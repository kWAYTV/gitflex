import { DEFAULT_SCORING_CONFIG } from "./config";
import type { ScoringContext } from "./context";
import { createContext } from "./context";
import { METRICS, type MetricDefinition } from "./metrics";
import { roundTo } from "./normalize";
import {
  type Assessment,
  DIMENSIONS,
  type DimensionResult,
  type MetricResult,
  type ProfileScore,
  type ScoringConfig,
  type ScoringInput,
} from "./types";

function assess(score: number | null, config: ScoringConfig): Assessment {
  if (score === null) {
    return "unknown";
  }
  if (score >= config.positiveThreshold) {
    return "positive";
  }
  return score < config.negativeThreshold ? "negative" : "neutral";
}

function evaluateMetric(
  definition: MetricDefinition,
  context: ScoringContext,
  config: ScoringConfig
): MetricResult {
  const weight =
    config.metricWeights[`${definition.dimension}.${definition.id}`] ??
    definition.weight;
  const measurement = definition.measure(context);
  const score = measurement ? roundTo(measurement.score * 100, 1) : null;
  return {
    assessment: assess(score, config),
    confidence: measurement ? roundTo(measurement.confidence, 3) : 0,
    description: definition.description,
    id: definition.id,
    label: definition.label,
    repositories: measurement?.repositories ?? [],
    score,
    summary: measurement?.summary ?? definition.unknownReason,
    weight,
  };
}

/**
 * Mean over known values weighted by weight × confidence. Unknown values are left out
 * rather than counted as zero, and thin evidence moves the result less than strong evidence.
 */
function knownMean(
  entries: readonly {
    confidence: number;
    score: number | null;
    weight: number;
  }[]
): number | null {
  let sum = 0;
  let weight = 0;
  for (const entry of entries) {
    if (entry.score !== null) {
      const effective = entry.weight * entry.confidence;
      sum += entry.score * effective;
      weight += effective;
    }
  }
  return weight > 0 ? sum / weight : null;
}

/** Weighted mean over all values, so unknown evidence lowers confidence. */
function fullMean(
  entries: readonly { confidence: number; weight: number }[]
): number {
  const weight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (weight === 0) {
    return 0;
  }
  return (
    entries.reduce((sum, entry) => sum + entry.confidence * entry.weight, 0) /
    weight
  );
}

export function gradeFor(
  overall: number,
  config: ScoringConfig
): string | null {
  return (
    config.grades
      .toSorted((a, b) => b.min - a.min)
      .find((threshold) => overall >= threshold.min)?.grade ?? null
  );
}

/** Deterministic: identical input and configuration always produce an identical result. */
export function calculateProfileScore(
  input: ScoringInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ProfileScore {
  const context = createContext(input);

  const dimensions: DimensionResult[] = DIMENSIONS.map((dimension) => {
    const metrics = METRICS.filter(
      (definition) => definition.dimension === dimension
    ).map((definition) => evaluateMetric(definition, context, config));
    const score = knownMean(metrics);
    return {
      confidence: roundTo(fullMean(metrics), 3),
      dimension,
      metrics,
      score: score === null ? null : Math.round(score),
      weight: config.dimensionWeights[dimension],
    };
  });

  const overallMean = knownMean(dimensions);
  const overall = overallMean === null ? null : roundTo(overallMean / 10, 1);
  return {
    confidence: roundTo(fullMean(dimensions), 3),
    dimensions,
    grade: overall === null ? null : gradeFor(overall, config),
    overall,
    version: config.version,
  };
}
