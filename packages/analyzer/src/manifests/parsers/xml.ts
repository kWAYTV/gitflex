import { XMLParser } from "fast-xml-parser";
import type {
  DependencyScope,
  ManifestParser,
  ParsedDependency,
} from "../types";

const parser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  isArray: (name) =>
    name === "dependency" ||
    name === "ItemGroup" ||
    name === "PackageReference" ||
    name === "package",
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
});

const PROPERTY_REFERENCE = /\$\{([^}]+)\}/g;

type XmlNode = Record<string, unknown>;

function isNode(value: unknown): value is XmlNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodes(value: unknown): XmlNode[] {
  return Array.isArray(value) ? value.filter(isNode) : [];
}

function text(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (isNode(value) && typeof value["#text"] === "string") {
    return value["#text"].trim() || null;
  }
  return null;
}

const MAVEN_SCOPES: Record<string, DependencyScope> = {
  compile: "production",
  provided: "peer",
  runtime: "production",
  system: "production",
  test: "development",
};

export const parsePomXml: ManifestParser = (content) => {
  const project = parser.parse(content)?.project;
  if (!isNode(project)) {
    return [];
  }
  const properties = isNode(project.properties) ? project.properties : {};
  const resolve = (value: string | null) =>
    value?.replace(
      PROPERTY_REFERENCE,
      (raw, key: string) => text(properties[key]) ?? raw
    ) ?? null;

  const dependencies: ParsedDependency[] = [];
  const declared = isNode(project.dependencies)
    ? project.dependencies.dependency
    : undefined;
  for (const dependency of nodes(declared)) {
    const groupId = text(dependency.groupId);
    const artifactId = text(dependency.artifactId);
    if (!(groupId && artifactId)) {
      continue;
    }
    const scope =
      MAVEN_SCOPES[text(dependency.scope) ?? "compile"] ?? "production";
    dependencies.push({
      constraint: resolve(text(dependency.version)),
      direct: true,
      name: `${groupId}:${artifactId}`,
      scope: text(dependency.optional) === "true" ? "optional" : scope,
    });
  }
  return dependencies;
};

/** The Web SDK implicitly references the ASP.NET Core shared framework. */
const IMPLICIT_SDK_FRAMEWORKS: Record<string, string> = {
  "microsoft.net.sdk.blazorwebassembly":
    "microsoft.aspnetcore.components.webassembly",
  "microsoft.net.sdk.web": "microsoft.aspnetcore.app",
};

export const parseMsBuildProject: ManifestParser = (content) => {
  const project = parser.parse(content)?.Project;
  if (!isNode(project)) {
    return [];
  }
  const dependencies: ParsedDependency[] = [];

  const sdk =
    typeof project["@Sdk"] === "string" ? project["@Sdk"].toLowerCase() : null;
  const implicit = sdk ? IMPLICIT_SDK_FRAMEWORKS[sdk] : undefined;
  if (implicit) {
    dependencies.push({
      constraint: null,
      direct: true,
      name: implicit,
      scope: "production",
    });
  }

  for (const group of nodes(project.ItemGroup)) {
    for (const reference of nodes(group.PackageReference)) {
      const include = reference["@Include"];
      if (typeof include !== "string") {
        continue;
      }
      const privateAssets = text(
        reference["@PrivateAssets"] ?? reference.PrivateAssets
      );
      dependencies.push({
        constraint: text(reference["@Version"] ?? reference.Version),
        direct: true,
        name: include.toLowerCase(),
        scope:
          privateAssets?.toLowerCase() === "all" ? "development" : "production",
      });
    }
  }
  return dependencies;
};

export const parsePackagesConfig: ManifestParser = (content) => {
  const packages = parser.parse(content)?.packages;
  if (!isNode(packages)) {
    return [];
  }
  const dependencies: ParsedDependency[] = [];
  for (const entry of nodes(packages.package)) {
    const id = entry["@id"];
    if (typeof id !== "string") {
      continue;
    }
    dependencies.push({
      constraint: text(entry["@version"]),
      direct: true,
      name: id.toLowerCase(),
      scope:
        entry["@developmentDependency"] === "true"
          ? "development"
          : "production",
    });
  }
  return dependencies;
};
