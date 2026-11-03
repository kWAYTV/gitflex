import type { RepositoryTechnologyRow } from "@gitflex/db/queries/insights";
import { getTechnology } from "@gitflex/technologies/lookup";

export interface TechnologySummary {
  averageConfidence: number;
  category: string;
  id: string;
  maxConfidence: number;
  name: string;
  repositories: number;
}

export function summarizeTechnologies(
  rows: readonly RepositoryTechnologyRow[]
): TechnologySummary[] {
  return [...Map.groupBy(rows, (row) => row.technologyId).entries()]
    .map(([id, detections]) => {
      const confidences = detections.map((detection) => detection.confidence);
      return {
        averageConfidence:
          confidences.reduce((sum, value) => sum + value, 0) /
          confidences.length,
        category: getTechnology(id)?.category ?? "developer-tooling",
        id,
        maxConfidence: Math.max(...confidences),
        name: detections[0]?.name ?? id,
        repositories: new Set(
          detections.map((detection) => detection.repositoryId)
        ).size,
      };
    })
    .sort(
      (a, b) =>
        b.repositories - a.repositories || b.maxConfidence - a.maxConfidence
    );
}

export interface DomainShare {
  category: string;
  repositories: number;
  technologies: number;
  value: number;
}

/** Cross-cutting categories that describe how code is written, not what is built. */
const NON_DOMAIN_CATEGORIES = new Set(["developer-tooling", "language"]);

/** Categories ordered by how many technologies and repositories they cover. */
export function groupByCategory(
  summaries: readonly TechnologySummary[]
): [string, TechnologySummary[]][] {
  return [
    ...Map.groupBy(summaries, (summary) => summary.category).entries(),
  ].sort(
    ([, a], [, b]) =>
      b.reduce((sum, entry) => sum + entry.repositories, 0) -
      a.reduce((sum, entry) => sum + entry.repositories, 0)
  );
}

/**
 * Each technology counts once, under its primary registry category, weighted by
 * repository count times average confidence, so weak signals contribute less.
 */
export function domainShares(
  rows: readonly RepositoryTechnologyRow[],
  summaries: readonly TechnologySummary[]
): DomainShare[] {
  const categoryById = new Map(
    summaries.map((summary) => [summary.id, summary.category])
  );
  const repositoriesByCategory = Map.groupBy(
    rows,
    (row) => categoryById.get(row.technologyId) ?? "developer-tooling"
  );
  return groupByCategory(summaries)
    .filter(([category]) => !NON_DOMAIN_CATEGORIES.has(category))
    .map(([category, entries]) => ({
      category,
      repositories: new Set(
        (repositoriesByCategory.get(category) ?? []).map(
          (row) => row.repositoryId
        )
      ).size,
      technologies: entries.length,
      value: entries.reduce(
        (sum, entry) => sum + entry.repositories * entry.averageConfidence,
        0
      ),
    }))
    .sort((a, b) => b.value - a.value);
}

/** Golden-angle hues at low chroma, so 10+ slices stay distinct without leaving the roast palette. */
export function chartColor(index: number): string {
  const GOLDEN_ANGLE = 137.5;
  return `oklch(0.64 0.09 ${(index * GOLDEN_ANGLE + 45) % 360})`;
}
