import { listUserRepositories } from "@gitflex/db/queries/repositories";
import { redirect } from "next/navigation";

import { RepositoryManager } from "@/features/repositories/repository-manager";
import { db, getSession } from "@/server/auth";

export default async function RepositoriesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const repositories = await listUserRepositories(db, session.user.id);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <RepositoryManager repositories={repositories} />
    </div>
  );
}
