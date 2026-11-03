import { Badge } from "@gitflex/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gitflex/ui/components/tooltip";

import { confidenceLevel } from "./labels";

const VARIANTS = {
  High: "secondary",
  Low: "outline",
  Medium: "outline",
} as const;

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidenceLevel(confidence);
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant={VARIANTS[level]} />}>
        {level} confidence
      </TooltipTrigger>
      <TooltipContent>
        {Math.round(confidence * 100)}% of the weighted evidence is measured.
        Missing evidence lowers confidence, not the score.
      </TooltipContent>
    </Tooltip>
  );
}
