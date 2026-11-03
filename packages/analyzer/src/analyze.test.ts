import { describe, expect, test } from "bun:test";
import { analyzeRepository } from "./analyze";
import { detectTechnologies } from "./detection/detect";
import { combineConfidence } from "./detection/weights";
import { classifyPath } from "./files/exclusions";
import { analyzeLanguages } from "./languages/languages";
import { detectManifestType } from "./manifests/discovery";
import type { RepositorySnapshot } from "./snapshot";

function snapshot(
  files: Record<string, string | null>,
  languages: Record<string, number> = {}
): RepositorySnapshot {
  return {
    files: Object.entries(files).map(([path, content]) => ({
      path,
      size: content?.length ?? 0,
    })),
    filesTruncated: false,
    languages,
    readFiles: (paths) =>
      Promise.resolve(
        new Map(
          paths.flatMap((path) => {
            const content = files[path];
            return typeof content === "string"
              ? [[path, content] as const]
              : [];
          })
        )
      ),
  };
}

describe("file exclusions", () => {
  test.each([
    ["node_modules/react/package.json", "excluded-directory"],
    ["apps/web/.next/server/page.js", "excluded-directory"],
    ["public/logo.png", "binary"],
    ["static/app.min.js", "minified"],
    ["api/user.pb.go", "generated"],
    ["src/index.ts", null],
    [".github/workflows/ci.yml", null],
    ["bun.lock", null],
  ])("%s -> %s", (path, expected) => {
    expect(classifyPath(path)).toBe(
      expected as ReturnType<typeof classifyPath>
    );
  });
});

describe("manifest discovery", () => {
  test.each([
    ["apps/web/package.json", "package.json"],
    ["requirements/dev.txt", "requirements.txt"],
    ["requirements-test.txt", "requirements.txt"],
    ["src/Api/Api.csproj", "msbuild-project"],
    ["notes.txt", null],
    ["docs/readme.md", null],
  ])("%s -> %s", (path, expected) => {
    expect(detectManifestType(path)?.id ?? null).toBe(expected);
  });
});

describe("languages", () => {
  test("classifies Linguist bytes by type and picks a programming primary", () => {
    const result = analyzeLanguages({
      CSS: 100,
      JSON: 0,
      Markdown: 50,
      TypeScript: 800,
      YAML: 50,
    });
    expect(result.primary).toBe("TypeScript");
    expect(result.totalBytes).toBe(1000);
    expect(
      result.languages.map(({ name, percentage, role }) => [
        name,
        role,
        percentage,
      ])
    ).toEqual([
      ["TypeScript", "primary", 80],
      ["CSS", "markup", 10],
      ["Markdown", "documentation", 5],
      ["YAML", "configuration", 5],
    ]);
  });

  test("empty input", () => {
    expect(analyzeLanguages({})).toEqual({
      languages: [],
      primary: null,
      totalBytes: 0,
    });
  });
});

describe("confidence", () => {
  test("weak signals stay weak", () => {
    expect(combineConfidence([0.45, 0.4, 0.15])).toBeLessThan(0.6);
  });
  test("corroboration raises but never exceeds 1", () => {
    expect(combineConfidence([0.65, 0.95])).toBeGreaterThan(0.95);
    expect(combineConfidence([1, 1, 1])).toBe(1);
  });
});

describe("technology detection", () => {
  test("structure upgrades a dependency only when the dependency exists", () => {
    const paths = ["src/app/page.tsx", "src/app/layout.tsx"];
    const withDependency = detectTechnologies({
      dependencies: [
        {
          constraint: "16",
          direct: true,
          ecosystem: "npm",
          manifestPath: "package.json",
          name: "next",
          scope: "production",
        },
      ],
      paths,
    });
    const next = withDependency.find(
      (detection) => detection.technologyId === "nextjs"
    );
    expect(next?.usageType).toBe("integrated");
    expect(next?.confidence).toBeGreaterThan(0.9);

    const withoutDependency = detectTechnologies({ dependencies: [], paths });
    expect(
      withoutDependency.some((detection) => detection.technologyId === "nextjs")
    ).toBe(false);
  });

  test("dev dependencies are tooling with lower confidence", () => {
    const [vitest] = detectTechnologies({
      dependencies: [
        {
          constraint: "^4",
          direct: true,
          ecosystem: "npm",
          manifestPath: "package.json",
          name: "vitest",
          scope: "development",
        },
      ],
      paths: [],
    });
    expect(vitest).toMatchObject({
      confidence: 0.45,
      technologyId: "vitest",
      usageType: "tooling",
    });
  });

  test("duplicate evidence across manifests is deduplicated per source and truncated per kind", () => {
    const dependencies = Array.from({ length: 8 }, (_, index) => ({
      constraint: "^5",
      direct: true,
      ecosystem: "npm" as const,
      manifestPath: `packages/p${index}/package.json`,
      name: "zod",
      scope: "production" as const,
    }));
    const [zod] = detectTechnologies({
      dependencies: [...dependencies, ...dependencies],
      paths: [],
    });
    expect(zod?.evidenceCount).toBe(8);
    expect(zod?.evidence).toHaveLength(5);
    expect(zod?.confidence).toBe(0.65);
  });
});

describe("analyzeRepository", () => {
  test("end to end on a small monorepo", async () => {
    const result = await analyzeRepository(
      snapshot(
        {
          ".github/workflows/ci.yml": "",
          "apps/web/next.config.ts": "",
          "apps/web/package.json": JSON.stringify({
            dependencies: { "drizzle-orm": "1", next: "16", react: "19" },
            devDependencies: { typescript: "6" },
          }),
          "apps/web/src/app/page.tsx": "",
          "broken/package.json": "{ not json",
          Dockerfile: "",
          "node_modules/express/package.json": JSON.stringify({
            name: "express",
          }),
          "package.json": JSON.stringify({ devDependencies: { turbo: "2" } }),
          "turbo.json": "{}",
        },
        { TypeScript: 900, YAML: 100 }
      ),
      { now: new Date("2026-01-01T00:00:00Z") }
    );

    expect(result.files).toEqual({
      analyzed: 8,
      excluded: { "excluded-directory": 1 },
      total: 9,
      truncated: false,
    });
    expect(result.languages.data?.primary).toBe("TypeScript");

    const manifests = result.manifests.data?.manifests ?? [];
    expect(manifests.map(({ path, status }) => [path, status])).toEqual([
      ["apps/web/package.json", "parsed"],
      ["broken/package.json", "failed"],
      ["package.json", "parsed"],
    ]);

    const detected = Object.fromEntries(
      (result.technologies.data ?? []).map((technology) => [
        technology.technologyId,
        technology,
      ])
    );
    expect(Object.keys(detected).sort()).toEqual([
      "docker",
      "drizzle",
      "github-actions",
      "nextjs",
      "react",
      "turborepo",
      "typescript",
    ]);
    expect(detected.express).toBeUndefined();
    expect(detected.nextjs?.usageType).toBe("integrated");
    expect(detected.nextjs?.evidence.map(({ kind }) => kind)).toEqual([
      "configuration",
      "dependency-with-structure",
      "dependency",
    ]);
    expect(detected.react?.usageType).toBe("integrated");
    expect(detected.turborepo?.confidence).toBeGreaterThan(0.95);
  });

  test("a failing reader fails only the manifest stage", async () => {
    const result = await analyzeRepository({
      files: [
        { path: "package.json", size: 10 },
        { path: "Dockerfile", size: 10 },
      ],
      filesTruncated: false,
      languages: { Go: 10 },
      readFiles: () => Promise.reject(new Error("rate limited")),
    });
    expect(result.manifests).toMatchObject({
      error: "rate limited",
      status: "failed",
    });
    expect(result.languages.status).toBe("completed");
    expect(
      result.technologies.data?.map(({ technologyId }) => technologyId)
    ).toEqual(["docker"]);
  });
});
