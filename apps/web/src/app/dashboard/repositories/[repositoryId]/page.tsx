import { getRepositoryAnalysis } from "@gitflex/db/queries/insights";
import { Alert, AlertDescription } from "@gitflex/ui/components/alert";
import { Badge } from "@gitflex/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gitflex/ui/components/table";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { categoryLabel, USAGE_LABELS } from "@/features/insights/confidence";
import { EvidenceBadge } from "@/features/insights/evidence-badge";
import { EvidenceList } from "@/features/insights/evidence-list";
import { ShareBar } from "@/features/insights/share-bar";
import { db, getSession } from "@/server/auth";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const MANIFEST_STATUS_VARIANTS: Record<
  string,
  "secondary" | "destructive" | "outline"
> = {
  failed: "destructive",
  parsed: "secondary",
};

export default async function RepositoryAnalysisPage({
  params,
}: {
  params: Promise<{ repositoryId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { repositoryId } = await params;
  if (!z.uuid().safeParse(repositoryId).success) {
    notFound();
  }

  const analysis = await getRepositoryAnalysis(
    db,
    session.user.id,
    repositoryId
  );
  if (analysis === null) {
    notFound();
  }

  const back = (
    <Link
      className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      href="/dashboard/repositories"
    >
      <ArrowLeft className="size-3.5" /> Repositories
    </Link>
  );

  if (analysis === "not-analyzed") {
    return (
      <div className="grid gap-4">
        {back}
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Not analyzed yet</EmptyTitle>
            <EmptyDescription>
              Include this repository and run a scan from the overview.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const { summary } = analysis;
  const manifests = summary?.manifests ?? [];
  const failedStages = Object.entries(summary?.stages ?? {}).filter(
    ([, stage]) => stage.status === "failed"
  );

  return (
    <div className="grid gap-4">
      {back}
      <div>
        <h2 className="inline-flex items-center gap-2 font-bold text-2xl">
          {analysis.repository.fullName}
          <a
            aria-label="Open on GitHub"
            className="text-muted-foreground hover:text-foreground"
            href={analysis.repository.htmlUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-4" />
          </a>
        </h2>
        <p className="text-muted-foreground text-sm">
          {analysis.analyzedAt
            ? `Analyzed ${dateFormatter.format(analysis.analyzedAt)}`
            : "Analyzed"}
          {analysis.commitSha ? ` at ${analysis.commitSha.slice(0, 7)}` : ""}
          {` · analyzer ${analysis.analyzerVersion}`}
          {summary
            ? ` · ${summary.files.analyzed} of ${summary.files.total} files analyzed`
            : ""}
          {summary?.files.truncated ? " (file list truncated)" : ""}
        </p>
      </div>

      {failedStages.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            Incomplete analysis: {failedStages.map(([name]) => name).join(", ")}{" "}
            failed.
          </AlertDescription>
        </Alert>
      ) : null}

      {analysis.languages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareBar
              slices={analysis.languages.map((language) => ({
                color: language.color,
                name: language.name,
                value: language.bytes,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>
            Every detection lists the evidence it is based on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.technologies.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No technologies detected. Repositories without dependency
              manifests or configuration files only report languages for now.
            </p>
          ) : (
            <ul className="divide-y border">
              {analysis.technologies.map((technology) => (
                <li className="grid gap-1.5 p-3" key={technology.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-medium hover:underline"
                      href={`/dashboard/technologies/${technology.id}` as Route}
                    >
                      {technology.name}
                    </Link>
                    <Badge variant="outline">
                      {categoryLabel(technology.category)}
                    </Badge>
                    <span className="ml-auto">
                      <EvidenceBadge confidence={technology.confidence} />
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {USAGE_LABELS[technology.usageType] ?? technology.usageType}
                    {technology.evidenceCount > technology.evidence.length
                      ? ` · showing ${technology.evidence.length} of ${technology.evidenceCount} signals`
                      : ""}
                  </p>
                  <EvidenceList evidence={technology.evidence} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {manifests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Manifests</CardTitle>
            <CardDescription>
              {analysis.dependencies.length} declared dependencies across{" "}
              {
                manifests.filter((manifest) => manifest.status === "parsed")
                  .length
              }{" "}
              parsed manifests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Dependencies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manifests.map((manifest) => (
                  <TableRow key={manifest.path}>
                    <TableCell>
                      <code>{manifest.path}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {manifest.type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        title={manifest.error}
                        variant={
                          MANIFEST_STATUS_VARIANTS[manifest.status] ?? "outline"
                        }
                      >
                        {manifest.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {manifest.status === "parsed"
                        ? manifest.dependencyCount
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
