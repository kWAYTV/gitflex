import {
  listRepositoryAnalysisStates,
  listUserRepositoryLanguages,
  listUserRepositoryTechnologies,
} from "@gitflex/db/queries/insights";
import { listUserRepositories } from "@gitflex/db/queries/repositories";
import { redirect } from "next/navigation";

import { buildRepositoryInsights } from "@/features/repositories/insights";
import { RepositoryManager } from "@/features/repositories/repository-manager";
import { db, getSession } from "@/server/auth";

export default async function RepositoriesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const [repositories, states, languages, technologies] = await Promise.all([
    listUserRepositories(db, userId),
    listRepositoryAnalysisStates(db, userId),
    listUserRepositoryLanguages(db, userId),
    listUserRepositoryTechnologies(db, userId),
  ]);

  return (
    <RepositoryManager
      insights={buildRepositoryInsights(states, languages, technologies)}
      repositories={repositories}
    />
  );
}
