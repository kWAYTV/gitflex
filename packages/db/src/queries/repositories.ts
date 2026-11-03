import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { Database } from "../index";
import {
  type RepositoryInsert,
  type RepositoryOwnership,
  repository,
  repositorySelection,
} from "../schema/repositories";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;

const BATCH_SIZE = 500;

function excluded(column: AnyPgColumn) {
  return sql.raw(`excluded."${column.name}"`);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** Upserts repositories by GitHub ID and returns the internal ID for each GitHub ID. */
export async function upsertRepositories(
  executor: Executor,
  rows: readonly RepositoryInsert[]
): Promise<Map<number, string>> {
  const ids = new Map<number, string>();

  for (const batch of chunk(rows, BATCH_SIZE)) {
    // biome-ignore lint/performance/noAwaitInLoops: batches share one transaction connection and must run sequentially
    const inserted = await executor
      .insert(repository)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          defaultBranch: excluded(repository.defaultBranch),
          description: excluded(repository.description),
          forks: excluded(repository.forks),
          fullName: excluded(repository.fullName),
          githubUpdatedAt: excluded(repository.githubUpdatedAt),
          htmlUrl: excluded(repository.htmlUrl),
          isArchived: excluded(repository.isArchived),
          isDisabled: excluded(repository.isDisabled),
          isFork: excluded(repository.isFork),
          lastSyncedAt: excluded(repository.lastSyncedAt),
          license: excluded(repository.license),
          name: excluded(repository.name),
          nodeId: excluded(repository.nodeId),
          ownerGithubId: excluded(repository.ownerGithubId),
          ownerLogin: excluded(repository.ownerLogin),
          ownerType: excluded(repository.ownerType),
          parentFullName: excluded(repository.parentFullName),
          parentGithubId: excluded(repository.parentGithubId),
          primaryLanguage: excluded(repository.primaryLanguage),
          pushedAt: excluded(repository.pushedAt),
          sizeKb: excluded(repository.sizeKb),
          stars: excluded(repository.stars),
          topics: excluded(repository.topics),
          updatedAt: sql`now()`,
          visibility: excluded(repository.visibility),
          watchers: excluded(repository.watchers),
        },
        target: repository.githubId,
      })
      .returning({ githubId: repository.githubId, id: repository.id });

    for (const row of inserted) {
      ids.set(row.githubId, row.id);
    }
  }

  return ids;
}

export interface SelectionUpsert {
  /** Applied only when the selection is first created; user choices are preserved afterwards. */
  defaultIncluded: boolean;
  ownership: RepositoryOwnership;
  repositoryId: string;
}

export async function upsertSelections(
  executor: Executor,
  userId: string,
  rows: readonly SelectionUpsert[],
  seenAt: Date
): Promise<void> {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    // biome-ignore lint/performance/noAwaitInLoops: batches share one transaction connection and must run sequentially
    await executor
      .insert(repositorySelection)
      .values(
        batch.map((row) => ({
          firstSeenAt: seenAt,
          included: row.defaultIncluded,
          lastSeenAt: seenAt,
          ownership: row.ownership,
          repositoryId: row.repositoryId,
          userId,
        }))
      )
      .onConflictDoUpdate({
        set: {
          lastSeenAt: excluded(repositorySelection.lastSeenAt),
          ownership: excluded(repositorySelection.ownership),
          removedAt: null,
          updatedAt: sql`now()`,
        },
        target: [repositorySelection.userId, repositorySelection.repositoryId],
      });
  }
}

/** Marks selections that were not returned by the latest discovery as removed. */
export async function markUnseenSelectionsRemoved(
  executor: Executor,
  userId: string,
  seenAt: Date
): Promise<number> {
  const removed = await executor
    .update(repositorySelection)
    .set({ removedAt: seenAt })
    .where(
      and(
        eq(repositorySelection.userId, userId),
        lt(repositorySelection.lastSeenAt, seenAt),
        isNull(repositorySelection.removedAt)
      )
    )
    .returning({ id: repositorySelection.id });

  return removed.length;
}

export interface UserRepository {
  description: string | null;
  forks: number;
  fullName: string;
  githubId: number;
  htmlUrl: string;
  id: string;
  included: boolean;
  isArchived: boolean;
  isDisabled: boolean;
  isFork: boolean;
  lastSyncedAt: Date;
  name: string;
  ownerLogin: string;
  ownership: RepositoryOwnership;
  parentFullName: string | null;
  primaryLanguage: string | null;
  pushedAt: Date | null;
  sizeKb: number;
  stars: number;
  topics: string[];
  visibility: "public" | "private" | "internal";
}

export function listUserRepositories(
  executor: Executor,
  userId: string
): Promise<UserRepository[]> {
  return executor
    .select({
      description: repository.description,
      forks: repository.forks,
      fullName: repository.fullName,
      githubId: repository.githubId,
      htmlUrl: repository.htmlUrl,
      id: repository.id,
      included: repositorySelection.included,
      isArchived: repository.isArchived,
      isDisabled: repository.isDisabled,
      isFork: repository.isFork,
      lastSyncedAt: repository.lastSyncedAt,
      name: repository.name,
      ownerLogin: repository.ownerLogin,
      ownership: repositorySelection.ownership,
      parentFullName: repository.parentFullName,
      primaryLanguage: repository.primaryLanguage,
      pushedAt: repository.pushedAt,
      sizeKb: repository.sizeKb,
      stars: repository.stars,
      topics: repository.topics,
      visibility: repository.visibility,
    })
    .from(repositorySelection)
    .innerJoin(repository, eq(repository.id, repositorySelection.repositoryId))
    .where(
      and(
        eq(repositorySelection.userId, userId),
        isNull(repositorySelection.removedAt)
      )
    )
    .orderBy(desc(repository.pushedAt));
}

/** Updates inclusion only for selections owned by the given user. Returns the number of rows changed. */
export async function setRepositoryInclusion(
  executor: Executor,
  userId: string,
  repositoryIds: readonly string[],
  included: boolean
): Promise<number> {
  if (repositoryIds.length === 0) {
    return 0;
  }

  const updated = await executor
    .update(repositorySelection)
    .set({ included })
    .where(
      and(
        eq(repositorySelection.userId, userId),
        inArray(repositorySelection.repositoryId, [...repositoryIds]),
        isNull(repositorySelection.removedAt)
      )
    )
    .returning({ id: repositorySelection.id });

  return updated.length;
}
