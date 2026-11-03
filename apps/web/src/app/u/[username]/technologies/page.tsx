import { PublicEmpty } from "@/features/profile/public-empty";
import { TechnologiesView } from "@/features/profile/technologies-view";
import { requirePublicProfile } from "@/server/public-profile";

export default async function PublicTechnologiesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { owner, technologyAggregates } = await requirePublicProfile(params);
  if (technologyAggregates.length === 0) {
    return <PublicEmpty />;
  }
  return (
    <TechnologiesView
      basePath={`/u/${owner.username}`}
      rows={technologyAggregates}
    />
  );
}
