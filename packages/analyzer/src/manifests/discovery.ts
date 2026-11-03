import { parseCargoToml } from "./parsers/cargo";
import { parseComposerJson } from "./parsers/composer";
import { parseGoMod } from "./parsers/go";
import { parsePackageJson } from "./parsers/npm";
import {
  parsePipfile,
  parsePyprojectToml,
  parseRequirementsTxt,
} from "./parsers/python";
import { parseGemfile } from "./parsers/ruby";
import {
  parseMsBuildProject,
  parsePackagesConfig,
  parsePomXml,
} from "./parsers/xml";
import type { ManifestType } from "./types";

const BY_FILE_NAME: Readonly<Record<string, ManifestType>> = {
  "build.gradle": { ecosystem: "maven", id: "build.gradle", role: "manifest" },
  "build.gradle.kts": {
    ecosystem: "maven",
    id: "build.gradle.kts",
    role: "manifest",
  },
  "bun.lock": { ecosystem: "npm", id: "bun.lock", role: "lockfile" },
  "bun.lockb": { ecosystem: "npm", id: "bun.lockb", role: "lockfile" },
  "Cargo.lock": { ecosystem: "cargo", id: "Cargo.lock", role: "lockfile" },
  "Cargo.toml": {
    ecosystem: "cargo",
    id: "Cargo.toml",
    parse: parseCargoToml,
    role: "manifest",
  },
  "composer.json": {
    ecosystem: "packagist",
    id: "composer.json",
    parse: parseComposerJson,
    role: "manifest",
  },
  "composer.lock": {
    ecosystem: "packagist",
    id: "composer.lock",
    role: "lockfile",
  },
  Gemfile: {
    ecosystem: "rubygems",
    id: "Gemfile",
    parse: parseGemfile,
    role: "manifest",
  },
  "Gemfile.lock": {
    ecosystem: "rubygems",
    id: "Gemfile.lock",
    role: "lockfile",
  },
  "go.mod": {
    ecosystem: "go",
    id: "go.mod",
    parse: parseGoMod,
    role: "manifest",
  },
  "go.sum": { ecosystem: "go", id: "go.sum", role: "lockfile" },
  Pipfile: {
    ecosystem: "pypi",
    id: "Pipfile",
    parse: parsePipfile,
    role: "manifest",
  },
  "Pipfile.lock": { ecosystem: "pypi", id: "Pipfile.lock", role: "lockfile" },
  "package-lock.json": {
    ecosystem: "npm",
    id: "package-lock.json",
    role: "lockfile",
  },
  "package.json": {
    ecosystem: "npm",
    id: "package.json",
    parse: parsePackageJson,
    role: "manifest",
  },
  "packages.config": {
    ecosystem: "nuget",
    id: "packages.config",
    parse: parsePackagesConfig,
    role: "manifest",
  },
  "pnpm-lock.yaml": {
    ecosystem: "npm",
    id: "pnpm-lock.yaml",
    role: "lockfile",
  },
  "poetry.lock": { ecosystem: "pypi", id: "poetry.lock", role: "lockfile" },
  "pom.xml": {
    ecosystem: "maven",
    id: "pom.xml",
    parse: parsePomXml,
    role: "manifest",
  },
  "pyproject.toml": {
    ecosystem: "pypi",
    id: "pyproject.toml",
    parse: parsePyprojectToml,
    role: "manifest",
  },
  "uv.lock": { ecosystem: "pypi", id: "uv.lock", role: "lockfile" },
  "yarn.lock": { ecosystem: "npm", id: "yarn.lock", role: "lockfile" },
};

const MSBUILD_PROJECT = /\.(?:cs|fs|vb)proj$/;
const REQUIREMENTS = /^(?:[\w-]*requirements[\w.-]*|[\w-]+)\.(?:txt|in)$/;

const REQUIREMENTS_TYPE: ManifestType = {
  ecosystem: "pypi",
  id: "requirements.txt",
  parse: parseRequirementsTxt,
  role: "manifest",
};

const MSBUILD_TYPE: ManifestType = {
  ecosystem: "nuget",
  id: "msbuild-project",
  parse: parseMsBuildProject,
  role: "manifest",
};

export function detectManifestType(path: string): ManifestType | null {
  const segments = path.split("/");
  const fileName = segments.at(-1) ?? "";
  const known = BY_FILE_NAME[fileName];
  if (known) {
    return known;
  }
  if (MSBUILD_PROJECT.test(fileName)) {
    return MSBUILD_TYPE;
  }
  // `requirements-dev.txt` anywhere, or any `.txt`/`.in` inside a `requirements/` directory.
  const inRequirementsDirectory = segments.at(-2) === "requirements";
  if (
    REQUIREMENTS.test(fileName) &&
    (fileName.includes("requirements") || inRequirementsDirectory)
  ) {
    return REQUIREMENTS_TYPE;
  }
  return null;
}
