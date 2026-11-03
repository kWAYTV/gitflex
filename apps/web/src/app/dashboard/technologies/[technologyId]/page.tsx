import {
  getUserTechnologyUsage,
  listUserRepositoryTechnologies,
} from "@gitflex/db/queries/insights";
import { getTechnology } from "@gitflex/technologies/lookup";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { TechnologyDetailView } from "@/features/profile/technology-detail-view";
import { db, getSession } from "@/server/auth";

const repositoryHref = (repositoryId: string) =>
  `/dashboard/repositories/${repositoryId}` as Route;

export default async function TechnologyPage({
  params,
}: {
  params: Promise<{ technologyId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { technologyId } = await params;
  const technology = getTechnology(technologyId);
  if (!technology) {
    notFound();
  }

  const [usage, detections] = await Promise.all([
    getUserTechnologyUsage(db, session.user.id, technology.id),
    listUserRepositoryTechnologies(db, session.user.id),
  ]);

  return (
    <TechnologyDetailView
      basePath="/dashboard"
      detected={new Set(detections.map((row) => row.technologyId))}
      repositoryHref={repositoryHref}
      technology={technology}
      usage={usage}
    />
  );
}
