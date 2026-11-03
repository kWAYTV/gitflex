import { findLatestScan } from "@gitflex/db/queries/analysis";
import {
  getUserLanguageOverview,
  listRepositoryAnalysisStates,
  listUserRepositoryTechnologies,
} from "@gitflex/db/queries/insights";
import { listUserRepositories } from "@gitflex/db/queries/repositories";
import { findLatestProfileSnapshot } from "@gitflex/db/queries/scoring";
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
import { redirect } from "next/navigation";
import { categoryLabel } from "@/features/insights/confidence";
import { DomainShareBar } from "@/features/insights/domain-share";
import { ShareChart } from "@/features/insights/share-chart";
import {
  domainShares,
  summarizeTechnologies,
} from "@/features/insights/technologies";
import type { ScanStatusView } from "@/features/scans/actions";
import { ScanPanel } from "@/features/scans/scan-panel";
import { ScoreSummary } from "@/features/scores/score-summary";
import { db, getSession } from "@/server/auth";

const TOP_DOMAINS = 4;
const TOP_TECHNOLOGIES_PER_DOMAIN = 6;

function Stats({ items }: { items: { label: string; value: number }[] }) {
  return (
    <Card size="sm">
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
          {items.map((item) => (
            <div
              className="grid gap-1 border-l px-4 first:border-l-0 first:pl-0 max-sm:nth-3:border-l-0 max-sm:nth-3:pl-0"
              key={item.label}
            >
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="font-semibold text-3xl tabular-nums tracking-tight">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function SeeAll({ children, href }: { children: string; href: Route }) {
  return (
    <Link
      className="rounded-sm text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      href={href}
    >
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const [scan, repositories, states, technologyRows, languages, snapshot] =
    await Promise.all([
      findLatestScan(db, userId),
      listUserRepositories(db, userId),
      listRepositoryAnalysisStates(db, userId),
      listUserRepositoryTechnologies(db, userId),
      getUserLanguageOverview(db, userId),
      findLatestProfileSnapshot(db, userId),
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
    <div className="grid gap-6">
      <ScanPanel initialScan={scanView} key={`${scan?.id}:${scan?.status}`} />

      {snapshot ? (
        <ScoreSummary
          action={<SeeAll href="/dashboard/score">Breakdown</SeeAll>}
          score={snapshot.breakdown}
        />
      ) : null}

      <Stats
        items={[
          {
            label: "Included repositories",
            value: repositories.filter((repository) => repository.included)
              .length,
          },
          {
            label: "Analyzed",
            value: states.filter((state) => state.status === "completed")
              .length,
          },
          { label: "Technologies", value: summaries.length },
          { label: "Languages", value: applicationLanguages.length },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {applicationLanguages.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
              <CardDescription>
                Share of repositories where each language is significant.
              </CardDescription>
              <CardAction>
                <SeeAll href="/dashboard/languages">All languages</SeeAll>
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
                Where your detected technologies concentrate.
              </CardDescription>
              <CardAction>
                <SeeAll href="/dashboard/technologies">All technologies</SeeAll>
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
