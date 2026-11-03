export const TECHNOLOGY_CATEGORIES = [
  "language",
  "frontend",
  "backend",
  "full-stack",
  "mobile",
  "desktop",
  "database",
  "infrastructure",
  "devops",
  "cloud",
  "security",
  "testing",
  "data-engineering",
  "machine-learning",
  "systems",
  "embedded",
  "game-development",
  "developer-tooling",
] as const;

export type TechnologyCategory = (typeof TECHNOLOGY_CATEGORIES)[number];

export const ECOSYSTEMS = [
  "npm",
  "pypi",
  "cargo",
  "go",
  "packagist",
  "rubygems",
  "maven",
  "nuget",
] as const;

export type Ecosystem = (typeof ECOSYSTEMS)[number];

export interface PackageMatcher {
  ecosystem: Ecosystem;
  /** Exact package identifiers, normalized the same way manifest parsers normalize them. */
  names?: readonly string[];
  /** Package identifier prefixes, e.g. `@radix-ui/` or `org.springframework.boot:`. */
  prefixes?: readonly string[];
}

export interface TechnologyDetection {
  /** Framework-specific configuration files (glob, matched against repository paths). */
  configFiles?: readonly string[];
  /**
   * Structure that indicates the technology without any dependency.
   * Weaker than configuration; use for conventions such as `k8s/` directories.
   */
  conventions?: readonly string[];
  /** Dependencies that indicate the technology. */
  packages?: readonly PackageMatcher[];
  /** Project structure that confirms a declared dependency is actually wired in. */
  structure?: readonly string[];
}

export interface Technology {
  aliases?: readonly string[];
  category: TechnologyCategory;
  description: string;
  detection: TechnologyDetection;
  docsUrl?: string;
  ecosystems?: readonly Ecosystem[];
  id: string;
  name: string;
  prerequisites?: readonly string[];
  related?: readonly string[];
  subcategory: string;
}
