"use client";

import type { UserRepository } from "@gitflex/db/queries/repositories";
import { Badge } from "@gitflex/ui/components/badge";
import { Button } from "@gitflex/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import { Input } from "@gitflex/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gitflex/ui/components/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@gitflex/ui/components/toggle-group";
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
import type { RepositoryInsight } from "./insights";
import { RepositoryRow } from "./repository-row";

const ANY = "__any__";

type Bucket =
  | "all"
  | "analyzed"
  | "failed"
  | "skipped"
  | "not-analyzed"
  | "forks"
  | "collaborations"
  | "excluded";

const BUCKETS: { label: string; value: Bucket }[] = [
  { label: "All", value: "all" },
  { label: "Analyzed", value: "analyzed" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
  { label: "Not analyzed", value: "not-analyzed" },
  { label: "Forks", value: "forks" },
  { label: "Collaborations", value: "collaborations" },
  { label: "Excluded", value: "excluded" },
];

function inBucket(
  repository: UserRepository,
  insight: RepositoryInsight | undefined,
  bucket: Bucket
): boolean {
  const status = insight?.status ?? "not-analyzed";
  switch (bucket) {
    case "all":
      return true;
    case "analyzed":
    case "failed":
    case "skipped":
      return status === bucket;
    case "not-analyzed":
      return status === "not-analyzed" || status === "pending";
    case "forks":
      return repository.isFork;
    case "collaborations":
      return repository.ownership !== "owner";
    case "excluded":
      return !repository.included;
    default:
      return true;
  }
}

function optionsFrom(values: Iterable<string>) {
  return [...new Set(values)]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
}

export function RepositoryManager({
  insights,
  repositories,
}: {
  insights: Record<string, RepositoryInsight>;
  repositories: UserRepository[];
}) {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [language, setLanguage] = useState(ANY);
  const [technology, setTechnology] = useState(ANY);
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

  const languageOptions = useMemo(
    () =>
      optionsFrom(
        Object.values(insights).flatMap((insight) =>
          insight.languages.map((entry) => entry.name)
        )
      ),
    [insights]
  );
  const technologyOptions = useMemo(
    () =>
      optionsFrom(
        Object.values(insights).flatMap((insight) =>
          insight.technologies.map((entry) => entry.name)
        )
      ),
    [insights]
  );

  const bucketCounts = useMemo(
    () =>
      new Map(
        BUCKETS.map(({ value }) => [
          value,
          optimisticRepositories.filter((repository) =>
            inBucket(repository, insights[repository.id], value)
          ).length,
        ])
      ),
    [insights, optimisticRepositories]
  );

  const visibleRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return optimisticRepositories.filter((repository) => {
      const insight = insights[repository.id];
      return (
        inBucket(repository, insight, bucket) &&
        (language === ANY ||
          (insight?.languages.some((entry) => entry.name === language) ??
            false)) &&
        (technology === ANY ||
          (insight?.technologies.some((entry) => entry.name === technology) ??
            false)) &&
        (normalizedQuery === "" ||
          repository.fullName.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [bucket, insights, language, optimisticRepositories, query, technology]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
    []
  );
  const handleBucketChange = useCallback((value: string[]) => {
    const [next] = value;
    if (next) {
      setBucket(next as Bucket);
    }
  }, []);
  const handleLanguageChange = useCallback(
    (value: string | null) => setLanguage(value ?? ANY),
    []
  );
  const handleTechnologyChange = useCallback(
    (value: string | null) => setTechnology(value ?? ANY),
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
          <h2 className="font-bold text-xl">Repositories</h2>
          <p className="text-muted-foreground text-sm">
            {repositories.length === 0
              ? "Import your repositories from GitHub to choose what your profile is built from."
              : `${repositories.length} discovered, ${includedCount} included, ${bucketCounts.get("analyzed") ?? 0} analyzed`}
          </p>
        </div>
        <Button disabled={isSyncing} onClick={sync}>
          <RefreshCw
            className={
              isSyncing ? "animate-spin motion-reduce:animate-none" : undefined
            }
          />
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
          <ToggleGroup
            aria-label="Repository status"
            className="flex-wrap"
            onValueChange={handleBucketChange}
            size="sm"
            value={[bucket]}
            variant="outline"
          >
            {BUCKETS.map((entry) => (
              <ToggleGroupItem key={entry.value} value={entry.value}>
                {entry.label}
                <Badge className="tabular-nums" variant="secondary">
                  {bucketCounts.get(entry.value) ?? 0}
                </Badge>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Search repositories"
              className="max-w-xs"
              onChange={handleQueryChange}
              placeholder="Search by name"
              value={query}
            />
            <Select
              items={[
                { label: "Any language", value: ANY },
                ...languageOptions,
              ]}
              onValueChange={handleLanguageChange}
              value={language}
            >
              <SelectTrigger aria-label="Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any language</SelectItem>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={[
                { label: "Any technology", value: ANY },
                ...technologyOptions,
              ]}
              onValueChange={handleTechnologyChange}
              value={technology}
            >
              <SelectTrigger aria-label="Technology">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any technology</SelectItem>
                {technologyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button onClick={includeVisible} size="sm" variant="outline">
                Include shown
              </Button>
              <Button onClick={excludeVisible} size="sm" variant="outline">
                Exclude shown
              </Button>
            </div>
          </div>

          <ul className="divide-y overflow-hidden rounded-lg border">
            {visibleRepositories.map((repository) => (
              <RepositoryRow
                insight={insights[repository.id]}
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
