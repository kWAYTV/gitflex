import { Badge } from "@gitflex/ui/components/badge";
import { GitFork, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PublicEmpty } from "@/features/profile/public-empty";
import { requirePublicProfile } from "@/server/public-profile";

const TECHNOLOGIES_PER_REPOSITORY = 6;
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function PublicRepositoriesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { owner, repositories, technologies } =
    await requirePublicProfile(params);
  if (repositories.length === 0) {
    return (
      <PublicEmpty title="No public repositories">
        This profile has no public repositories selected for analysis.
      </PublicEmpty>
    );
  }

  const basePath = `/u/${owner.username}`;
  const byRepository = Map.groupBy(technologies, (row) => row.repositoryId);

  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {repositories.map((repository) => {
        const detected = (byRepository.get(repository.id) ?? []).toSorted(
          (a, b) => b.confidence - a.confidence
        );
        return (
          <li className="grid gap-2 p-4" key={repository.id}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <a
                className="font-medium hover:underline"
                href={repository.htmlUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {repository.fullName.split("/").at(-1)}
              </a>
              {repository.isFork ? <Badge variant="outline">Fork</Badge> : null}
              {repository.analyzed ? null : (
                <Badge variant="ghost">Not analyzed</Badge>
              )}
              <span className="ml-auto flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
                {repository.primaryLanguage ? (
                  <span>{repository.primaryLanguage}</span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Star aria-label="Stars" className="size-3" />
                  {repository.stars}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitFork aria-label="Forks" className="size-3" />
                  {repository.forks}
                </span>
                {repository.pushedAt ? (
                  <span>
                    Pushed {dateFormatter.format(repository.pushedAt)}
                  </span>
                ) : null}
              </span>
            </div>
            {repository.description ? (
              <p className="max-w-prose text-muted-foreground text-sm">
                {repository.description}
              </p>
            ) : null}
            {detected.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {detected.slice(0, TECHNOLOGIES_PER_REPOSITORY).map((row) => (
                  <Badge
                    key={row.technologyId}
                    render={
                      <Link
                        href={
                          `${basePath}/technologies/${row.technologyId}` as Route
                        }
                      />
                    }
                    variant="secondary"
                  >
                    {row.name}
                  </Badge>
                ))}
                {detected.length > TECHNOLOGIES_PER_REPOSITORY ? (
                  <span className="self-center text-muted-foreground text-xs">
                    and {detected.length - TECHNOLOGIES_PER_REPOSITORY} more
                  </span>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
