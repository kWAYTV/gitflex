import type { RepositorySnapshot } from "@gitflex/analyzer/snapshot";
import type { GitHubClient } from "@gitflex/github/client";
import {
  getRepositoryLanguages,
  getRepositoryTree,
  type RepositoryHead,
  type RepositoryRef,
  readRepositoryFiles,
} from "@gitflex/github/contents";

export interface SnapshotLimits {
  /** Files listed beyond this count are dropped and the snapshot is marked truncated. */
  maxFiles: number;
}

export const DEFAULT_SNAPSHOT_LIMITS: SnapshotLimits = { maxFiles: 50_000 };

/** API-only acquisition: tree listing, Linguist stats and on-demand blob reads. No clone, no history. */
export async function createGitHubSnapshot(
  client: GitHubClient,
  repository: RepositoryRef,
  head: RepositoryHead,
  limits: SnapshotLimits = DEFAULT_SNAPSHOT_LIMITS
): Promise<RepositorySnapshot> {
  const [tree, languages] = await Promise.all([
    getRepositoryTree(client, repository, head.treeSha, limits.maxFiles),
    getRepositoryLanguages(client, repository),
  ]);

  return {
    files: tree.files,
    filesTruncated: tree.truncated,
    languages,
    readFiles: (paths) =>
      readRepositoryFiles(client, repository, head.commitSha, paths),
  };
}
