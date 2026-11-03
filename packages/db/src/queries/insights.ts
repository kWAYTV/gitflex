import { and, count, desc, eq, inArray, isNull, sql, sum } from "drizzle-orm";

import {
  language,
  type RepositoryScanSummary,
  repositoryDependency,
  repositoryLanguage,
  repositoryScan,
  repositoryTechnology,
  technology,
  technologyEvidence,
} from "../schema/analysis";
import { repository, repositorySelection } from "../schema/repositories";
import type { Executor } from "./repositories";

/** Latest completed repository scan for each repository the user currently includes. */
export function latestUserScans(executor: Executor, userId: string) {
  return executor
    .selectDistinctOn([repositoryScan.repositoryId], {
      id: repositoryScan.id,
      repositoryId: repositoryScan.repositoryId,
    })
    .from(repositoryScan)
    .innerJoin(
      repositorySelection,
      and(
        eq(repositorySelection.repositoryId, repositoryScan.repositoryId),
        eq(repositorySelection.userId, userId),
        eq(repositorySelection.included, true),
        isNull(repositorySelection.removedAt)
      )
    )
    .where(eq(repositoryScan.status, "completed"))
    .orderBy(repositoryScan.repositoryId, desc(repositoryScan.completedAt))
    .as("latest");
}

export interface LanguageOverview {
  bytes: number;
  color: string | null;
  id: string;
  name: string;
  repositories: number;
  /** Repositories where the language is primary or at least 10 % of the code. */
  significantRepositories: number;
  type: string;
}

const SIGNIFICANT_LANGUAGE_PERCENTAGE = 10;

export async function getUserLanguageOverview(
  executor: Executor,
  userId: string
): Promise<LanguageOverview[]> {
  const latest = latestUserScans(executor, userId);
  const rows = await executor
    .select({
      bytes: sum(repositoryLanguage.bytes),
      color: language.color,
      id: language.id,
      name: language.name,
      repositories: count(repositoryLanguage.id),
      significantRepositories: count(
        sql`case when ${repositoryLanguage.role} = 'primary' or ${repositoryLanguage.percentage} >= ${SIGNIFICANT_LANGUAGE_PERCENTAGE} then 1 end`
      ),
      type: language.type,
    })
    .from(repositoryLanguage)
    .innerJoin(latest, eq(latest.id, repositoryLanguage.repositoryScanId))
    .innerJoin(language, eq(language.id, repositoryLanguage.languageId))
    .groupBy(language.id)
    .orderBy(desc(sum(repositoryLanguage.bytes)));
  return rows.map((row) => ({ ...row, bytes: Number(row.bytes ?? 0) }));
}

export interface RepositoryAnalysisDetail {
  analyzedAt: Date | null;
  analyzerVersion: string;
  commitSha: string | null;
  dependencies: {
    constraint: string | null;
    direct: boolean;
    ecosystem: string;
    manifestPath: string;
    name: string;
    scope: string;
  }[];
  languages: {
    bytes: number;
    color: string | null;
    name: string;
    percentage: number;
    role: string;
  }[];
  repository: {
    fullName: string;
    htmlUrl: string;
    id: string;
  };
  summary: RepositoryScanSummary | null;
  technologies: {
    category: string;
    confidence: number;
    evidence: { kind: string; rule: string; source: string; weight: number }[];
    evidenceCount: number;
    id: string;
    name: string;
    usageType: string;
  }[];
}

/** Returns `null` when the repository is not visible to the user; `scan` fields are empty until analyzed. */
export async function getRepositoryAnalysis(
  executor: Executor,
  userId: string,
  repositoryId: string
): Promise<RepositoryAnalysisDetail | "not-analyzed" | null> {
  const [owned] = await executor
    .select({
      fullName: repository.fullName,
      htmlUrl: repository.htmlUrl,
      id: repository.id,
    })
    .from(repositorySelection)
    .innerJoin(repository, eq(repository.id, repositorySelection.repositoryId))
    .where(
      and(
        eq(repositorySelection.userId, userId),
        eq(repositorySelection.repositoryId, repositoryId),
        isNull(repositorySelection.removedAt)
      )
    )
    .limit(1);
  if (!owned) {
    return null;
  }

  const [latest] = await executor
    .select({
      analyzerVersion: repositoryScan.analyzerVersion,
      commitSha: repositoryScan.commitSha,
      completedAt: repositoryScan.completedAt,
      id: repositoryScan.id,
      summary: repositoryScan.summary,
    })
    .from(repositoryScan)
    .where(
      and(
        eq(repositoryScan.repositoryId, repositoryId),
        eq(repositoryScan.status, "completed")
      )
    )
    .orderBy(desc(repositoryScan.completedAt))
    .limit(1);
  if (!latest) {
    return "not-analyzed";
  }

  const [languages, technologies, evidence, dependencies] = await Promise.all([
    executor
      .select({
        bytes: repositoryLanguage.bytes,
        color: language.color,
        name: language.name,
        percentage: repositoryLanguage.percentage,
        role: repositoryLanguage.role,
      })
      .from(repositoryLanguage)
      .innerJoin(language, eq(language.id, repositoryLanguage.languageId))
      .where(eq(repositoryLanguage.repositoryScanId, latest.id))
      .orderBy(desc(repositoryLanguage.bytes)),
    executor
      .select({
        category: technology.category,
        confidence: repositoryTechnology.confidence,
        evidenceCount: repositoryTechnology.evidenceCount,
        id: technology.id,
        name: technology.name,
        rowId: repositoryTechnology.id,
        usageType: repositoryTechnology.usageType,
      })
      .from(repositoryTechnology)
      .innerJoin(
        technology,
        eq(technology.id, repositoryTechnology.technologyId)
      )
      .where(eq(repositoryTechnology.repositoryScanId, latest.id))
      .orderBy(desc(repositoryTechnology.confidence), technology.name),
    executor
      .select({
        kind: technologyEvidence.kind,
        repositoryTechnologyId: technologyEvidence.repositoryTechnologyId,
        rule: technologyEvidence.rule,
        source: technologyEvidence.source,
        weight: technologyEvidence.weight,
      })
      .from(technologyEvidence)
      .innerJoin(
        repositoryTechnology,
        eq(repositoryTechnology.id, technologyEvidence.repositoryTechnologyId)
      )
      .where(eq(repositoryTechnology.repositoryScanId, latest.id))
      .orderBy(desc(technologyEvidence.weight)),
    executor
      .select({
        constraint: repositoryDependency.constraint,
        direct: repositoryDependency.direct,
        ecosystem: repositoryDependency.ecosystem,
        manifestPath: repositoryDependency.manifestPath,
        name: repositoryDependency.name,
        scope: repositoryDependency.scope,
      })
      .from(repositoryDependency)
      .where(eq(repositoryDependency.repositoryScanId, latest.id))
      .orderBy(
        repositoryDependency.manifestPath,
        sql`${repositoryDependency.scope} = 'production' desc`,
        repositoryDependency.name
      ),
  ]);

  const evidenceByRow = Map.groupBy(
    evidence,
    (record) => record.repositoryTechnologyId
  );

  return {
    analyzedAt: latest.completedAt,
    analyzerVersion: latest.analyzerVersion,
    commitSha: latest.commitSha,
    dependencies,
    languages,
    repository: owned,
    summary: latest.summary,
    technologies: technologies.map(({ rowId, ...rest }) => ({
      ...rest,
      evidence: (evidenceByRow.get(rowId) ?? []).map(
        ({ kind, rule, source, weight }) => ({ kind, rule, source, weight })
      ),
    })),
  };
}

export interface RepositoryTechnologyRow {
  confidence: number;
  name: string;
  repositoryId: string;
  technologyId: string;
}

/** Technology detections from each included repository's latest completed scan. */
export function listUserRepositoryTechnologies(
  executor: Executor,
  userId: string
): Promise<RepositoryTechnologyRow[]> {
  const latest = latestUserScans(executor, userId);
  return executor
    .select({
      confidence: repositoryTechnology.confidence,
      name: technology.name,
      repositoryId: latest.repositoryId,
      technologyId: repositoryTechnology.technologyId,
    })
    .from(repositoryTechnology)
    .innerJoin(latest, eq(latest.id, repositoryTechnology.repositoryScanId))
    .innerJoin(technology, eq(technology.id, repositoryTechnology.technologyId))
    .orderBy(desc(repositoryTechnology.confidence), technology.name);
}

export interface RepositoryLanguageRow {
  color: string | null;
  id: string;
  name: string;
  percentage: number;
  repositoryId: string;
}

/** Programming languages from each included repository's latest completed scan. */
export function listUserRepositoryLanguages(
  executor: Executor,
  userId: string
): Promise<RepositoryLanguageRow[]> {
  const latest = latestUserScans(executor, userId);
  return executor
    .select({
      color: language.color,
      id: language.id,
      name: language.name,
      percentage: repositoryLanguage.percentage,
      repositoryId: latest.repositoryId,
    })
    .from(repositoryLanguage)
    .innerJoin(latest, eq(latest.id, repositoryLanguage.repositoryScanId))
    .innerJoin(language, eq(language.id, repositoryLanguage.languageId))
    .where(eq(language.type, "programming"))
    .orderBy(desc(repositoryLanguage.bytes));
}

export interface RepositoryAnalysisState {
  completedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  repositoryId: string;
  status: (typeof repositoryScan.$inferSelect)["status"];
}

/**
 * One state per repository the user has: the latest completed scan when one exists
 * (later skips or failures do not invalidate its data), otherwise the latest attempt.
 */
export function listRepositoryAnalysisStates(
  executor: Executor,
  userId: string
): Promise<RepositoryAnalysisState[]> {
  return executor
    .selectDistinctOn([repositoryScan.repositoryId], {
      completedAt: repositoryScan.completedAt,
      errorCode: repositoryScan.errorCode,
      errorMessage: repositoryScan.errorMessage,
      repositoryId: repositoryScan.repositoryId,
      status: repositoryScan.status,
    })
    .from(repositoryScan)
    .innerJoin(
      repositorySelection,
      and(
        eq(repositorySelection.repositoryId, repositoryScan.repositoryId),
        eq(repositorySelection.userId, userId),
        isNull(repositorySelection.removedAt)
      )
    )
    .orderBy(
      repositoryScan.repositoryId,
      sql`${repositoryScan.status} = 'completed' desc`,
      desc(repositoryScan.createdAt)
    );
}

export interface TechnologyUsage {
  confidence: number;
  evidence: { kind: string; rule: string; source: string; weight: number }[];
  fullName: string;
  repositoryId: string;
  usageType: string;
}

/** Repositories (with evidence) where the user's latest scans detected a technology. */
export async function getUserTechnologyUsage(
  executor: Executor,
  userId: string,
  technologyId: string
): Promise<TechnologyUsage[]> {
  const latest = latestUserScans(executor, userId);
  const rows = await executor
    .select({
      confidence: repositoryTechnology.confidence,
      fullName: repository.fullName,
      repositoryId: latest.repositoryId,
      rowId: repositoryTechnology.id,
      usageType: repositoryTechnology.usageType,
    })
    .from(repositoryTechnology)
    .innerJoin(latest, eq(latest.id, repositoryTechnology.repositoryScanId))
    .innerJoin(repository, eq(repository.id, latest.repositoryId))
    .where(eq(repositoryTechnology.technologyId, technologyId))
    .orderBy(desc(repositoryTechnology.confidence), repository.fullName);
  if (rows.length === 0) {
    return [];
  }

  const evidence = await executor
    .select({
      kind: technologyEvidence.kind,
      repositoryTechnologyId: technologyEvidence.repositoryTechnologyId,
      rule: technologyEvidence.rule,
      source: technologyEvidence.source,
      weight: technologyEvidence.weight,
    })
    .from(technologyEvidence)
    .where(
      inArray(
        technologyEvidence.repositoryTechnologyId,
        rows.map((row) => row.rowId)
      )
    )
    .orderBy(desc(technologyEvidence.weight));
  const evidenceByRow = Map.groupBy(
    evidence,
    (record) => record.repositoryTechnologyId
  );

  return rows.map(({ rowId, ...rest }) => ({
    ...rest,
    evidence: (evidenceByRow.get(rowId) ?? []).map(
      ({ kind, rule, source, weight }) => ({ kind, rule, source, weight })
    ),
  }));
}
