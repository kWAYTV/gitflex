import { findLatestProfileSnapshot } from "@gitflex/db/queries/scoring";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import { redirect } from "next/navigation";

import { ScoreDetail } from "@/features/scores/score-detail";
import { db, getSession } from "@/server/auth";

export default async function ScorePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const snapshot = await findLatestProfileSnapshot(db, session.user.id);

  if (!snapshot) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No score yet</EmptyTitle>
          <EmptyDescription>
            A score is calculated when a scan finishes. Start one from the
            overview.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScoreDetail
      calculatedAt={snapshot.createdAt}
      links="dashboard"
      score={snapshot.breakdown}
    />
  );
}
