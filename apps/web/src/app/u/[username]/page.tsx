import { isApplicationLanguage } from "@gitflex/technologies/languages";
import type { Route } from "next";

import { summarizeTechnologies } from "@/features/insights/technologies";
import { InsightSections, SeeAll } from "@/features/profile/insight-sections";
import { PublicEmpty } from "@/features/profile/public-empty";
import { Stats } from "@/features/profile/stats";
import { ScoreSummary } from "@/features/scores/score-summary";
import { requirePublicProfile } from "@/server/public-profile";

export default async function PublicOverviewPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const profile = await requirePublicProfile(params);
  const basePath = `/u/${profile.owner.username}`;
  const analyzedPublic = profile.repositories.filter(
    (repository) => repository.analyzed
  ).length;

  return (
    <div className="grid gap-6">
      {profile.score ? (
        <ScoreSummary
          action={
            <SeeAll href={`${basePath}/score` as Route}>Breakdown</SeeAll>
          }
          score={profile.score.result}
        />
      ) : null}

      <Stats
        items={[
          {
            label: "Public repositories",
            value: profile.repositories.length,
          },
          { label: "Analyzed", value: analyzedPublic },
          {
            label: "Technologies",
            value: summarizeTechnologies(profile.technologyAggregates).length,
          },
          {
            label: "Languages",
            value: profile.languages.filter(isApplicationLanguage).length,
          },
        ]}
      />

      {profile.aggregateScope === "included" ? (
        <p className="text-muted-foreground text-sm">
          Score, language and technology totals include private repositories.
          Only public repositories are named.
        </p>
      ) : null}

      {profile.languages.length === 0 &&
      profile.technologyAggregates.length === 0 ? (
        <PublicEmpty />
      ) : (
        <InsightSections
          basePath={basePath}
          languages={profile.languages}
          technologyRows={profile.technologyAggregates}
        />
      )}
    </div>
  );
}
