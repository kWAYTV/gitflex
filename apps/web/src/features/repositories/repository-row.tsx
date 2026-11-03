"use client";

import type { UserRepository } from "@gitflex/db/queries/repositories";
import { Badge } from "@gitflex/ui/components/badge";
import { Checkbox } from "@gitflex/ui/components/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gitflex/ui/components/tooltip";
import { Archive, GitFork, Lock, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback } from "react";

import type { AnalysisStatus, RepositoryInsight } from "./insights";

const OWNERSHIP_LABELS: Record<UserRepository["ownership"], string> = {
  collaborator: "Collaborator",
  organization: "Organization",
  owner: "Owner",
};

const STATUS_BADGES: Record<
  AnalysisStatus,
  { label: string; variant: "secondary" | "destructive" | "outline" }
> = {
  analyzed: { label: "Analyzed", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  "not-analyzed": { label: "Not analyzed", variant: "outline" },
  pending: { label: "In progress", variant: "outline" },
  skipped: { label: "Skipped", variant: "outline" },
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function StatusBadge({ insight }: { insight: RepositoryInsight | undefined }) {
  const status = insight?.status ?? "not-analyzed";
  const { label, variant } = STATUS_BADGES[status];
  if (!insight?.message) {
    return <Badge variant={variant}>{label}</Badge>;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant={variant} />}>
        {label}
      </TooltipTrigger>
      <TooltipContent>{insight.message}</TooltipContent>
    </Tooltip>
  );
}

export function RepositoryRow({
  insight,
  repository,
  onInclusionChange,
}: {
  insight: RepositoryInsight | undefined;
  repository: UserRepository;
  onInclusionChange: (ids: string[], included: boolean) => void;
}) {
  const handleChange = useCallback(
    (checked: boolean) => onInclusionChange([repository.id], checked),
    [onInclusionChange, repository.id]
  );
  const languages = insight?.languages ?? [];
  const technologies = insight?.technologies ?? [];

  return (
    <li className="flex items-start gap-3 p-3">
      <Checkbox
        aria-label={`Include ${repository.fullName}`}
        checked={repository.included}
        className="mt-1"
        disabled={repository.isDisabled}
        onCheckedChange={handleChange}
      />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="truncate font-medium hover:underline"
            href={`/dashboard/repositories/${repository.id}` as Route}
          >
            {repository.fullName}
          </Link>
          <StatusBadge insight={insight} />
          {repository.visibility === "public" ? null : (
            <Badge variant="outline">
              <Lock /> {repository.visibility}
            </Badge>
          )}
          {repository.isArchived ? (
            <Badge variant="outline">
              <Archive /> Archived
            </Badge>
          ) : null}
          {repository.ownership === "owner" ? null : (
            <Badge variant="outline">
              {OWNERSHIP_LABELS[repository.ownership]}
            </Badge>
          )}
        </div>
        {repository.isFork && repository.parentFullName !== null ? (
          <p className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <GitFork className="size-3" /> Forked from{" "}
            {repository.parentFullName}
          </p>
        ) : null}
        {repository.description ? (
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {repository.description}
          </p>
        ) : null}
        {technologies.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {technologies.map((technology) => (
              <Badge
                key={technology.id}
                render={
                  <Link
                    href={`/dashboard/technologies/${technology.id}` as Route}
                  />
                }
                variant="secondary"
              >
                {technology.name}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
          {languages.length > 0
            ? languages.map((language) => (
                <span
                  className="inline-flex items-center gap-1"
                  key={language.name}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        language.color ?? "var(--muted-foreground)",
                    }}
                  />
                  {language.name}
                </span>
              ))
            : repository.primaryLanguage && (
                <span>{repository.primaryLanguage}</span>
              )}
          <span className="inline-flex items-center gap-1">
            <Star className="size-3" /> {repository.stars}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="size-3" /> {repository.forks}
          </span>
          {repository.pushedAt ? (
            <span>Pushed {dateFormatter.format(repository.pushedAt)}</span>
          ) : null}
          <a
            className="underline-offset-2 hover:text-foreground hover:underline"
            href={repository.htmlUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </div>
    </li>
  );
}
