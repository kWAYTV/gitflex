"use client";

import type { LanguageOverview } from "@gitflex/db/queries/insights";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gitflex/ui/components/table";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@gitflex/ui/components/toggle-group";
import { useCallback, useMemo, useState } from "react";
import {
  formatBytes,
  isApplicationLanguage,
  type LanguageWeighting,
  languageWeight,
} from "./languages";
import { ShareBar } from "./share-bar";

type LanguageScope = "application" | "all";

const WEIGHTING_DESCRIPTIONS: Record<LanguageWeighting, string> = {
  bytes: "Share of code by bytes. One large repository can dominate this view.",
  repositories:
    "Share of repositories where the language is primary or at least 10% of the code.",
};

export function LanguageExplorer({
  analyzedRepositories,
  languages,
}: {
  analyzedRepositories: number;
  languages: LanguageOverview[];
}) {
  const [weighting, setWeighting] = useState<LanguageWeighting>("repositories");
  const [scope, setScope] = useState<LanguageScope>("application");

  const rows = useMemo(() => {
    const scoped =
      scope === "all" ? languages : languages.filter(isApplicationLanguage);
    return scoped
      .map((language) => ({
        ...language,
        value: languageWeight(language, weighting),
      }))
      .filter((language) => language.value > 0 || weighting === "bytes")
      .sort((a, b) => b.value - a.value || b.bytes - a.bytes);
  }, [languages, scope, weighting]);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  const handleWeightingChange = useCallback(([next]: string[]) => {
    if (next) {
      setWeighting(next as LanguageWeighting);
    }
  }, []);
  const handleScopeChange = useCallback(([next]: string[]) => {
    if (next) {
      setScope(next as LanguageScope);
    }
  }, []);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          aria-label="Weighting"
          onValueChange={handleWeightingChange}
          size="sm"
          value={[weighting]}
          variant="outline"
        >
          <ToggleGroupItem value="repositories">
            By repositories
          </ToggleGroupItem>
          <ToggleGroupItem value="bytes">By bytes</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          aria-label="Scope"
          onValueChange={handleScopeChange}
          size="sm"
          value={[scope]}
          variant="outline"
        >
          <ToggleGroupItem value="application">
            Application code
          </ToggleGroupItem>
          <ToggleGroupItem value="all">Include build & config</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p className="text-muted-foreground text-sm">
        {WEIGHTING_DESCRIPTIONS[weighting]}
      </p>

      <ShareBar slices={rows} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Language</TableHead>
            <TableHead className="text-right">Repositories</TableHead>
            <TableHead className="text-right">Code</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: row.color ?? "var(--muted-foreground)",
                    }}
                  />
                  {row.name}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.significantRepositories}
                <span className="text-muted-foreground">
                  {" "}
                  / {row.repositories}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBytes(row.bytes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {total === 0
                  ? "—"
                  : `${((row.value / total) * 100).toFixed(1)}%`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground text-xs">
        Repositories column: significant / any usage, out of{" "}
        {analyzedRepositories} analyzed repositories.
      </p>
    </div>
  );
}
