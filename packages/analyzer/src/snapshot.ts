export interface RepositoryFile {
  path: string;
  /** Size in bytes; `null` when the source cannot report it. */
  size: number | null;
}

/**
 * Acquisition-agnostic view of a repository at one commit.
 * API-only, archive and clone strategies all produce this shape.
 */
export interface RepositorySnapshot {
  files: readonly RepositoryFile[];
  /** True when the source stopped listing files before the end of the tree. */
  filesTruncated: boolean;
  /** Linguist byte counts per language, as reported by GitHub. */
  languages: Readonly<Record<string, number>>;
  /** Batch read; missing, binary or oversized files are omitted from the result. */
  readFiles: (paths: readonly string[]) => Promise<ReadonlyMap<string, string>>;
}
