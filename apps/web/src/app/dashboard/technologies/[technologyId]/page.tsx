import {
  getUserTechnologyUsage,
  listUserRepositoryTechnologies,
} from "@gitflex/db/queries/insights";
import { getTechnology } from "@gitflex/technologies/lookup";
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
import { notFound, redirect } from "next/navigation";

import { categoryLabel, USAGE_LABELS } from "@/features/insights/confidence";
import { EvidenceBadge } from "@/features/insights/evidence-badge";
import { EvidenceList } from "@/features/insights/evidence-list";
import { db, getSession } from "@/server/auth";

export default async function TechnologyPage({
  params,
}: {
  params: Promise<{ technologyId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { technologyId } = await params;
  const technology = getTechnology(technologyId);
  if (!technology) {
    notFound();
  }

  const [usage, detections] = await Promise.all([
    getUserTechnologyUsage(db, session.user.id, technology.id),
    listUserRepositoryTechnologies(db, session.user.id),
  ]);
  const detected = new Set(detections.map((row) => row.technologyId));
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
    <div className="grid gap-4">
      <Link
        className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        href="/dashboard/technologies"
      >
        <ArrowLeft className="size-3.5" /> Technologies
      </Link>

      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-2xl">{technology.name}</h2>
          <Badge variant="outline">{categoryLabel(technology.category)}</Badge>
          {technology.docsUrl ? (
            <a
              aria-label="Documentation"
              className="text-muted-foreground hover:text-foreground"
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
              ? "Not detected in your analyzed repositories."
              : `Detected in ${usage.length} ${usage.length === 1 ? "repository" : "repositories"}. Expand a row to see the evidence.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No evidence</EmptyTitle>
                <EmptyDescription>
                  Related technologies are shown below for exploration only.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y border">
              {usage.map((entry) => (
                <li key={entry.repositoryId}>
                  <Collapsible>
                    <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left text-sm hover:bg-muted/50">
                      <ChevronDown className="size-3.5 shrink-0 transition-transform group-data-panel-open:rotate-180" />
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
                      <Link
                        className="text-muted-foreground text-xs hover:text-foreground hover:underline"
                        href={
                          `/dashboard/repositories/${entry.repositoryId}` as Route
                        }
                      >
                        Repository analysis
                      </Link>
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
                  <Link href={`/dashboard/technologies/${entry.id}` as Route} />
                }
                variant={detected.has(entry.id) ? "secondary" : "outline"}
              >
                {entry.name}
                {detected.has(entry.id) ? null : (
                  <span className="text-muted-foreground">· not detected</span>
                )}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
