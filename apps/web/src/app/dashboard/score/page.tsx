import { findLatestProfileSnapshot } from "@gitflex/db/queries/scoring";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import { redirect } from "next/navigation";

import { ConfidenceBadge } from "@/features/scores/confidence-badge";
import {
  DIMENSION_DESCRIPTIONS,
  DIMENSION_LABELS,
} from "@/features/scores/labels";
import { MetricList } from "@/features/scores/metric-list";
import { ScoreSummary } from "@/features/scores/score-summary";
import { db, getSession } from "@/server/auth";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

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

  const { breakdown } = snapshot;
  return (
    <div className="grid gap-6">
      <ScoreSummary score={breakdown}>
        <div className="grid max-w-prose gap-1 text-muted-foreground text-sm">
          <p>
            Every number comes from documented rules over your analyzed
            repositories. Unknown metrics are left out of the score and lower
            its confidence instead; thin evidence counts for less than strong
            evidence.
          </p>
          <p>
            Grades are internal GitFlex classifications, not industry
            qualifications. Scoring {breakdown.version}, calculated{" "}
            {dateFormatter.format(snapshot.createdAt)}.
          </p>
        </div>
      </ScoreSummary>

      <div className="grid gap-6 lg:grid-cols-2">
        {breakdown.dimensions.map((dimension) => (
          <Card key={dimension.dimension}>
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                {DIMENSION_LABELS[dimension.dimension]}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {dimension.score ?? "–"}
                  <span className="text-xs"> / 100</span>
                </span>
              </CardTitle>
              <CardDescription>
                {DIMENSION_DESCRIPTIONS[dimension.dimension]} Weighs{" "}
                {Math.round(dimension.weight * 100)}% of the overall score.
              </CardDescription>
              <CardAction>
                <ConfidenceBadge confidence={dimension.confidence} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <MetricList metrics={dimension.metrics} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
