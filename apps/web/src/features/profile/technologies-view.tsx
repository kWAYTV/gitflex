import type { RepositoryTechnologyRow } from "@gitflex/db/queries/insights";
import { getTechnology } from "@gitflex/technologies/lookup";
import { derivePractices } from "@gitflex/technologies/practices";
import { Badge } from "@gitflex/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gitflex/ui/components/table";
import type { Route } from "next";
import Link from "next/link";

import { categoryLabel } from "@/features/insights/confidence";
import { DomainShareBar } from "@/features/insights/domain-share";
import { EvidenceBadge } from "@/features/insights/evidence-badge";
import {
  domainShares,
  groupByCategory,
  summarizeTechnologies,
} from "@/features/insights/technologies";

export function TechnologiesView({
  basePath,
  rows,
}: {
  basePath: string;
  rows: RepositoryTechnologyRow[];
}) {
  const summaries = summarizeTechnologies(rows);
  const domains = domainShares(rows, summaries);
  const practices = derivePractices(rows);
  const categories = groupByCategory(summaries);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Domains</CardTitle>
          <CardDescription>
            {summaries.length} technologies detected across{" "}
            {new Set(rows.map((row) => row.repositoryId)).size} repositories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DomainShareBar domains={domains} />
        </CardContent>
      </Card>

      {practices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Engineering practices</CardTitle>
            <CardDescription>
              Derived from detected technologies; each lists what implied it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {practices.map(({ evidence, practice }) => {
              const implying = [...new Set([...evidence.values()].flat())];
              return (
                <div
                  className="grid gap-1.5 rounded-lg border p-3"
                  key={practice.id}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm">{practice.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {evidence.size}{" "}
                      {evidence.size === 1 ? "repository" : "repositories"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {practice.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {implying.map((technologyId) => (
                      <Badge key={technologyId} variant="outline">
                        {getTechnology(technologyId)?.name ?? technologyId}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {categories.map(([category, entries]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{categoryLabel(category)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technology</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="text-right">Repositories</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={
                            `${basePath}/technologies/${summary.id}` as Route
                          }
                        >
                          {summary.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <EvidenceBadge confidence={summary.maxConfidence} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {summary.repositories}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
