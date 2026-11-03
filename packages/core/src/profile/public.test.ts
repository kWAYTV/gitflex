import { describe, expect, test } from "bun:test";
import type { ProfileScore } from "@gitflex/scoring/types";

import { redactEvidence } from "./public";

const score: ProfileScore = {
  confidence: 0.5,
  dimensions: [
    {
      confidence: 0.5,
      dimension: "reliability",
      metrics: [
        {
          assessment: "positive",
          confidence: 0.5,
          description: "Tests",
          id: "tests",
          label: "Tests",
          repositories: [
            { fullName: "me/open", repositoryId: "public-1", value: 1 },
            { fullName: "me/secret", repositoryId: "private-1", value: 1 },
          ],
          score: 80,
          summary: "2 repositories",
          weight: 1,
        },
      ],
      score: 80,
      weight: 0.2,
    },
  ],
  grade: "A",
  overall: 8,
  version: "test",
};

describe("redactEvidence", () => {
  test("keeps only evidence from public repositories", () => {
    const result = redactEvidence(score, new Set(["public-1"]));
    const names = result.dimensions.flatMap((dimension) =>
      dimension.metrics.flatMap((metric) =>
        metric.repositories.map((entry) => entry.fullName)
      )
    );
    expect(names).toEqual(["me/open"]);
  });

  test("leaves scores untouched", () => {
    const result = redactEvidence(score, new Set());
    expect(result.overall).toBe(8);
    expect(result.dimensions[0]?.metrics[0]?.score).toBe(80);
  });

  test("does not mutate the input", () => {
    redactEvidence(score, new Set());
    expect(score.dimensions[0]?.metrics[0]?.repositories).toHaveLength(2);
  });
});
