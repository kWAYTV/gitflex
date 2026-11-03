"use client";

import type { DimensionResult } from "@gitflex/scoring/types";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gitflex/ui/components/chart";
import { cn } from "@gitflex/ui/lib/utils";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { DIMENSION_LABELS } from "./labels";

const chartConfig = {
  score: { color: "var(--chart-1)", label: "Score" },
} satisfies ChartConfig;

const formatScore = (
  value: unknown,
  _name: unknown,
  item: { payload?: { known?: boolean } }
) => (item.payload?.known ? `${value} / 100` : "Not enough evidence");

/** Six-axis profile shape; unknown dimensions plot at zero and say so in the tooltip. */
export function ScoreRadar({
  className,
  dimensions,
}: {
  className?: string;
  dimensions: DimensionResult[];
}) {
  const data = dimensions.map((dimension) => ({
    dimension: DIMENSION_LABELS[dimension.dimension],
    known: dimension.score !== null,
    score: dimension.score ?? 0,
  }));

  return (
    <ChartContainer
      className={cn("mx-auto aspect-square max-h-80 w-full", className)}
      config={chartConfig}
    >
      <RadarChart
        accessibilityLayer
        data={data}
        margin={{ bottom: 8, left: 40, right: 40, top: 8 }}
        outerRadius="70%"
      >
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={formatScore} hideIndicator />
          }
          cursor={false}
        />
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Radar
          dataKey="score"
          dot={{ fillOpacity: 1, r: 3 }}
          fill="var(--color-score)"
          fillOpacity={0.22}
          isAnimationActive={false}
          stroke="var(--color-score)"
          strokeWidth={2}
        />
      </RadarChart>
    </ChartContainer>
  );
}
