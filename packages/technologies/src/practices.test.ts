import { describe, expect, test } from "bun:test";
import { derivePractices, PRACTICES } from "./practices";
import { TECHNOLOGIES } from "./registry";

const ids = new Set(TECHNOLOGIES.map((technology) => technology.id));

describe("practices", () => {
  test("rules reference known technologies", () => {
    for (const practice of PRACTICES) {
      for (const technologyId of practice.impliedBy.technologies ?? []) {
        expect({ ok: ids.has(technologyId), technologyId }).toEqual({
          ok: true,
          technologyId,
        });
      }
    }
  });

  test("derives per-repository evidence from technologies and categories", () => {
    const observations = derivePractices([
      { repositoryId: "a", technologyId: "github-actions" },
      { repositoryId: "a", technologyId: "vitest" },
      { repositoryId: "b", technologyId: "playwright" },
      { repositoryId: "b", technologyId: "react" },
    ]);
    const byId = new Map(
      observations.map(({ evidence, practice }) => [
        practice.id,
        Object.fromEntries(evidence),
      ])
    );

    expect(byId.get("continuous-integration")).toEqual({
      a: ["github-actions"],
    });
    expect(byId.get("automated-testing")).toEqual({
      a: ["vitest"],
      b: ["playwright"],
    });
    expect(byId.has("containerization")).toBe(false);
  });
});
