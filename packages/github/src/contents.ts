import { AppError } from "@gitflex/shared/errors";
import { RequestError } from "@octokit/request-error";
import { z } from "zod";

import type { GitHubClient } from "./client";
import { toGitHubAppError } from "./errors";

const HEAD_QUERY = /* GraphQL */ `
  query RepositoryHead($owner: String!, $name: String!, $expression: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $expression) {
        ... on Commit {
          oid
          tree {
            oid
          }
        }
      }
    }
  }
`;

const headResponseSchema = z.object({
  repository: z
    .object({
      object: z
        .object({
          oid: z.string().optional(),
          tree: z.object({ oid: z.string() }).optional(),
        })
        .nullable(),
    })
    .nullable(),
});

const treeResponseSchema = z.object({
  tree: z.array(
    z.object({
      path: z.string(),
      size: z.number().int().optional(),
      type: z.string(),
    })
  ),
  truncated: z.boolean(),
});

const languagesResponseSchema = z.record(z.string(), z.number());

const blobSchema = z
  .object({
    isBinary: z.boolean().nullable().optional(),
    isTruncated: z.boolean().optional(),
    text: z.string().nullable().optional(),
  })
  .nullable();

const blobsResponseSchema = z.object({
  repository: z.record(z.string(), blobSchema).nullable(),
});

/** Aliased blob lookups per GraphQL request; keeps query cost and payload size bounded. */
const BLOB_BATCH_SIZE = 40;

export interface RepositoryRef {
  name: string;
  owner: string;
}

export interface RepositoryHead {
  commitSha: string;
  treeSha: string;
}

export interface RepositoryTree {
  files: { path: string; size: number | null }[];
  truncated: boolean;
}

/** Resolves a branch, tag or SHA to its commit; `null` for empty repositories or unknown refs. */
export async function getRepositoryHead(
  client: GitHubClient,
  repository: RepositoryRef,
  ref: string
): Promise<RepositoryHead | null> {
  let raw: unknown;
  try {
    raw = await client.graphql(HEAD_QUERY, {
      expression: ref,
      name: repository.name,
      owner: repository.owner,
    });
  } catch (error) {
    throw toGitHubAppError(error);
  }
  const commit = headResponseSchema.parse(raw).repository?.object;
  if (!(commit?.oid && commit.tree)) {
    return null;
  }
  return { commitSha: commit.oid, treeSha: commit.tree.oid };
}

export async function getRepositoryTree(
  client: GitHubClient,
  repository: RepositoryRef,
  treeSha: string,
  maxFiles: number
): Promise<RepositoryTree> {
  let raw: unknown;
  try {
    const response = await client.request(
      "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
      {
        owner: repository.owner,
        recursive: "1",
        repo: repository.name,
        tree_sha: treeSha,
      }
    );
    raw = response.data;
  } catch (error) {
    // 409 means the repository has no commits yet.
    if (error instanceof RequestError && error.status === 409) {
      return { files: [], truncated: false };
    }
    throw toGitHubAppError(error);
  }
  const data = treeResponseSchema.parse(raw);
  const blobs = data.tree.filter((entry) => entry.type === "blob");
  return {
    files: blobs
      .slice(0, maxFiles)
      .map((entry) => ({ path: entry.path, size: entry.size ?? null })),
    truncated: data.truncated || blobs.length > maxFiles,
  };
}

/** Linguist byte counts per language, excluding vendored and generated files. */
export async function getRepositoryLanguages(
  client: GitHubClient,
  repository: RepositoryRef
): Promise<Record<string, number>> {
  try {
    const response = await client.request(
      "GET /repos/{owner}/{repo}/languages",
      {
        owner: repository.owner,
        repo: repository.name,
      }
    );
    return languagesResponseSchema.parse(response.data);
  } catch (error) {
    throw toGitHubAppError(error);
  }
}

function blobQuery(count: number): string {
  const variables = Array.from(
    { length: count },
    (_, index) => `$e${index}: String!`
  ).join(", ");
  const fields = Array.from(
    { length: count },
    (_, index) =>
      `f${index}: object(expression: $e${index}) { ... on Blob { text isBinary isTruncated } }`
  ).join("\n");
  return `query RepositoryBlobs($owner: String!, $name: String!, ${variables}) {
    repository(owner: $owner, name: $name) { ${fields} }
  }`;
}

/** Reads text blobs at a commit. Binary, truncated and missing files are omitted. */
export async function readRepositoryFiles(
  client: GitHubClient,
  repository: RepositoryRef,
  commitSha: string,
  paths: readonly string[]
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();

  for (let offset = 0; offset < paths.length; offset += BLOB_BATCH_SIZE) {
    const batch = paths.slice(offset, offset + BLOB_BATCH_SIZE);
    const variables: Record<string, string> = {
      name: repository.name,
      owner: repository.owner,
    };
    for (const [index, path] of batch.entries()) {
      variables[`e${index}`] = `${commitSha}:${path}`;
    }

    let raw: unknown;
    try {
      // biome-ignore lint/performance/noAwaitInLoops: batches run sequentially to stay under GitHub's secondary rate limits
      raw = await client.graphql(blobQuery(batch.length), variables);
    } catch (error) {
      throw toGitHubAppError(error);
    }
    const blobs = blobsResponseSchema.parse(raw).repository;
    if (!blobs) {
      throw new AppError(
        "REPOSITORY_ACCESS_REVOKED",
        `Repository ${repository.owner}/${repository.name} is no longer accessible.`
      );
    }
    for (const [index, path] of batch.entries()) {
      const blob = blobs[`f${index}`];
      if (
        blob &&
        typeof blob.text === "string" &&
        !blob.isBinary &&
        !blob.isTruncated
      ) {
        contents.set(path, blob.text);
      }
    }
  }

  return contents;
}
