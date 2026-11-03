import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gitflex/ui/components/tooltip";

const FALLBACK_COLOR = "var(--muted-foreground)";

export interface ShareSlice {
  color: string | null;
  name: string;
  value: number;
}

/** Stacked share bar with a legend; slices below 1% are folded into "Other". */
export function ShareBar({ slices: input }: { slices: ShareSlice[] }) {
  const total = input.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return null;
  }
  const visible = input
    .filter((slice) => slice.value / total >= 0.01)
    .toSorted((a, b) => b.value - a.value);
  const otherValue =
    total - visible.reduce((sum, slice) => sum + slice.value, 0);
  const slices =
    otherValue > 0
      ? [...visible, { color: null, name: "Other", value: otherValue }]
      : visible;
  const share = (value: number) => `${((value / total) * 100).toFixed(1)}%`;

  return (
    <div className="grid gap-3">
      <div className="flex h-2 w-full overflow-hidden">
        {slices.map((slice) => (
          <Tooltip key={slice.name}>
            <TooltipTrigger
              render={
                <div
                  style={{
                    backgroundColor: slice.color ?? FALLBACK_COLOR,
                    width: share(slice.value),
                  }}
                />
              }
            />
            <TooltipContent>
              {slice.name} · {share(slice.value)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {slices.map((slice) => (
          <li className="inline-flex items-center gap-1.5" key={slice.name}>
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: slice.color ?? FALLBACK_COLOR }}
            />
            <span>{slice.name}</span>
            <span className="text-muted-foreground text-xs">
              {share(slice.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
