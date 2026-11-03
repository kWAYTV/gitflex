import { parse as parseToml } from "smol-toml";
import type {
  DependencyScope,
  ManifestParser,
  ParsedDependency,
} from "../types";

const PEP508 =
  /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)\s*(?:\[[^\]]*\])?\s*([^;]*)/;
const NAME_SEPARATORS = /[-_.]+/g;
const DEV_FILE = /(?:^|[-_./])(?:dev|test|tests|lint|docs?)(?:[-_.]|$)/i;
const INLINE_COMMENT = /\s+#.*$/;
const LINE_CONTINUATION = /\\\r?\n/g;
const NEWLINE = /\r?\n/;

/** PEP 503 normalization so `Django`, `django_` and `django` resolve to one identifier. */
export function normalizePythonName(name: string): string {
  return name.toLowerCase().replace(NAME_SEPARATORS, "-");
}

/** Parses a PEP 508 requirement string such as `fastapi[all]>=0.110; python_version>"3.9"`. */
export function parseRequirement(
  requirement: string,
  scope: DependencyScope
): ParsedDependency | null {
  const match = PEP508.exec(requirement.trim());
  if (!match?.[1]) {
    return null;
  }
  const constraint = match[2]?.trim() ?? "";
  return {
    constraint: constraint === "" ? null : constraint,
    direct: true,
    name: normalizePythonName(match[1]),
    scope,
  };
}

export const parseRequirementsTxt: ManifestParser = (content, path) => {
  const scope: DependencyScope = DEV_FILE.test(path.split("/").at(-1) ?? "")
    ? "development"
    : "production";
  const dependencies: ParsedDependency[] = [];

  for (const rawLine of content
    .replace(LINE_CONTINUATION, " ")
    .split(NEWLINE)) {
    const line = rawLine.replace(INLINE_COMMENT, "").trim();
    // Options (-r, -e, --index-url), comments, URLs and local paths carry no package identifier.
    if (
      line === "" ||
      line.startsWith("#") ||
      line.startsWith("-") ||
      line.includes("://") ||
      line.startsWith(".") ||
      line.startsWith("/")
    ) {
      continue;
    }
    const dependency = parseRequirement(line, scope);
    if (dependency) {
      dependencies.push(dependency);
    }
  }
  return dependencies;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function constraintOf(value: unknown): string | null {
  if (typeof value === "string") {
    return value === "*" ? null : value;
  }
  if (isRecord(value) && typeof value.version === "string") {
    return value.version === "*" ? null : value.version;
  }
  return null;
}

function fromTable(
  table: unknown,
  scope: DependencyScope,
  output: ParsedDependency[]
): void {
  if (!isRecord(table)) {
    return;
  }
  for (const [name, value] of Object.entries(table)) {
    if (name.toLowerCase() === "python") {
      continue;
    }
    output.push({
      constraint: constraintOf(value),
      direct: true,
      name: normalizePythonName(name),
      scope,
    });
  }
}

function fromRequirementList(
  list: unknown,
  scope: DependencyScope,
  output: ParsedDependency[]
): void {
  if (!Array.isArray(list)) {
    return;
  }
  for (const item of list) {
    // PEP 735 groups may contain `{ include-group = "..." }` entries, which are references, not packages.
    if (typeof item !== "string") {
      continue;
    }
    const dependency = parseRequirement(item, scope);
    if (dependency) {
      output.push(dependency);
    }
  }
}

export const parsePyprojectToml: ManifestParser = (content) => {
  const document = parseToml(content);
  const dependencies: ParsedDependency[] = [];

  const project = isRecord(document.project) ? document.project : {};
  fromRequirementList(project.dependencies, "production", dependencies);
  if (isRecord(project["optional-dependencies"])) {
    for (const list of Object.values(project["optional-dependencies"])) {
      fromRequirementList(list, "optional", dependencies);
    }
  }
  if (isRecord(document["dependency-groups"])) {
    for (const list of Object.values(document["dependency-groups"])) {
      fromRequirementList(list, "development", dependencies);
    }
  }

  const tool = isRecord(document.tool) ? document.tool : {};
  const poetry = isRecord(tool.poetry) ? tool.poetry : {};
  fromTable(poetry.dependencies, "production", dependencies);
  fromTable(poetry["dev-dependencies"], "development", dependencies);
  if (isRecord(poetry.group)) {
    for (const group of Object.values(poetry.group)) {
      if (isRecord(group)) {
        fromTable(group.dependencies, "development", dependencies);
      }
    }
  }
  const uv = isRecord(tool.uv) ? tool.uv : {};
  fromRequirementList(uv["dev-dependencies"], "development", dependencies);

  return dependencies;
};

export const parsePipfile: ManifestParser = (content) => {
  const document = parseToml(content);
  const dependencies: ParsedDependency[] = [];
  fromTable(document.packages, "production", dependencies);
  fromTable(document["dev-packages"], "development", dependencies);
  return dependencies;
};
