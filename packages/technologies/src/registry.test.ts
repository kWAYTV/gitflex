import { describe, expect, test } from "bun:test";
import { TECHNOLOGIES } from "./registry";
import { ECOSYSTEMS, TECHNOLOGY_CATEGORIES } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ids = new Set(TECHNOLOGIES.map((technology) => technology.id));

describe("technology registry", () => {
  test("ids are unique and slug-shaped", () => {
    expect(ids.size).toBe(TECHNOLOGIES.length);
    for (const id of ids) {
      expect(id).toMatch(SLUG);
    }
  });

  test("relationships reference known technologies", () => {
    for (const technology of TECHNOLOGIES) {
      for (const related of [
        ...(technology.related ?? []),
        ...(technology.prerequisites ?? []),
      ]) {
        expect({ from: technology.id, ok: ids.has(related) }).toEqual({
          from: technology.id,
          ok: true,
        });
      }
    }
  });

  test("categories and ecosystems are known", () => {
    for (const technology of TECHNOLOGIES) {
      expect(TECHNOLOGY_CATEGORIES).toContain(technology.category);
      for (const matcher of technology.detection.packages ?? []) {
        expect(ECOSYSTEMS).toContain(matcher.ecosystem);
      }
    }
  });

  test("every technology has at least one detection rule", () => {
    for (const { detection, id } of TECHNOLOGIES) {
      const rules =
        (detection.packages?.length ?? 0) +
        (detection.configFiles?.length ?? 0) +
        (detection.conventions?.length ?? 0);
      expect({ id, rules: rules > 0 }).toEqual({ id, rules: true });
    }
  });

  test("structure rules only refine package detections", () => {
    for (const { detection, id } of TECHNOLOGIES) {
      if (detection.structure) {
        expect({ id, packages: Boolean(detection.packages?.length) }).toEqual({
          id,
          packages: true,
        });
      }
    }
  });
});
