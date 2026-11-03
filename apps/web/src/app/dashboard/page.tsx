import { findLatestScan } from "@gitflex/db/queries/analysis";
import {
  getUserLanguageOverview,
  listRepositoryAnalysisStates,
  listUserRepositoryTechnologies,
} from "@gitflex/db/queries/insights";
import { getProfileSettings } from "@gitflex/db/queries/profile";
import { listUserRepositories } from "@gitflex/db/queries/repositories";
import { findLatestProfileSnapshot } from "@gitflex/db/queries/scoring";
import { isApplicationLanguage } from "@gitflex/technologies/languages";
import { redirect } from "next/navigation";

import { summarizeTechnologies } from "@/features/insights/technologies";
import { InsightSections, SeeAll } from "@/features/profile/insight-sections";
import { PublicProfilePanel } from "@/features/profile/public-profile-panel";
import { Stats } from "@/features/profile/stats";
import type { ScanStatusView } from "@/features/scans/actions";
import { ScanPanel } from "@/features/scans/scan-panel";
import { ScoreSummary } from "@/features/scores/score-summary";
import { db, getSession } from "@/server/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id: userId, username } = session.user;
  const [
    scan,
    repositories,
    states,
    technologyRows,
    languages,
    snapshot,
    settings,
  ] = await Promise.all([
    findLatestScan(db, userId),
    listUserRepositories(db, userId),
    listRepositoryAnalysisStates(db, userId),
    listUserRepositoryTechnologies(db, userId),
    getUserLanguageOverview(db, userId),
    findLatestProfileSnapshot(db, userId),
    getProfileSettings(db, userId),
  ]);

  const scanView: ScanStatusView | null = scan
    ? {
        completed: scan.completedRepositories,
        failed: scan.failedRepositories,
        id: scan.id,
        skipped: scan.skippedRepositories,
        status: scan.status,
        total: scan.totalRepositories,
      }
    : null;

  return (
    <div className="grid gap-6">
      <ScanPanel initialScan={scanView} key={`${scan?.id}:${scan?.status}`} />

      {snapshot ? (
        <ScoreSummary
          action={<SeeAll href="/dashboard/score">Breakdown</SeeAll>}
          score={snapshot.breakdown}
        />
      ) : null}

      <Stats
        items={[
          {
            label: "Included repositories",
            value: repositories.filter((repository) => repository.included)
              .length,
          },
          {
            label: "Analyzed",
            value: states.filter((state) => state.status === "completed")
              .length,
          },
          {
            label: "Technologies",
            value: summarizeTechnologies(technologyRows).length,
          },
          {
            label: "Languages",
            value: languages.filter(isApplicationLanguage).length,
          },
        ]}
      />

      <InsightSections
        basePath="/dashboard"
        languages={languages}
        technologyRows={technologyRows}
      />

      <PublicProfilePanel
        hasPrivateRepositories={repositories.some(
          (repository) =>
            repository.included && repository.visibility !== "public"
        )}
        settings={settings}
        username={username}
      />
    </div>
  );
}
