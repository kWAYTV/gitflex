import type { Database } from "@gitflex/db";
import {
  markUnseenSelectionsRemoved,
  upsertRepositories,
  upsertSelections,
} from "@gitflex/db/queries/repositories";
import type { RepositoryInsert } from "@gitflex/db/schema/repositories";
import { createGitHubClient } from "@gitflex/github/client";
import {
  type GitHubRepository,
  type GitHubViewer,
  listViewerRepositories,
} from "@gitflex/github/repositories";
import { AppError } from "@gitflex/shared/errors";

import { classifyOwnership, isIncludedByDefault } from "./classification";

export interface SyncRepositoriesInput {
  accessToken: string;
  db: Database;
  now?: Date;
  userId: string;
}

export interface SyncRepositoriesResult {
  discovered: number;
  removed: number;
  syncedAt: Date;
  truncated: boolean;
  viewer: GitHubViewer;
}

function toRepositoryInsert(
  repository: GitHubRepository,
  syncedAt: Date
): RepositoryInsert {
  return {
    defaultBranch: repository.defaultBranch,
    description: repository.description,
    forks: repository.forks,
    fullName: repository.fullName,
    githubCreatedAt: repository.createdAt,
    githubId: repository.githubId,
    githubUpdatedAt: repository.updatedAt,
    htmlUrl: repository.htmlUrl,
    isArchived: repository.isArchived,
    isDisabled: repository.isDisabled,
    isFork: repository.isFork,
    lastSyncedAt: syncedAt,
    license: repository.license,
    name: repository.name,
    nodeId: repository.nodeId,
    ownerGithubId: repository.ownerId,
    ownerLogin: repository.ownerLogin,
    ownerType: repository.ownerType,
    parentFullName: repository.parentFullName,
    parentGithubId: repository.parentGithubId,
    primaryLanguage: repository.primaryLanguage,
    pushedAt: repository.pushedAt,
    sizeKb: repository.sizeKb,
    stars: repository.stars,
    topics: repository.topics,
    visibility: repository.visibility,
    watchers: repository.watchers,
  };
}

/** Discovers the user's GitHub repositories and reconciles them with stored selections. */
export async function syncUserRepositories(
  input: SyncRepositoriesInput
): Promise<SyncRepositoriesResult> {
  const syncedAt = input.now ?? new Date();
  const client = createGitHubClient(input.accessToken);
  const { viewer, repositories, truncated } =
    await listViewerRepositories(client);

  const removed = await input.db.transaction(async (tx) => {
    const ids = await upsertRepositories(
      tx,
      repositories.map((repository) => toRepositoryInsert(repository, syncedAt))
    );

    const selections = repositories.map((repository) => {
      const repositoryId = ids.get(repository.githubId);
      if (!repositoryId) {
        throw new AppError(
          "INTERNAL_ERROR",
          `Repository ${repository.fullName} was not persisted`
        );
      }
      const ownership = classifyOwnership(repository, viewer);
      return {
        defaultIncluded: isIncludedByDefault(repository, ownership),
        ownership,
        repositoryId,
      };
    });

    await upsertSelections(tx, input.userId, selections, syncedAt);

    return truncated
      ? 0
      : await markUnseenSelectionsRemoved(tx, input.userId, syncedAt);
  });

  return {
    discovered: repositories.length,
    removed,
    syncedAt,
    truncated,
    viewer,
  };
}
