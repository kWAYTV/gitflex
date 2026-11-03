import { Badge } from "@gitflex/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gitflex/ui/components/tooltip";

import { evidenceStrength } from "./confidence";

function variantFor(confidence: number) {
  if (confidence >= 0.9) {
    return "default";
  }
  if (confidence >= 0.6) {
    return "secondary";
  }
  return "outline";
}

export function EvidenceBadge({ confidence }: { confidence: number }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant={variantFor(confidence)} />}>
        {evidenceStrength(confidence)}
      </TooltipTrigger>
      <TooltipContent>Confidence {confidence.toFixed(2)}</TooltipContent>
    </Tooltip>
  );
}
