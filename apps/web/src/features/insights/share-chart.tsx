"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gitflex/ui/components/chart";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

const FALLBACK_COLOR = "var(--muted-foreground)";
const ROW_HEIGHT = 32;
const OTHER = "Other";

const formatPercent = (value: unknown) => `${value}%`;

export interface ShareSlice {
  color: string | null;
  name: string;
  value: number;
}

const chartConfig = {
  share: { label: "Share" },
} satisfies ChartConfig;

/** Horizontal share bars; anything past `limit` or below 1% folds into "Other". */
export function ShareChart({
  limit = 8,
  slices: input,
}: {
  limit?: number;
  slices: ShareSlice[];
}) {
  const total = input.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return null;
  }
  const visible = input
    .filter((slice) => slice.name !== OTHER && slice.value / total >= 0.01)
    .toSorted((a, b) => b.value - a.value)
    .slice(0, limit);
  const otherValue =
    total - visible.reduce((sum, slice) => sum + slice.value, 0);
  const slices =
    otherValue > 0
      ? [...visible, { color: null, name: OTHER, value: otherValue }]
      : visible;
  const data = slices.map((slice) => ({
    fill: slice.color ?? FALLBACK_COLOR,
    name: slice.name,
    share: Math.round((slice.value / total) * 1000) / 10,
  }));

  return (
    <ChartContainer
      className="aspect-auto w-full"
      config={chartConfig}
      style={{ height: data.length * ROW_HEIGHT + 8 }}
    >
      <BarChart
        accessibilityLayer
        barCategoryGap={6}
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 48 }}
      >
        <XAxis dataKey="share" hide type="number" />
        <YAxis
          axisLine={false}
          dataKey="name"
          tick={{ fill: "var(--foreground)", fontSize: 13 }}
          tickLine={false}
          type="category"
          width={112}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={formatPercent} hideIndicator />
          }
          cursor={false}
        />
        <Bar dataKey="share" isAnimationActive={false} radius={4}>
          {data.map((entry) => (
            <Cell fill={entry.fill} key={entry.name} />
          ))}
          <LabelList
            className="fill-muted-foreground tabular-nums"
            dataKey="share"
            fontSize={12}
            formatter={formatPercent}
            position="right"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
