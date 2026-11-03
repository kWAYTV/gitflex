import type { ProfileScore } from "@gitflex/scoring/types";
import { Badge } from "@gitflex/ui/components/badge";
import { Card, CardContent } from "@gitflex/ui/components/card";
import type { ReactNode } from "react";

import { ConfidenceBadge } from "./confidence-badge";
import { DIMENSION_LABELS } from "./labels";
import { ScoreMeter } from "./score-meter";
import { ScoreRadar } from "./score-radar";

export function ScoreSummary({
  action,
  children,
  score,
}: {
  action?: ReactNode;
  children?: ReactNode;
  score: ProfileScore;
}) {
  return (
    <Card className="@container">
      <CardContent className="grid @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] items-center gap-8">
        <div className="@container/list grid gap-6">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium text-muted-foreground text-sm">
                Profile score
              </h2>
              <ConfidenceBadge confidence={score.confidence} />
              {action ? <div className="ml-auto">{action}</div> : null}
            </div>
            <p className="flex items-baseline gap-2">
              <span className="font-semibold text-6xl tabular-nums tracking-tight">
                {score.overall?.toFixed(1) ?? "–"}
              </span>
              <span className="text-lg text-muted-foreground">/ 10</span>
              {score.grade ? (
                <Badge className="ml-2 self-center" variant="secondary">
                  Grade {score.grade}
                </Badge>
              ) : null}
            </p>
            {children}
          </div>
          <ul className="grid @lg/list:grid-cols-2 gap-x-8 gap-y-3">
            {score.dimensions.map((dimension) => (
              <li
                className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm"
                key={dimension.dimension}
              >
                <span>{DIMENSION_LABELS[dimension.dimension]}</span>
                <ScoreMeter
                  label={DIMENSION_LABELS[dimension.dimension]}
                  score={dimension.score}
                />
                <span className="text-right tabular-nums">
                  {dimension.score ?? "–"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ScoreRadar dimensions={score.dimensions} />
      </CardContent>
    </Card>
  );
}
