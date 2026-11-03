"use client";

import type { UserRepository } from "@gitflex/db/queries/repositories";
import { Checkbox } from "@gitflex/ui/components/checkbox";
import { Archive, GitFork, Lock, Star } from "lucide-react";
import { useCallback } from "react";

const OWNERSHIP_LABELS: Record<UserRepository["ownership"], string> = {
  collaborator: "Collaborator",
  organization: "Organization",
  owner: "Owner",
};

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function RepositoryRow({
  repository,
  onInclusionChange,
}: {
  repository: UserRepository;
  onInclusionChange: (ids: string[], included: boolean) => void;
}) {
  const handleChange = useCallback(
    (checked: boolean) => onInclusionChange([repository.id], checked),
    [onInclusionChange, repository.id]
  );

  return (
    <li className="flex items-start gap-3 p-3">
      <Checkbox
        aria-label={`Include ${repository.fullName}`}
        checked={repository.included}
        className="mt-1"
        disabled={repository.isDisabled}
        onCheckedChange={handleChange}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            className="truncate font-medium hover:underline"
            href={repository.htmlUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {repository.fullName}
          </a>
          {repository.visibility !== "public" && (
            <Lock
              aria-label={repository.visibility}
              className="size-3.5 text-muted-foreground"
            />
          )}
          {repository.isArchived ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
              <Archive className="size-3.5" /> Archived
            </span>
          ) : null}
          <span className="text-muted-foreground text-xs">
            {OWNERSHIP_LABELS[repository.ownership]}
          </span>
        </div>
        {repository.isFork && repository.parentFullName !== null ? (
          <p className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <GitFork className="size-3" /> Forked from{" "}
            {repository.parentFullName}
          </p>
        ) : null}
        {repository.description ? (
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
            {repository.description}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground text-xs">
          {repository.primaryLanguage ? (
            <span>{repository.primaryLanguage}</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Star className="size-3" /> {repository.stars}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork className="size-3" /> {repository.forks}
          </span>
          {repository.pushedAt ? (
            <span>Pushed {dateFormatter.format(repository.pushedAt)}</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
