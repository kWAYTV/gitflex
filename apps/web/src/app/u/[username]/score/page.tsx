import { PublicEmpty } from "@/features/profile/public-empty";
import { ScoreDetail } from "@/features/scores/score-detail";
import { requirePublicProfile } from "@/server/public-profile";

export default async function PublicScorePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { aggregateScope, score } = await requirePublicProfile(params);
  if (!score) {
    return (
      <PublicEmpty title="No score yet">
        A score appears once this profile's repositories have been analyzed.
      </PublicEmpty>
    );
  }

  return (
    <ScoreDetail
      calculatedAt={score.calculatedAt}
      links="github"
      note={
        aggregateScope === "included" ? (
          <p>
            The score includes private repositories; metric evidence lists
            public repositories only.
          </p>
        ) : null
      }
      score={score.result}
    />
  );
}
