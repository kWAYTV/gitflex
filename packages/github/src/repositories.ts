import { z } from "zod";

import type { GitHubClient } from "./client";
import { toGitHubAppError } from "./errors";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

const VIEWER_REPOSITORIES_QUERY = /* GraphQL */ `
  query ViewerRepositories($first: Int!, $after: String) {
    viewer {
      databaseId
      login
      repositories(
        first: $first
        after: $after
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          databaseId
          id
          name
          nameWithOwner
          description
          url
          visibility
          isFork
          isArchived
          isDisabled
          diskUsage
          stargazerCount
          forkCount
          createdAt
          updatedAt
          pushedAt
          owner {
            __typename
            login
            ... on User {
              databaseId
            }
            ... on Organization {
              databaseId
            }
          }
          parent {
            databaseId
            nameWithOwner
          }
          defaultBranchRef {
            name
          }
          primaryLanguage {
            name
          }
          watchers {
            totalCount
          }
          licenseInfo {
            spdxId
          }
          repositoryTopics(first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
`;

const repositoryNodeSchema = z.object({
  createdAt: z.iso.datetime(),
  databaseId: z.number().int(),
  defaultBranchRef: z.object({ name: z.string() }).nullable(),
  description: z.string().nullable(),
  diskUsage: z.number().int().nullable(),
  forkCount: z.number().int(),
  id: z.string(),
  isArchived: z.boolean(),
  isDisabled: z.boolean(),
  isFork: z.boolean(),
  licenseInfo: z.object({ spdxId: z.string().nullable() }).nullable(),
  name: z.string(),
  nameWithOwner: z.string(),
  owner: z.object({
    __typename: z.enum(["User", "Organization"]),
    databaseId: z.number().int(),
    login: z.string(),
  }),
  parent: z
    .object({ databaseId: z.number().int(), nameWithOwner: z.string() })
    .nullable(),
  primaryLanguage: z.object({ name: z.string() }).nullable(),
  pushedAt: z.iso.datetime().nullable(),
  repositoryTopics: z.object({
    nodes: z.array(z.object({ topic: z.object({ name: z.string() }) })),
  }),
  stargazerCount: z.number().int(),
  updatedAt: z.iso.datetime(),
  url: z.url(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]),
  watchers: z.object({ totalCount: z.number().int() }),
});

const viewerRepositoriesResponseSchema = z.object({
  viewer: z.object({
    databaseId: z.number().int(),
    login: z.string(),
    repositories: z.object({
      nodes: z.array(repositoryNodeSchema),
      pageInfo: z.object({
        endCursor: z.string().nullable(),
        hasNextPage: z.boolean(),
      }),
    }),
  }),
});

type RepositoryNode = z.infer<typeof repositoryNodeSchema>;

export type RepositoryVisibility = "public" | "private" | "internal";
export type RepositoryOwnerType = "user" | "organization";

const VISIBILITY = {
  INTERNAL: "internal",
  PRIVATE: "private",
  PUBLIC: "public",
} as const satisfies Record<RepositoryNode["visibility"], RepositoryVisibility>;

export interface GitHubViewer {
  id: number;
  login: string;
}

export interface GitHubRepository {
  createdAt: Date;
  defaultBranch: string | null;
  description: string | null;
  forks: number;
  fullName: string;
  githubId: number;
  htmlUrl: string;
  isArchived: boolean;
  isDisabled: boolean;
  isFork: boolean;
  license: string | null;
  name: string;
  nodeId: string;
  ownerId: number;
  ownerLogin: string;
  ownerType: RepositoryOwnerType;
  parentFullName: string | null;
  parentGithubId: number | null;
  primaryLanguage: string | null;
  pushedAt: Date | null;
  sizeKb: number;
  stars: number;
  topics: string[];
  updatedAt: Date;
  visibility: RepositoryVisibility;
  watchers: number;
}

export interface ViewerRepositories {
  repositories: GitHubRepository[];
  /** True when the page limit was reached before GitHub reported the last page. */
  truncated: boolean;
  viewer: GitHubViewer;
}

export function toGitHubRepository(node: RepositoryNode): GitHubRepository {
  return {
    createdAt: new Date(node.createdAt),
    defaultBranch: node.defaultBranchRef?.name ?? null,
    description: node.description,
    forks: node.forkCount,
    fullName: node.nameWithOwner,
    githubId: node.databaseId,
    htmlUrl: node.url,
    isArchived: node.isArchived,
    isDisabled: node.isDisabled,
    isFork: node.isFork,
    license: node.licenseInfo?.spdxId ?? null,
    name: node.name,
    nodeId: node.id,
    ownerId: node.owner.databaseId,
    ownerLogin: node.owner.login,
    ownerType:
      node.owner.__typename === "Organization" ? "organization" : "user",
    parentFullName: node.parent?.nameWithOwner ?? null,
    parentGithubId: node.parent?.databaseId ?? null,
    primaryLanguage: node.primaryLanguage?.name ?? null,
    pushedAt: node.pushedAt ? new Date(node.pushedAt) : null,
    sizeKb: node.diskUsage ?? 0,
    stars: node.stargazerCount,
    topics: node.repositoryTopics.nodes.map(
      (topicNode) => topicNode.topic.name
    ),
    updatedAt: new Date(node.updatedAt),
    visibility: VISIBILITY[node.visibility],
    watchers: node.watchers.totalCount,
  };
}

export async function listViewerRepositories(
  client: GitHubClient
): Promise<ViewerRepositories> {
  const repositories: GitHubRepository[] = [];
  let viewer: GitHubViewer | undefined;
  let after: string | null = null;
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let raw: unknown;
    try {
      // biome-ignore lint/performance/noAwaitInLoops: cursor pagination requires the previous page's cursor
      raw = await client.graphql(VIEWER_REPOSITORIES_QUERY, {
        after,
        first: PAGE_SIZE,
      });
    } catch (error) {
      throw toGitHubAppError(error);
    }

    const data = viewerRepositoriesResponseSchema.parse(raw);
    viewer ??= { id: data.viewer.databaseId, login: data.viewer.login };
    repositories.push(
      ...data.viewer.repositories.nodes.map(toGitHubRepository)
    );

    const { hasNextPage, endCursor } = data.viewer.repositories.pageInfo;
    if (!(hasNextPage && endCursor)) {
      break;
    }
    after = endCursor;
    truncated = page === MAX_PAGES - 1;
  }

  if (!viewer) {
    throw toGitHubAppError(new Error("GitHub returned no viewer"));
  }

  return { repositories, truncated, viewer };
}
