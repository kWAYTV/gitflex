"use client";

import type { UserRepository } from "@gitflex/db/queries/repositories";
import { Button } from "@gitflex/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import { Input } from "@gitflex/ui/components/input";
import { RefreshCw } from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import {
  setRepositoryInclusionAction,
  syncRepositoriesAction,
} from "./actions";
import { RepositoryRow } from "./repository-row";

type OwnershipFilter = "all" | UserRepository["ownership"] | "fork";

const OWNERSHIP_FILTERS: { label: string; value: OwnershipFilter }[] = [
  { label: "All", value: "all" },
  { label: "Owned", value: "owner" },
  { label: "Forks", value: "fork" },
  { label: "Organizations", value: "organization" },
  { label: "Collaborations", value: "collaborator" },
];

function matchesOwnership(repository: UserRepository, filter: OwnershipFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "fork") {
    return repository.isFork;
  }
  return repository.ownership === filter && !repository.isFork;
}

function FilterButton({
  active,
  label,
  onSelect,
  value,
}: {
  active: boolean;
  label: string;
  onSelect: (value: OwnershipFilter) => void;
  value: OwnershipFilter;
}) {
  const handleClick = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant={active ? "secondary" : "ghost"}
    >
      {label}
    </Button>
  );
}

export function RepositoryManager({
  repositories,
}: {
  repositories: UserRepository[];
}) {
  const [query, setQuery] = useState("");
  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>("all");
  const [isSyncing, startSync] = useTransition();
  const [, startInclusionUpdate] = useTransition();
  const [optimisticRepositories, applyInclusion] = useOptimistic(
    repositories,
    (current, update: { ids: ReadonlySet<string>; included: boolean }) =>
      current.map((repository) =>
        update.ids.has(repository.id)
          ? { ...repository, included: update.included }
          : repository
      )
  );

  const visibleRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return optimisticRepositories.filter(
      (repository) =>
        matchesOwnership(repository, ownershipFilter) &&
        (normalizedQuery === "" ||
          repository.fullName.toLowerCase().includes(normalizedQuery) ||
          repository.primaryLanguage?.toLowerCase().includes(normalizedQuery))
    );
  }, [optimisticRepositories, ownershipFilter, query]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
    []
  );

  const includedCount = optimisticRepositories.filter(
    (repository) => repository.included
  ).length;

  const sync = useCallback(() => {
    startSync(async () => {
      const result = await syncRepositoriesAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const { discovered, removed, truncated } = result.data;
      toast.success(
        `Found ${discovered} repositories${removed > 0 ? `, ${removed} no longer accessible` : ""}`
      );
      if (truncated) {
        toast.warning(
          "Repository limit reached; some repositories were not imported."
        );
      }
    });
  }, []);

  const setInclusion = useCallback(
    (ids: string[], included: boolean) => {
      if (ids.length === 0) {
        return;
      }
      startInclusionUpdate(async () => {
        applyInclusion({ ids: new Set(ids), included });
        const result = await setRepositoryInclusionAction({
          included,
          repositoryIds: ids,
        });
        if (!result.ok) {
          toast.error(result.message);
        }
      });
    },
    [applyInclusion]
  );

  const includeVisible = useCallback(
    () =>
      setInclusion(
        visibleRepositories.map((repository) => repository.id),
        true
      ),
    [setInclusion, visibleRepositories]
  );
  const excludeVisible = useCallback(
    () =>
      setInclusion(
        visibleRepositories.map((repository) => repository.id),
        false
      ),
    [setInclusion, visibleRepositories]
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">Repositories</h1>
          <p className="text-muted-foreground text-sm">
            {repositories.length === 0
              ? "Import your repositories from GitHub to choose what your profile is built from."
              : `${includedCount} of ${repositories.length} repositories included in your profile`}
          </p>
        </div>
        <Button disabled={isSyncing} onClick={sync}>
          <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
          {isSyncing ? "Syncing..." : "Sync from GitHub"}
        </Button>
      </div>

      {repositories.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No repositories yet</EmptyTitle>
            <EmptyDescription>
              Sync from GitHub to discover the repositories you own, contribute
              to, or access through organizations.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Search repositories"
              className="max-w-xs"
              onChange={handleQueryChange}
              placeholder="Search by name or language"
              value={query}
            />
            {OWNERSHIP_FILTERS.map((filter) => (
              <FilterButton
                active={ownershipFilter === filter.value}
                key={filter.value}
                label={filter.label}
                onSelect={setOwnershipFilter}
                value={filter.value}
              />
            ))}
            <div className="ml-auto flex gap-2">
              <Button onClick={includeVisible} size="sm" variant="outline">
                Include shown
              </Button>
              <Button onClick={excludeVisible} size="sm" variant="outline">
                Exclude shown
              </Button>
            </div>
          </div>

          <ul className="divide-y border">
            {visibleRepositories.map((repository) => (
              <RepositoryRow
                key={repository.id}
                onInclusionChange={setInclusion}
                repository={repository}
              />
            ))}
            {visibleRepositories.length === 0 && (
              <li className="p-4 text-center text-muted-foreground text-sm">
                No repositories match the current filters.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
