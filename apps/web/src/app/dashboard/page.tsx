import { findLatestScan } from "@gitflex/db/queries/analysis";
import {
  getUserLanguageOverview,
  listRepositoryAnalysisStates,
  listUserRepositoryTechnologies,
} from "@gitflex/db/queries/insights";
import { listUserRepositories } from "@gitflex/db/queries/repositories";
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
import { redirect } from "next/navigation";

import { categoryLabel } from "@/features/insights/confidence";
import { DomainShareBar } from "@/features/insights/domain-share";
import { isApplicationLanguage } from "@/features/insights/languages";
import { ShareBar } from "@/features/insights/share-bar";
import {
  domainShares,
  summarizeTechnologies,
} from "@/features/insights/technologies";
import type { ScanStatusView } from "@/features/scans/actions";
import { ScanPanel } from "@/features/scans/scan-panel";
import { db, getSession } from "@/server/auth";

const TOP_DOMAINS = 4;
const TOP_TECHNOLOGIES_PER_DOMAIN = 6;

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SeeAll({ href }: { href: Route }) {
  return (
    <Link
      className="text-muted-foreground text-xs hover:text-foreground hover:underline"
      href={href}
    >
      See all
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const [scan, repositories, states, technologyRows, languages] =
    await Promise.all([
      findLatestScan(db, userId),
      listUserRepositories(db, userId),
      listRepositoryAnalysisStates(db, userId),
      listUserRepositoryTechnologies(db, userId),
      getUserLanguageOverview(db, userId),
    ]);

  const scanView: ScanStatusView | null = scan
    ? {
        completed: scan.completedRepositories,
        failed: scan.failedRepositories,
        id: scan.id,
        skipped: scan.skippedRepositories,
        status: scan.status,
        total: scan.totalRepositories,
      }
    : null;
  const summaries = summarizeTechnologies(technologyRows);
  const domains = domainShares(technologyRows, summaries);
  const practices = derivePractices(technologyRows);
  const applicationLanguages = languages.filter(isApplicationLanguage);
  const byCategory = Map.groupBy(summaries, (summary) => summary.category);

  return (
    <div className="grid gap-4">
      <ScanPanel initialScan={scanView} key={`${scan?.id}:${scan?.status}`} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Included repositories"
          value={
            repositories.filter((repository) => repository.included).length
          }
        />
        <Stat
          label="Analyzed"
          value={states.filter((state) => state.status === "completed").length}
        />
        <Stat label="Technologies" value={summaries.length} />
        <Stat label="Languages" value={applicationLanguages.length} />
      </div>

      {applicationLanguages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
            <CardDescription>
              Share of repositories where each language is significant.
            </CardDescription>
            <CardAction>
              <SeeAll href="/dashboard/languages" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ShareBar
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
            <CardTitle>Technologies</CardTitle>
            <CardDescription>
              Most used per domain. Evidence strength is not proficiency.
            </CardDescription>
            <CardAction>
              <SeeAll href="/dashboard/technologies" />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-5">
            <DomainShareBar domains={domains} />
            {domains.slice(0, TOP_DOMAINS).map(({ category }) => (
              <section className="grid gap-2" key={category}>
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
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
                              `/dashboard/technologies/${summary.id}` as Route
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
    </div>
  );
}
