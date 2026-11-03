import type { RepositoryAnalysis } from "@gitflex/analyzer/analyze";
import type {
  LanguageUpsert,
  RepositoryResults,
  TechnologyUpsert,
} from "@gitflex/db/queries/analysis";
import type { RepositoryScanSummary } from "@gitflex/db/schema/analysis";
import { REGISTRY_VERSION, TECHNOLOGIES } from "@gitflex/technologies/registry";

export function languageId(name: string): string {
  return name.toLowerCase();
}

export function registryRows(): TechnologyUpsert[] {
  return TECHNOLOGIES.map(
    ({ category, description, detection, id, name, subcategory, ...rest }) => ({
      category,
      description,
      id,
      metadata: { ...rest, detection },
      name,
      registryVersion: REGISTRY_VERSION,
      subcategory,
    })
  );
}

export function languageRows(analysis: RepositoryAnalysis): LanguageUpsert[] {
  return (analysis.languages.data?.languages ?? []).map((stat) => ({
    color: stat.color,
    id: languageId(stat.name),
    name: stat.name,
    type: stat.type,
  }));
}

export function toSummary(analysis: RepositoryAnalysis): RepositoryScanSummary {
  const stages: RepositoryScanSummary["stages"] = {};
  for (const [name, stage] of [
    ["languages", analysis.languages],
    ["manifests", analysis.manifests],
    ["signals", analysis.signals],
    ["technologies", analysis.technologies],
  ] as const) {
    stages[name] =
      stage.status === "failed"
        ? { durationMs: stage.durationMs, error: stage.error, status: "failed" }
        : { durationMs: stage.durationMs, status: "completed" };
  }
  return {
    files: {
      analyzed: analysis.files.analyzed,
      excluded: analysis.files.excluded,
      total: analysis.files.total,
      truncated: analysis.files.truncated,
    },
    manifests: analysis.manifests.data?.manifests ?? [],
    signals: analysis.signals.data ?? undefined,
    stages,
  };
}

export function allStagesCompleted(
  summary: RepositoryScanSummary | null
): boolean {
  return (
    summary !== null &&
    Object.values(summary.stages).every((stage) => stage.status === "completed")
  );
}

export function toResults(
  analysis: RepositoryAnalysis,
  ids: { repositoryId: string; repositoryScanId: string }
): RepositoryResults {
  return {
    dependencies: (analysis.manifests.data?.dependencies ?? []).map(
      ({ constraint, direct, ecosystem, manifestPath, name, scope }) => ({
        constraint,
        direct,
        ecosystem,
        manifestPath,
        name,
        scope,
      })
    ),
    detectedAt: analysis.analyzedAt,
    languages: (analysis.languages.data?.languages ?? []).map((stat) => ({
      bytes: stat.bytes,
      languageId: languageId(stat.name),
      percentage: stat.percentage,
      role: stat.role,
    })),
    repositoryId: ids.repositoryId,
    repositoryScanId: ids.repositoryScanId,
    technologies: (analysis.technologies.data ?? []).map((detection) => ({
      confidence: detection.confidence,
      evidence: detection.evidence,
      evidenceCount: detection.evidenceCount,
      technologyId: detection.technologyId,
      usageType: detection.usageType,
    })),
  };
}
