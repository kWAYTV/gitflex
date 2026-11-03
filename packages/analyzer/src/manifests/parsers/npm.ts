import type {
  DependencyScope,
  ManifestParser,
  ParsedDependency,
} from "../types";

const SECTIONS: readonly [string, DependencyScope][] = [
  ["dependencies", "production"],
  ["devDependencies", "development"],
  ["peerDependencies", "peer"],
  ["optionalDependencies", "optional"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const parsePackageJson: ManifestParser = (content) => {
  const manifest: unknown = JSON.parse(content);
  if (!isRecord(manifest)) {
    return [];
  }

  const dependencies: ParsedDependency[] = [];
  for (const [section, scope] of SECTIONS) {
    const entries = manifest[section];
    if (!isRecord(entries)) {
      continue;
    }
    for (const [name, constraint] of Object.entries(entries)) {
      dependencies.push({
        constraint: typeof constraint === "string" ? constraint : null,
        direct: true,
        name,
        scope,
      });
    }
  }
  return dependencies;
};
