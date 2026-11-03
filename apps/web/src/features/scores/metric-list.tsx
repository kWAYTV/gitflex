import type { MetricResult, RepositoryEvidence } from "@gitflex/scoring/types";
import { Badge } from "@gitflex/ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gitflex/ui/components/collapsible";
import { ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { ScoreMeter } from "./score-meter";

const REPOSITORIES_PER_GROUP = 8;

const ASSESSMENT_LABELS = {
  negative: "Gap",
  neutral: "Partial",
  positive: "Strength",
  unknown: "Unknown",
} as const;

const ASSESSMENT_VARIANTS = {
  negative: "destructive",
  neutral: "outline",
  positive: "secondary",
  unknown: "ghost",
} as const;

function RepositoryGroup({
  repositories,
  title,
}: {
  repositories: readonly RepositoryEvidence[];
  title: string;
}) {
  if (repositories.length === 0) {
    return null;
  }
  const hidden = repositories.length - REPOSITORIES_PER_GROUP;
  return (
    <div className="grid gap-1.5">
      <h4 className="text-muted-foreground text-xs">
        {title} · {repositories.length}
      </h4>
      <ul className="flex flex-wrap gap-1.5">
        {repositories.slice(0, REPOSITORIES_PER_GROUP).map((repository) => (
          <li key={repository.repositoryId}>
            <Badge
              render={
                <Link
                  href={
                    `/dashboard/repositories/${repository.repositoryId}` as Route
                  }
                />
              }
              variant="outline"
            >
              {repository.fullName.split("/").at(-1)}
            </Badge>
          </li>
        ))}
        {hidden > 0 ? (
          <li className="self-center text-muted-foreground text-xs">
            and {hidden} more
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function MetricRow({ metric }: { metric: MetricResult }) {
  const meets = metric.repositories.filter((entry) => entry.value >= 0.5);
  const missing = metric.repositories.filter((entry) => entry.value < 0.5);
  const header = (
    <>
      <div className="grid min-w-0 gap-0.5">
        <span className="font-medium text-sm">{metric.label}</span>
        <span className="text-muted-foreground text-xs">{metric.summary}</span>
      </div>
      <ScoreMeter
        className="hidden w-32 sm:flex"
        label={metric.label}
        score={metric.score}
      />
      <span className="w-10 text-right text-sm tabular-nums">
        {metric.score === null ? "–" : Math.round(metric.score)}
      </span>
      <Badge
        className="hidden w-18 justify-center sm:inline-flex"
        variant={ASSESSMENT_VARIANTS[metric.assessment]}
      >
        {ASSESSMENT_LABELS[metric.assessment]}
      </Badge>
    </>
  );
  const layout =
    "grid w-full grid-cols-[1rem_1fr_auto] items-center gap-3 p-3 text-left sm:grid-cols-[1rem_1fr_8rem_2.5rem_4.5rem]";

  if (metric.repositories.length === 0) {
    return (
      <div className={layout}>
        <span />
        {header}
      </div>
    );
  }
  return (
    <Collapsible>
      <CollapsibleTrigger
        className={`group cursor-pointer outline-none hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring ${layout}`}
        nativeButton={false}
        render={<div />}
      >
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
        {header}
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-3 px-3 pb-3 pl-10">
        <p className="text-muted-foreground text-xs">{metric.description}</p>
        <RepositoryGroup repositories={meets} title="Meets" />
        <RepositoryGroup repositories={missing} title="Missing" />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MetricList({ metrics }: { metrics: readonly MetricResult[] }) {
  return (
    <ul className="divide-y border">
      {metrics.map((metric) => (
        <li key={metric.id}>
          <MetricRow metric={metric} />
        </li>
      ))}
    </ul>
  );
}
