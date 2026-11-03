import type { ProfileScore } from "@gitflex/scoring/types";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import type { ReactNode } from "react";

import { ConfidenceBadge } from "./confidence-badge";
import { DIMENSION_DESCRIPTIONS, DIMENSION_LABELS } from "./labels";
import { MetricList, type RepositoryLinks } from "./metric-list";
import { ScoreSummary } from "./score-summary";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function ScoreDetail({
  calculatedAt,
  links,
  note,
  score,
}: {
  calculatedAt: Date;
  links: RepositoryLinks;
  note?: ReactNode;
  score: ProfileScore;
}) {
  return (
    <div className="grid gap-6">
      <ScoreSummary score={score}>
        <div className="grid max-w-prose gap-1 text-muted-foreground text-sm">
          <p>
            Every number comes from documented rules over the analyzed
            repositories. Unknown metrics are left out of the score and lower
            its confidence instead; thin evidence counts for less than strong
            evidence.
          </p>
          <p>
            Grades are internal GitFlex classifications, not industry
            qualifications. Scoring {score.version}, calculated{" "}
            {dateFormatter.format(calculatedAt)}.
          </p>
          {note}
        </div>
      </ScoreSummary>

      <div className="grid gap-6 lg:grid-cols-2">
        {score.dimensions.map((dimension) => (
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
              <MetricList links={links} metrics={dimension.metrics} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
