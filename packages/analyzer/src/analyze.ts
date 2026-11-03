import { REGISTRY_VERSION } from "@gitflex/technologies/registry";
import {
  type DetectedTechnology,
  detectTechnologies,
} from "./detection/detect";
import type { EvidenceWeights } from "./detection/weights";
import { classifyPath, type ExclusionReason } from "./files/exclusions";
import { analyzeLanguages, type LanguageAnalysis } from "./languages/languages";
import {
  analyzeManifests,
  DEFAULT_MANIFEST_LIMITS,
  type ManifestAnalysis,
  type ManifestLimits,
} from "./manifests/analyze-manifests";
import { detectSignals, type RepositorySignals } from "./signals/signals";
import type { RepositoryFile, RepositorySnapshot } from "./snapshot";
import { ANALYZER_VERSION } from "./version";

export interface AnalyzeOptions {
  manifestLimits?: Partial<ManifestLimits>;
  now?: Date;
  weights?: Partial<EvidenceWeights>;
}

export type StageResult<T> =
  | { status: "completed"; durationMs: number; data: T }
  | { status: "failed"; durationMs: number; data: null; error: string };

export interface FileSummary {
  analyzed: number;
  excluded: Partial<Record<ExclusionReason, number>>;
  total: number;
  truncated: boolean;
}

export interface RepositoryAnalysis {
  analyzedAt: Date;
  analyzerVersion: string;
  files: FileSummary;
  languages: StageResult<LanguageAnalysis>;
  manifests: StageResult<ManifestAnalysis>;
  registryVersion: string;
  signals: StageResult<RepositorySignals>;
  technologies: StageResult<DetectedTechnology[]>;
}

async function runStage<T>(run: () => T | Promise<T>): Promise<StageResult<T>> {
  const started = performance.now();
  try {
    const data = await run();
    return {
      data,
      durationMs: Math.round(performance.now() - started),
      status: "completed",
    };
  } catch (error) {
    return {
      data: null,
      durationMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
      status: "failed",
    };
  }
}

function partitionFiles(files: readonly RepositoryFile[]) {
  const analyzed: RepositoryFile[] = [];
  const excluded: Partial<Record<ExclusionReason, number>> = {};
  for (const file of files) {
    const reason = classifyPath(file.path);
    if (reason) {
      excluded[reason] = (excluded[reason] ?? 0) + 1;
    } else {
      analyzed.push(file);
    }
  }
  return { analyzed, excluded };
}

export async function analyzeRepository(
  snapshot: RepositorySnapshot,
  options: AnalyzeOptions = {}
): Promise<RepositoryAnalysis> {
  const { analyzed, excluded } = partitionFiles(snapshot.files);

  const [languages, manifests] = await Promise.all([
    runStage(() => analyzeLanguages(snapshot.languages)),
    runStage(() =>
      analyzeManifests(analyzed, (paths) => snapshot.readFiles(paths), {
        ...DEFAULT_MANIFEST_LIMITS,
        ...options.manifestLimits,
      })
    ),
  ]);

  const analyzedPaths = analyzed.map((file) => file.path);
  // File-based rules still apply when manifests could not be read.
  const [technologies, signals] = await Promise.all([
    runStage(() =>
      detectTechnologies({
        dependencies: manifests.data?.dependencies ?? [],
        paths: analyzedPaths,
        weights: options.weights,
      })
    ),
    runStage(() => detectSignals(analyzedPaths)),
  ]);

  return {
    analyzedAt: options.now ?? new Date(),
    analyzerVersion: ANALYZER_VERSION,
    files: {
      analyzed: analyzed.length,
      excluded,
      total: snapshot.files.length,
      truncated: snapshot.filesTruncated,
    },
    languages,
    manifests,
    registryVersion: REGISTRY_VERSION,
    signals,
    technologies,
  };
}
