import { describe, expect, test } from "bun:test";

import { classifyOwnership, isIncludedByDefault } from "./classification";

const viewer = { id: 1, login: "octocat" };

describe("classifyOwnership", () => {
  test("repository owned by the viewer is owner", () => {
    expect(classifyOwnership({ ownerId: 1, ownerType: "user" }, viewer)).toBe(
      "owner"
    );
  });

  test("organization repository is organization", () => {
    expect(
      classifyOwnership({ ownerId: 99, ownerType: "organization" }, viewer)
    ).toBe("organization");
  });

  test("another user's repository is collaborator", () => {
    expect(classifyOwnership({ ownerId: 2, ownerType: "user" }, viewer)).toBe(
      "collaborator"
    );
  });
});

describe("isIncludedByDefault", () => {
  const original = {
    isDisabled: false,
    isFork: false,
    visibility: "public" as const,
  };

  test("includes public original owned repositories", () => {
    expect(isIncludedByDefault(original, "owner")).toBe(true);
  });

  test("excludes forks", () => {
    expect(isIncludedByDefault({ ...original, isFork: true }, "owner")).toBe(
      false
    );
  });

  test("excludes private repositories", () => {
    expect(
      isIncludedByDefault({ ...original, visibility: "private" }, "owner")
    ).toBe(false);
  });

  test("excludes disabled repositories", () => {
    expect(
      isIncludedByDefault({ ...original, isDisabled: true }, "owner")
    ).toBe(false);
  });

  test("excludes repositories the viewer does not own", () => {
    expect(isIncludedByDefault(original, "organization")).toBe(false);
    expect(isIncludedByDefault(original, "collaborator")).toBe(false);
  });
});
