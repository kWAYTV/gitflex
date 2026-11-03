import {
  getUserLanguageOverview,
  listRepositoryAnalysisStates,
} from "@gitflex/db/queries/insights";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import { redirect } from "next/navigation";

import { LanguageExplorer } from "@/features/insights/language-explorer";
import { NotAnalyzed } from "@/features/insights/not-analyzed";
import { db, getSession } from "@/server/auth";

export default async function LanguagesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [languages, states] = await Promise.all([
    getUserLanguageOverview(db, session.user.id),
    listRepositoryAnalysisStates(db, session.user.id),
  ]);
  if (languages.length === 0) {
    return <NotAnalyzed />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Languages</CardTitle>
        <CardDescription>
          Classified by GitHub Linguist, which already ignores vendored and
          generated files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LanguageExplorer
          analyzedRepositories={
            states.filter((state) => state.status === "completed").length
          }
          languages={languages}
        />
      </CardContent>
    </Card>
  );
}
