"use server";

import { syncUserRepositories } from "@gitflex/core/repositories/sync";
import { setRepositoryInclusion } from "@gitflex/db/queries/repositories";
import {
  type ActionResult,
  AppError,
  toActionError,
} from "@gitflex/shared/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, getSession } from "@/server/auth";
import { getGitHubAccessToken } from "@/server/github";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new AppError("UNAUTHORIZED", "You are not signed in.");
  }
  return session.user.id;
}

export interface SyncRepositoriesSummary {
  discovered: number;
  removed: number;
  truncated: boolean;
}

export async function syncRepositoriesAction(): Promise<
  ActionResult<SyncRepositoriesSummary>
> {
  try {
    const userId = await requireUserId();
    const accessToken = await getGitHubAccessToken(userId);
    const result = await syncUserRepositories({ accessToken, db, userId });

    revalidatePath("/dashboard/repositories");
    return {
      data: {
        discovered: result.discovered,
        removed: result.removed,
        truncated: result.truncated,
      },
      ok: true,
    };
  } catch (error) {
    console.error("repository sync failed", error);
    return toActionError(error);
  }
}

const inclusionInputSchema = z.object({
  included: z.boolean(),
  repositoryIds: z.array(z.uuid()).min(1).max(1000),
});

export async function setRepositoryInclusionAction(
  input: z.input<typeof inclusionInputSchema>
): Promise<ActionResult<{ updated: number }>> {
  const parsed = inclusionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      code: "VALIDATION_ERROR",
      message: "Invalid repository selection.",
      ok: false,
    };
  }

  try {
    const userId = await requireUserId();
    const updated = await setRepositoryInclusion(
      db,
      userId,
      parsed.data.repositoryIds,
      parsed.data.included
    );

    revalidatePath("/dashboard/repositories");
    return { data: { updated }, ok: true };
  } catch (error) {
    console.error("repository inclusion update failed", error);
    return toActionError(error);
  }
}
