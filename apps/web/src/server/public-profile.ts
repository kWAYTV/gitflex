import { getPublicProfile } from "@gitflex/core/profile/public";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "./auth";

/** Deduplicates the projection across the layout, metadata and pages of one request. */
export const loadPublicProfile = cache((username: string) =>
  getPublicProfile(db, username)
);

export async function requirePublicProfile(
  params: Promise<{ username: string }>
) {
  const { username } = await params;
  const profile = await loadPublicProfile(username);
  if (!profile) {
    notFound();
  }
  return profile;
}
