import { getPublicTechnologyUsage } from "@gitflex/core/profile/public";
import { getTechnology } from "@gitflex/technologies/lookup";
import { notFound } from "next/navigation";

import { TechnologyDetailView } from "@/features/profile/technology-detail-view";
import { db } from "@/server/auth";
import { requirePublicProfile } from "@/server/public-profile";

export default async function PublicTechnologyPage({
  params,
}: {
  params: Promise<{ technologyId: string; username: string }>;
}) {
  const { technologyId, username } = await params;
  const technology = getTechnology(technologyId);
  if (!technology) {
    notFound();
  }

  const [profile, usage] = await Promise.all([
    requirePublicProfile(params),
    getPublicTechnologyUsage(db, username, technology.id),
  ]);
  if (!usage) {
    notFound();
  }

  return (
    <TechnologyDetailView
      basePath={`/u/${profile.owner.username}`}
      detected={new Set(profile.technologies.map((row) => row.technologyId))}
      technology={technology}
      usage={usage}
    />
  );
}
