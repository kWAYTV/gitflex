import { parse as parseToml } from "smol-toml";
import type {
  DependencyScope,
  ManifestParser,
  ParsedDependency,
} from "../types";

const SECTIONS: readonly [string, DependencyScope][] = [
  ["dependencies", "production"],
  ["dev-dependencies", "development"],
  ["build-dependencies", "build"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toDependency(
  key: string,
  value: unknown,
  scope: DependencyScope
): ParsedDependency {
  if (typeof value === "string") {
    return { constraint: value, direct: true, name: key, scope };
  }
  const spec = isRecord(value) ? value : {};
  return {
    constraint: typeof spec.version === "string" ? spec.version : null,
    direct: true,
    // `foo = { package = "bar" }` renames crate `bar` to `foo` locally.
    name: typeof spec.package === "string" ? spec.package : key,
    scope:
      spec.optional === true && scope === "production" ? "optional" : scope,
  };
}

function collect(
  table: Record<string, unknown>,
  output: ParsedDependency[]
): void {
  for (const [section, scope] of SECTIONS) {
    const entries = table[section];
    if (isRecord(entries)) {
      for (const [key, value] of Object.entries(entries)) {
        output.push(toDependency(key, value, scope));
      }
    }
  }
}

export const parseCargoToml: ManifestParser = (content) => {
  const document = parseToml(content);
  const dependencies: ParsedDependency[] = [];
  collect(document, dependencies);
  if (isRecord(document.target)) {
    for (const target of Object.values(document.target)) {
      if (isRecord(target)) {
        collect(target, dependencies);
      }
    }
  }
  return dependencies;
};
