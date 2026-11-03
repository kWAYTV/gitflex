"use server";

import {
  type ProfileSettings,
  updateProfileSettings,
} from "@gitflex/db/queries/profile";
import {
  type ActionResult,
  AppError,
  toActionError,
} from "@gitflex/shared/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, getSession } from "@/server/auth";

const profileSettingsInputSchema = z
  .object({
    publishPrivateAggregates: z.boolean(),
    visibility: z.enum(["public", "private"]),
  })
  .partial();

export async function updateProfileSettingsAction(
  input: z.input<typeof profileSettingsInputSchema>
): Promise<ActionResult<ProfileSettings>> {
  const parsed = profileSettingsInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      code: "VALIDATION_ERROR",
      message: "Invalid profile settings.",
      ok: false,
    };
  }

  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "You are not signed in.");
    }
    const settings = await updateProfileSettings(
      db,
      session.user.id,
      parsed.data
    );
    revalidatePath("/dashboard");
    return { data: settings, ok: true };
  } catch (error) {
    console.error("updating profile settings failed", error);
    return toActionError(error);
  }
}
