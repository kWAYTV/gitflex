import { describe, expect, test } from "bun:test";

import { toGitHubRepository } from "./repositories";

const node = {
  createdAt: "2020-01-01T00:00:00Z",
  databaseId: 123,
  defaultBranchRef: { name: "main" },
  description: "A fork",
  diskUsage: 2048,
  forkCount: 3,
  id: "R_kgDOAAAAew",
  isArchived: false,
  isDisabled: false,
  isFork: true,
  licenseInfo: { spdxId: "MIT" },
  name: "hello",
  nameWithOwner: "acme/hello",
  owner: { __typename: "Organization" as const, databaseId: 7, login: "acme" },
  parent: { databaseId: 99, nameWithOwner: "upstream/hello" },
  primaryLanguage: { name: "TypeScript" },
  pushedAt: null,
  repositoryTopics: { nodes: [{ topic: { name: "cli" } }] },
  stargazerCount: 10,
  updatedAt: "2024-05-01T12:00:00Z",
  url: "https://github.com/acme/hello",
  visibility: "PRIVATE" as const,
  watchers: { totalCount: 4 },
};

describe("toGitHubRepository", () => {
  test("maps GraphQL nodes to the normalized repository shape", () => {
    const repository = toGitHubRepository(node);

    expect(repository).toMatchObject({
      defaultBranch: "main",
      fullName: "acme/hello",
      githubId: 123,
      isFork: true,
      license: "MIT",
      ownerId: 7,
      ownerType: "organization",
      parentFullName: "upstream/hello",
      parentGithubId: 99,
      pushedAt: null,
      sizeKb: 2048,
      topics: ["cli"],
      visibility: "private",
    });
    expect(repository.createdAt.toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });

  test("handles empty repositories without a default branch", () => {
    const repository = toGitHubRepository({
      ...node,
      defaultBranchRef: null,
      diskUsage: null,
      licenseInfo: null,
      parent: null,
      primaryLanguage: null,
    });

    expect(repository.defaultBranch).toBeNull();
    expect(repository.sizeKb).toBe(0);
    expect(repository.license).toBeNull();
    expect(repository.parentGithubId).toBeNull();
  });
});
