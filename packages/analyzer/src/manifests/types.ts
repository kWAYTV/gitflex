import type { Ecosystem } from "@gitflex/technologies/types";

export type DependencyScope =
  | "production"
  | "development"
  | "peer"
  | "optional"
  | "build";

export interface ParsedDependency {
  /** Declared version constraint as written, or `null` when none is declared. */
  constraint: string | null;
  /** False for dependencies the manifest marks as indirect (e.g. `// indirect` in go.mod). */
  direct: boolean;
  /** Normalized package identifier for the ecosystem. */
  name: string;
  scope: DependencyScope;
}

export interface Dependency extends ParsedDependency {
  ecosystem: Ecosystem;
  manifestPath: string;
}

export type ManifestParser = (
  content: string,
  path: string
) => ParsedDependency[];

export type ManifestRole = "manifest" | "lockfile";

export interface ManifestType {
  ecosystem: Ecosystem;
  id: string;
  /** Absent for formats that are discovered but not parsed yet (lockfiles, Gradle scripts). */
  parse?: ManifestParser;
  role: ManifestRole;
}

export type ManifestStatus = "parsed" | "discovered" | "skipped" | "failed";

export interface ManifestResult {
  dependencyCount: number;
  ecosystem: Ecosystem;
  error?: string;
  path: string;
  role: ManifestRole;
  status: ManifestStatus;
  type: string;
}
