import { listUserRepositoryTechnologies } from "@gitflex/db/queries/insights";
import { redirect } from "next/navigation";

import { NotAnalyzed } from "@/features/insights/not-analyzed";
import { TechnologiesView } from "@/features/profile/technologies-view";
import { db, getSession } from "@/server/auth";

export default async function TechnologiesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const rows = await listUserRepositoryTechnologies(db, session.user.id);
  if (rows.length === 0) {
    return <NotAnalyzed />;
  }
  return <TechnologiesView basePath="/dashboard" rows={rows} />;
}
