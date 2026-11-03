import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { user } from "../schema/auth";
import { type ProfileVisibility, profile } from "../schema/profile";
import { repository, repositorySelection } from "../schema/repositories";
import { latestUserScans } from "./insights";
import type { Executor } from "./repositories";

export interface ProfileSettings {
  publishPrivateAggregates: boolean;
  visibility: ProfileVisibility;
}

const DEFAULT_SETTINGS: ProfileSettings = {
  publishPrivateAggregates: false,
  visibility: "public",
};

export interface ProfileOwner extends ProfileSettings {
  id: string;
  image: string | null;
  name: string;
  username: string;
}

/** GitHub logins are case-insensitive, so lookups are too. */
export async function findProfileOwner(
  executor: Executor,
  username: string
): Promise<ProfileOwner | null> {
  const [row] = await executor
    .select({
      id: user.id,
      image: user.image,
      name: user.name,
      publishPrivateAggregates: profile.publishPrivateAggregates,
      username: user.username,
      visibility: profile.visibility,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(sql`lower(${user.username}) = lower(${username})`)
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    ...row,
    publishPrivateAggregates:
      row.publishPrivateAggregates ?? DEFAULT_SETTINGS.publishPrivateAggregates,
    visibility: row.visibility ?? DEFAULT_SETTINGS.visibility,
  };
}

export async function getProfileSettings(
  executor: Executor,
  userId: string
): Promise<ProfileSettings> {
  const [row] = await executor
    .select({
      publishPrivateAggregates: profile.publishPrivateAggregates,
      visibility: profile.visibility,
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);
  return row ?? DEFAULT_SETTINGS;
}

export async function updateProfileSettings(
  executor: Executor,
  userId: string,
  patch: Partial<ProfileSettings>
): Promise<ProfileSettings> {
  const [row] = await executor
    .insert(profile)
    .values({ ...DEFAULT_SETTINGS, ...patch, userId })
    .onConflictDoUpdate({ set: patch, target: profile.userId })
    .returning({
      publishPrivateAggregates: profile.publishPrivateAggregates,
      visibility: profile.visibility,
    });
  if (!row) {
    throw new Error("Profile settings upsert returned no row.");
  }
  return row;
}

export interface PublicRepository {
  analyzed: boolean;
  description: string | null;
  forks: number;
  fullName: string;
  htmlUrl: string;
  id: string;
  isFork: boolean;
  primaryLanguage: string | null;
  pushedAt: Date | null;
  stars: number;
}

/** Public, included repositories only. Private repositories are never listed, whatever the settings. */
export function listPublicRepositories(
  executor: Executor,
  userId: string
): Promise<PublicRepository[]> {
  const latest = latestUserScans(executor, userId, "public");
  return executor
    .select({
      analyzed: sql<boolean>`${latest.id} is not null`,
      description: repository.description,
      forks: repository.forks,
      fullName: repository.fullName,
      htmlUrl: repository.htmlUrl,
      id: repository.id,
      isFork: repository.isFork,
      primaryLanguage: repository.primaryLanguage,
      pushedAt: repository.pushedAt,
      stars: repository.stars,
    })
    .from(repositorySelection)
    .innerJoin(repository, eq(repository.id, repositorySelection.repositoryId))
    .leftJoin(latest, eq(latest.repositoryId, repository.id))
    .where(
      and(
        eq(repositorySelection.userId, userId),
        eq(repositorySelection.included, true),
        isNull(repositorySelection.removedAt),
        eq(repository.visibility, "public")
      )
    )
    .orderBy(desc(repository.pushedAt), repository.fullName);
}
