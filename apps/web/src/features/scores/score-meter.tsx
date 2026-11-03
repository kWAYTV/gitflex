import { Progress } from "@gitflex/ui/components/progress";
import { cn } from "@gitflex/ui/lib/utils";

/** A 0-100 score as a bar; unknown scores render as an empty dashed track rather than zero. */
export function ScoreMeter({
  className,
  label,
  score,
}: {
  className?: string;
  label: string;
  score: number | null;
}) {
  if (score === null) {
    return (
      <div
        aria-label={`${label}: unknown`}
        className={cn(
          "h-1 w-full border-muted-foreground/40 border-t border-dashed",
          className
        )}
        role="img"
      />
    );
  }
  return (
    <Progress
      aria-label={label}
      className={className}
      value={Math.round(score)}
    />
  );
}
