import { describe, expect, test } from "bun:test";

import { DEFAULT_SCORING_CONFIG } from "./config";
import { calculateProfileScore, gradeFor } from "./score";
import type {
  Dimension,
  ProfileScore,
  RepositorySignals,
  ScoringRepository,
} from "./types";

const NOW = new Date("2026-11-01T00:00:00Z");

const SIGNALS: RepositorySignals = {
  changelog: false,
  codeowners: false,
  contributing: false,
  docsDirectory: false,
  licenseFile: true,
  lockfiles: ["bun.lock"],
  readme: true,
  releaseAutomation: false,
  securityPolicy: false,
  sourceFiles: 40,
  structuredSourceFiles: 40,
  testFiles: 10,
};

function repository(
  id: string,
  overrides: Partial<ScoringRepository> = {}
): ScoringRepository {
  return {
    analyzed: true,
    description: "A project",
    forks: 0,
    fullName: `me/${id}`,
    hasDependencies: true,
    id,
    isArchived: false,
    isFork: false,
    languages: [
      {
        languageId: "typescript",
        percentage: 100,
        role: "primary",
        type: "programming",
      },
    ],
    ownership: "owner",
    pushedAt: new Date("2026-10-01T00:00:00Z"),
    signals: SIGNALS,
    sizeKb: 500,
    stars: 0,
    technologies: [
      { confidence: 0.95, technologyId: "github-actions" },
      { confidence: 0.95, technologyId: "vitest" },
    ],
    ...overrides,
  };
}

function dimension(score: ProfileScore, name: Dimension) {
  const result = score.dimensions.find((entry) => entry.dimension === name);
  if (!result) {
    throw new Error(`missing dimension ${name}`);
  }
  return result;
}

function metric(score: ProfileScore, name: Dimension, id: string) {
  const result = dimension(score, name).metrics.find(
    (entry) => entry.id === id
  );
  if (!result) {
    throw new Error(`missing metric ${name}.${id}`);
  }
  return result;
}

describe("calculateProfileScore", () => {
  test("is independent of input order", () => {
    const repositories = [
      repository("a", { stars: 12 }),
      repository("b", { signals: { ...SIGNALS, testFiles: 0 }, sizeKb: 90 }),
      repository("c", { forks: 3, ownership: "organization" }),
    ];
    const forward = calculateProfileScore({ now: NOW, repositories });
    const reversed = calculateProfileScore({
      now: NOW,
      repositories: repositories.toReversed(),
    });
    expect(reversed).toEqual(forward);
  });

  test("leaves metrics without evidence unknown instead of zero", () => {
    const score = calculateProfileScore({
      now: NOW,
      repositories: [repository("a")],
    });
    const findings = metric(score, "security", "critical-findings");
    expect(findings.score).toBeNull();
    expect(findings.assessment).toBe("unknown");
    expect(findings.confidence).toBe(0);

    const security = dimension(score, "security");
    expect(security.score).not.toBeNull();
    expect(security.confidence).toBeLessThan(0.5);
  });

  test("returns no score at all without repositories", () => {
    const score = calculateProfileScore({ now: NOW, repositories: [] });
    expect(score.overall).toBeNull();
    expect(score.grade).toBeNull();
    expect(score.confidence).toBe(0);
  });

  test("ignores forks", () => {
    const base = calculateProfileScore({
      now: NOW,
      repositories: [repository("a")],
    });
    const withFork = calculateProfileScore({
      now: NOW,
      repositories: [
        repository("a"),
        repository("fork", { isFork: true, stars: 50_000 }),
      ],
    });
    expect(withFork).toEqual(base);
  });

  test("caps the influence of a single viral repository", () => {
    const score = calculateProfileScore({
      now: NOW,
      repositories: [repository("viral", { stars: 100_000 })],
    });
    expect(metric(score, "influence", "stars").score).toBe(20);
  });

  test("counts weak technology signals as absent", () => {
    const score = calculateProfileScore({
      now: NOW,
      repositories: [
        repository("a", {
          technologies: [{ confidence: 0.3, technologyId: "github-actions" }],
        }),
      ],
    });
    expect(metric(score, "reliability", "ci").score).toBe(0);
  });

  test("credits statically typed languages without a type checker", () => {
    const score = calculateProfileScore({
      now: NOW,
      repositories: [
        repository("a", {
          languages: [
            {
              languageId: "go",
              percentage: 100,
              role: "primary",
              type: "programming",
            },
          ],
          technologies: [],
        }),
      ],
    });
    expect(metric(score, "maintainability", "type-safety").score).toBe(100);
    expect(metric(score, "maintainability", "linting").score).toBe(50);
  });

  test("honours configured weights", () => {
    const repositories = [repository("a", { stars: 400 })];
    const influenceOnly = calculateProfileScore(
      { now: NOW, repositories },
      {
        ...DEFAULT_SCORING_CONFIG,
        dimensionWeights: {
          contribution: 0,
          influence: 1,
          maintainability: 0,
          reliability: 0,
          security: 0,
          uniqueness: 0,
        },
      }
    );
    const influence = dimension(influenceOnly, "influence").score ?? 0;
    expect(influenceOnly.overall).toBe(Math.round(influence) / 10);
  });
});

describe("gradeFor", () => {
  test("uses inclusive lower bounds", () => {
    expect(gradeFor(9, DEFAULT_SCORING_CONFIG)).toBe("S");
    expect(gradeFor(8.99, DEFAULT_SCORING_CONFIG)).toBe("A");
    expect(gradeFor(5, DEFAULT_SCORING_CONFIG)).toBe("D");
    expect(gradeFor(0, DEFAULT_SCORING_CONFIG)).toBe("E");
  });
});
