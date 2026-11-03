import type { ProfileScore } from "@gitflex/scoring/types";
import { Badge } from "@gitflex/ui/components/badge";
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
import { DIMENSION_LABELS } from "./labels";
import { ScoreMeter } from "./score-meter";

export function ScoreSummary({
  action,
  score,
}: {
  action?: ReactNode;
  score: ProfileScore;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          Score
          <span className="font-normal text-muted-foreground tabular-nums">
            {score.overall?.toFixed(1) ?? "–"}
            <span className="text-xs"> / 10</span>
          </span>
          {score.grade ? (
            <Badge className="self-center">{score.grade}</Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge confidence={score.confidence} />
          Rule-based, from repository evidence.
        </CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {score.dimensions.map((dimension) => (
          <div
            className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-xs"
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
