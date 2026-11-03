import type { RepositoryFile, RepositorySnapshot } from "../snapshot";
import { detectManifestType } from "./discovery";
import type { Dependency, ManifestResult, ManifestType } from "./types";

export interface ManifestLimits {
  maxManifestBytes: number;
  /** Manifests beyond this count are recorded as skipped, deepest paths first. */
  maxManifests: number;
}

export const DEFAULT_MANIFEST_LIMITS: ManifestLimits = {
  maxManifestBytes: 512 * 1024,
  maxManifests: 200,
};

export interface ManifestAnalysis {
  dependencies: Dependency[];
  manifests: ManifestResult[];
}

function depth(path: string): number {
  return path.split("/").length;
}

function result(
  file: RepositoryFile,
  type: ManifestType,
  status: ManifestResult["status"],
  extra: Partial<ManifestResult> = {}
): ManifestResult {
  return {
    dependencyCount: 0,
    ecosystem: type.ecosystem,
    path: file.path,
    role: type.role,
    status,
    type: type.id,
    ...extra,
  };
}

export async function analyzeManifests(
  files: readonly RepositoryFile[],
  readFiles: RepositorySnapshot["readFiles"],
  limits: ManifestLimits = DEFAULT_MANIFEST_LIMITS
): Promise<ManifestAnalysis> {
  const discovered = files
    .map((file) => ({ file, type: detectManifestType(file.path) }))
    .filter(
      (entry): entry is { file: RepositoryFile; type: ManifestType } =>
        entry.type !== null
    )
    .sort(
      (a, b) =>
        depth(a.file.path) - depth(b.file.path) ||
        a.file.path.localeCompare(b.file.path)
    );

  const manifests: ManifestResult[] = [];
  const toRead: Array<{ file: RepositoryFile; type: ManifestType }> = [];
  let parseable = 0;

  for (const entry of discovered) {
    if (!entry.type.parse) {
      manifests.push(result(entry.file, entry.type, "discovered"));
      continue;
    }
    if (parseable >= limits.maxManifests) {
      manifests.push(
        result(entry.file, entry.type, "skipped", {
          error: "manifest limit reached",
        })
      );
      continue;
    }
    if (entry.file.size !== null && entry.file.size > limits.maxManifestBytes) {
      manifests.push(
        result(entry.file, entry.type, "skipped", {
          error: "manifest too large",
        })
      );
      continue;
    }
    parseable += 1;
    toRead.push(entry);
  }

  const contents =
    toRead.length > 0
      ? await readFiles(toRead.map(({ file }) => file.path))
      : new Map<string, string>();
  const dependencies: Dependency[] = [];

  for (const { file, type } of toRead) {
    const content = contents.get(file.path);
    if (content === undefined) {
      manifests.push(
        result(file, type, "failed", { error: "content unavailable" })
      );
      continue;
    }
    try {
      const parsed = type.parse?.(content, file.path) ?? [];
      for (const dependency of parsed) {
        dependencies.push({
          ...dependency,
          ecosystem: type.ecosystem,
          manifestPath: file.path,
        });
      }
      manifests.push(
        result(file, type, "parsed", { dependencyCount: parsed.length })
      );
    } catch (error) {
      manifests.push(
        result(file, type, "failed", {
          error:
            error instanceof Error
              ? error.message.slice(0, 300)
              : "parse error",
        })
      );
    }
  }

  manifests.sort((a, b) => a.path.localeCompare(b.path));
  return { dependencies, manifests };
}
