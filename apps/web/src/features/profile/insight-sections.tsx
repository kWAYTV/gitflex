import type {
  LanguageOverview,
  RepositoryTechnologyRow,
} from "@gitflex/db/queries/insights";
import { isApplicationLanguage } from "@gitflex/technologies/languages";
import { derivePractices } from "@gitflex/technologies/practices";
import { Badge } from "@gitflex/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import type { Route } from "next";
import Link from "next/link";

import { categoryLabel } from "@/features/insights/confidence";
import { DomainShareBar } from "@/features/insights/domain-share";
import { ShareChart } from "@/features/insights/share-chart";
import {
  domainShares,
  summarizeTechnologies,
} from "@/features/insights/technologies";

const TOP_DOMAINS = 4;
const TOP_TECHNOLOGIES_PER_DOMAIN = 6;

export function SeeAll({ children, href }: { children: string; href: Route }) {
  return (
    <Link
      className="rounded-sm text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      href={href}
    >
      {children}
    </Link>
  );
}

/** Languages, domains, technologies and practices: the body shared by the dashboard and public overviews. */
export function InsightSections({
  basePath,
  languages,
  technologyRows,
}: {
  basePath: string;
  languages: LanguageOverview[];
  technologyRows: RepositoryTechnologyRow[];
}) {
  const summaries = summarizeTechnologies(technologyRows);
  const domains = domainShares(technologyRows, summaries);
  const practices = derivePractices(technologyRows);
  const applicationLanguages = languages.filter(isApplicationLanguage);
  const byCategory = Map.groupBy(summaries, (summary) => summary.category);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {applicationLanguages.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
              <CardDescription>
                Share of repositories where each language is significant.
              </CardDescription>
              <CardAction>
                <SeeAll href={`${basePath}/languages` as Route}>
                  All languages
                </SeeAll>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ShareChart
                limit={6}
                slices={applicationLanguages.map((language) => ({
                  color: language.color,
                  name: language.name,
                  value: language.significantRepositories,
                }))}
              />
            </CardContent>
          </Card>
        ) : null}

        {domains.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Domains</CardTitle>
              <CardDescription>
                Where the detected technologies concentrate.
              </CardDescription>
              <CardAction>
                <SeeAll href={`${basePath}/technologies` as Route}>
                  All technologies
                </SeeAll>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DomainShareBar domains={domains} limit={6} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {domains.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Technologies</CardTitle>
            <CardDescription>
              Most used per domain. Evidence strength is not proficiency.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {domains.slice(0, TOP_DOMAINS).map(({ category }) => (
              <section className="grid content-start gap-2" key={category}>
                <h3 className="font-medium text-muted-foreground text-sm">
                  {categoryLabel(category)}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(byCategory.get(category) ?? [])
                    .slice(0, TOP_TECHNOLOGIES_PER_DOMAIN)
                    .map((summary) => (
                      <Badge
                        key={summary.id}
                        render={
                          <Link
                            href={
                              `${basePath}/technologies/${summary.id}` as Route
                            }
                          />
                        }
                        variant="secondary"
                      >
                        {summary.name}
                        <span className="text-muted-foreground tabular-nums">
                          {summary.repositories}
                        </span>
                      </Badge>
                    ))}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {practices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Engineering practices</CardTitle>
            <CardDescription>
              Repositories showing each practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {practices.map(({ evidence, practice }) => (
              <Badge key={practice.id} variant="outline">
                {practice.name}
                <span className="text-muted-foreground tabular-nums">
                  {evidence.size}
                </span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
