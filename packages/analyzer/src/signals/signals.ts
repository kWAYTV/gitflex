/** Repository-level facts derived from file paths alone; no file contents are read. */
export interface RepositorySignals {
  changelog: boolean;
  codeowners: boolean;
  contributing: boolean;
  docsDirectory: boolean;
  licenseFile: boolean;
  /** Lockfile paths, so dependency pinning can be checked per ecosystem. */
  lockfiles: string[];
  readme: boolean;
  releaseAutomation: boolean;
  securityPolicy: boolean;
  sourceFiles: number;
  /** Source files that live under a conventional source directory such as `src/` or `internal/`. */
  structuredSourceFiles: number;
  testFiles: number;
}

const SOURCE_EXTENSION =
  /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|scala|cs|fs|swift|m|mm|c|cc|cpp|cxx|h|hh|hpp|rb|php|ex|exs|erl|hs|ml|clj|dart|lua|zig|nim|vue|svelte|astro|gd|r|jl|pl|sh|ps1)$/i;

const TEST_FILE =
  /(?:^|\/)(?:__tests__|tests?|spec|e2e|testing)\/|\.(?:test|spec|e2e)\.[^/]+$|(?:^|\/)test_[^/]+\.py$|_test\.(?:py|go|exs?|dart)$|(?:Tests?|Spec)\.(?:java|kt|cs|swift|scala)$/;

const STRUCTURED_ROOTS: ReadonlySet<string> = new Set([
  "app",
  "apps",
  "cmd",
  "crates",
  "internal",
  "lib",
  "libs",
  "modules",
  "packages",
  "pkg",
  "services",
  "src",
]);

const LOCKFILES: ReadonlySet<string> = new Set([
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "go.sum",
  "gradle.lockfile",
  "package-lock.json",
  "packages.lock.json",
  "Pipfile.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "pubspec.lock",
  "uv.lock",
  "yarn.lock",
]);

const README = /^readme(?:\.[a-z]+)?$/i;
const LICENSE = /^(?:license|licence|copying)(?:[.-][a-z0-9]+)*$/i;
const CONTRIBUTING = /^contributing(?:\.[a-z]+)?$/i;
const CHANGELOG = /^(?:changelog|changes|history)(?:\.[a-z]+)?$/i;
const SECURITY = /^security(?:\.[a-z]+)?$/i;
const RELEASE_CONFIG =
  /^(?:\.releaserc(?:\.\w+)?|release\.config\.[cm]?js|\.goreleaser\.ya?ml|release-please-config\.json|\.release-please-manifest\.json|cliff\.toml)$/;
const RELEASE_WORKFLOW = /^\.github\/workflows\/[^/]*release[^/]*\.ya?ml$/i;

function isRootOrMeta(path: string): boolean {
  const slash = path.indexOf("/");
  if (slash === -1) {
    return true;
  }
  const directory = path.slice(0, slash);
  return (
    (directory === ".github" || directory === "docs") &&
    path.indexOf("/", slash + 1) === -1
  );
}

export function detectSignals(paths: readonly string[]): RepositorySignals {
  const signals: RepositorySignals = {
    changelog: false,
    codeowners: false,
    contributing: false,
    docsDirectory: false,
    licenseFile: false,
    lockfiles: [],
    readme: false,
    releaseAutomation: false,
    securityPolicy: false,
    sourceFiles: 0,
    structuredSourceFiles: 0,
    testFiles: 0,
  };

  for (const path of paths) {
    const fileName = path.slice(path.lastIndexOf("/") + 1);
    const rootOrMeta = isRootOrMeta(path);

    if (rootOrMeta) {
      signals.readme ||= README.test(fileName);
      signals.licenseFile ||= LICENSE.test(fileName);
      signals.contributing ||= CONTRIBUTING.test(fileName);
      signals.changelog ||= CHANGELOG.test(fileName);
      signals.securityPolicy ||= SECURITY.test(fileName);
      signals.codeowners ||= fileName === "CODEOWNERS";
    }
    signals.docsDirectory ||= path.startsWith("docs/");
    signals.releaseAutomation ||=
      RELEASE_CONFIG.test(fileName) ||
      path.startsWith(".changeset/") ||
      RELEASE_WORKFLOW.test(path);
    if (LOCKFILES.has(fileName)) {
      signals.lockfiles.push(path);
    }

    if (SOURCE_EXTENSION.test(fileName)) {
      if (TEST_FILE.test(path)) {
        signals.testFiles += 1;
      } else {
        signals.sourceFiles += 1;
        const root = path.slice(0, path.indexOf("/"));
        if (STRUCTURED_ROOTS.has(root)) {
          signals.structuredSourceFiles += 1;
        }
      }
    }
  }

  signals.lockfiles.sort();
  return signals;
}
