import { describe, expect, test } from "bun:test";

import { detectSignals } from "./signals";

describe("detectSignals", () => {
  test("detects documentation, policy and release files at the root", () => {
    const signals = detectSignals([
      "README.md",
      "LICENSE",
      "CHANGELOG.md",
      ".github/SECURITY.md",
      ".github/CODEOWNERS",
      "docs/CONTRIBUTING.md",
      ".changeset/config.json",
    ]);
    expect(signals).toMatchObject({
      changelog: true,
      codeowners: true,
      contributing: true,
      docsDirectory: true,
      licenseFile: true,
      readme: true,
      releaseAutomation: true,
      securityPolicy: true,
    });
  });

  test("ignores nested readmes and licenses", () => {
    const signals = detectSignals([
      "packages/ui/README.md",
      "src/vendor/LICENSE",
    ]);
    expect(signals.readme).toBe(false);
    expect(signals.licenseFile).toBe(false);
  });

  test("separates test files from source and counts structured source", () => {
    const signals = detectSignals([
      "src/index.ts",
      "src/index.test.ts",
      "src/__tests__/util.ts",
      "tests/test_api.py",
      "pkg/server/server_test.go",
      "pkg/server/server.go",
      "main.py",
      "styles.css",
    ]);
    expect(signals.testFiles).toBe(4);
    expect(signals.sourceFiles).toBe(3);
    expect(signals.structuredSourceFiles).toBe(2);
  });

  test("collects lockfiles in a stable order", () => {
    const signals = detectSignals([
      "web/pnpm-lock.yaml",
      "Cargo.lock",
      "package.json",
    ]);
    expect(signals.lockfiles).toEqual(["Cargo.lock", "web/pnpm-lock.yaml"]);
  });
});
