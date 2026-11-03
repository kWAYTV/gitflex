import type { TechnologyUsage } from "@gitflex/db/queries/insights";
import { getTechnology } from "@gitflex/technologies/lookup";
import type { Technology } from "@gitflex/technologies/types";
import { Badge } from "@gitflex/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gitflex/ui/components/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { categoryLabel, USAGE_LABELS } from "@/features/insights/confidence";
import { EvidenceBadge } from "@/features/insights/evidence-badge";
import { EvidenceList } from "@/features/insights/evidence-list";

export function TechnologyDetailView({
  basePath,
  detected,
  repositoryHref,
  technology,
  usage,
}: {
  basePath: string;
  /** Technology IDs detected anywhere in scope, to mark related entries. */
  detected: ReadonlySet<string>;
  /** Per-repository analysis link; omitted where no such page exists. */
  repositoryHref?: (repositoryId: string) => Route;
  technology: Technology;
  usage: TechnologyUsage[];
}) {
  const related = [
    ...new Set([
      ...(technology.prerequisites ?? []),
      ...(technology.related ?? []),
    ]),
  ].flatMap((id) => {
    const entry = getTechnology(id);
    return entry ? [entry] : [];
  });

  return (
    <div className="grid gap-6">
      <Link
        className="inline-flex w-fit items-center gap-1 rounded-sm text-muted-foreground text-sm hover:text-foreground"
        href={`${basePath}/technologies` as Route}
      >
        <ArrowLeft className="size-3.5" /> Technologies
      </Link>

      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-2xl tracking-tight">
            {technology.name}
          </h2>
          <Badge variant="outline">{categoryLabel(technology.category)}</Badge>
          {technology.docsUrl ? (
            <a
              aria-label="Documentation"
              className="rounded-sm text-muted-foreground hover:text-foreground"
              href={technology.docsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {technology.description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            {usage.length === 0
              ? "Not detected in the analyzed repositories."
              : `Detected in ${usage.length} ${usage.length === 1 ? "repository" : "repositories"}. Expand a row to see the evidence.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <Empty className="rounded-lg border">
              <EmptyHeader>
                <EmptyTitle>No evidence</EmptyTitle>
                <EmptyDescription>
                  Related technologies are shown below for exploration only.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border">
              {usage.map((entry) => (
                <li key={entry.repositoryId}>
                  <Collapsible>
                    <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left text-sm hover:bg-muted/50">
                      <ChevronDown className="size-3.5 shrink-0 transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none" />
                      <span className="truncate font-medium">
                        {entry.fullName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {USAGE_LABELS[entry.usageType] ?? entry.usageType}
                      </span>
                      <span className="ml-auto">
                        <EvidenceBadge confidence={entry.confidence} />
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="grid gap-2 px-3 pb-3 pl-8">
                      <EvidenceList evidence={entry.evidence} />
                      {repositoryHref ? (
                        <Link
                          className="w-fit rounded-sm text-muted-foreground text-xs hover:text-foreground hover:underline"
                          href={repositoryHref(entry.repositoryId)}
                        >
                          Repository analysis
                        </Link>
                      ) : null}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {related.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Related technologies</CardTitle>
            <CardDescription>
              From the technology registry. Relationships do not imply usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {related.map((entry) => (
              <Badge
                key={entry.id}
                render={
                  <Link
                    href={`${basePath}/technologies/${entry.id}` as Route}
                  />
                }
                variant={detected.has(entry.id) ? "secondary" : "outline"}
              >
                {entry.name}
                {detected.has(entry.id) ? null : (
                  <span className="text-muted-foreground">(not detected)</span>
                )}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
