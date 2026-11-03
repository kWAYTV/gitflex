import type {
  DependencyScope,
  ManifestParser,
  ParsedDependency,
} from "../types";

const SECTIONS: readonly [string, DependencyScope][] = [
  ["require", "production"],
  ["require-dev", "development"],
];

/** Platform requirements (`php`, `ext-*`, `lib-*`) are runtime constraints, not packages. */
const PLATFORM =
  /^(?:php(?:-64bit)?|hhvm|composer(?:-plugin|-runtime)?-api|ext-.+|lib-.+)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const parseComposerJson: ManifestParser = (content) => {
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
      if (PLATFORM.test(name)) {
        continue;
      }
      dependencies.push({
        constraint: typeof constraint === "string" ? constraint : null,
        direct: true,
        name: name.toLowerCase(),
        scope,
      });
    }
  }
  return dependencies;
};
