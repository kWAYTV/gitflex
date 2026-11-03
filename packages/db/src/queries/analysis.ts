import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import {
  language,
  type RepositoryScanStatus,
  type RepositoryScanSummary,
  repositoryDependency,
  repositoryLanguage,
  repositoryScan,
  repositoryTechnology,
  type ScanStatus,
  type ScanTrigger,
  scan,
  technology,
  technologyEvidence,
} from "../schema/analysis";
import { repository, repositorySelection } from "../schema/repositories";
import type { Executor } from "./repositories";

const BATCH_SIZE = 500;

function excluded(column: AnyPgColumn) {
  return sql.raw(`excluded."${column.name}"`);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export interface ScanRepository {
  defaultBranch: string | null;
  fullName: string;
  id: string;
  isDisabled: boolean;
  name: string;
  ownerLogin: string;
}

export function listIncludedRepositories(
  executor: Executor,
  userId: string
): Promise<ScanRepository[]> {
  return executor
    .select({
      defaultBranch: repository.defaultBranch,
      fullName: repository.fullName,
      id: repository.id,
      isDisabled: repository.isDisabled,
      name: repository.name,
      ownerLogin: repository.ownerLogin,
    })
    .from(repositorySelection)
    .innerJoin(repository, eq(repository.id, repositorySelection.repositoryId))
    .where(
      and(
        eq(repositorySelection.userId, userId),
        eq(repositorySelection.included, true),
        isNull(repositorySelection.removedAt)
      )
    )
    .orderBy(desc(repository.pushedAt));
}

export async function createScan(
  executor: Executor,
  values: {
    startedAt: Date;
    totalRepositories: number;
    triggerType: ScanTrigger;
    userId: string;
  }
): Promise<string> {
  const [row] = await executor
    .insert(scan)
    .values({ ...values, status: "running" })
    .returning({ id: scan.id });
  if (!row) {
    throw new Error("Scan was not created");
  }
  return row.id;
}

export async function updateScan(
  executor: Executor,
  scanId: string,
  values: Partial<{
    completedAt: Date;
    completedRepositories: number;
    currentStage: string | null;
    errorSummary: string | null;
    failedRepositories: number;
    skippedRepositories: number;
    status: ScanStatus;
  }>
): Promise<void> {
  await executor.update(scan).set(values).where(eq(scan.id, scanId));
}

export async function createRepositoryScan(
  executor: Executor,
  values: {
    analyzerVersion: string;
    registryVersion: string;
    repositoryId: string;
    scanId: string;
    startedAt: Date;
  }
): Promise<string> {
  const [row] = await executor
    .insert(repositoryScan)
    .values({ ...values, status: "running" })
    .returning({ id: repositoryScan.id });
  if (!row) {
    throw new Error("Repository scan was not created");
  }
  return row.id;
}

export async function finishRepositoryScan(
  executor: Executor,
  repositoryScanId: string,
  values: {
    commitSha?: string | null;
    completedAt: Date;
    errorCode?: string | null;
    errorMessage?: string | null;
    status: Exclude<RepositoryScanStatus, "queued" | "running">;
    summary?: RepositoryScanSummary | null;
  }
): Promise<void> {
  await executor
    .update(repositoryScan)
    .set(values)
    .where(eq(repositoryScan.id, repositoryScanId));
}

export interface LatestRepositoryScan {
  analyzerVersion: string;
  commitSha: string | null;
  id: string;
  registryVersion: string;
  summary: RepositoryScanSummary | null;
}

/** Latest scan that produced stored results; skipped scans point back at it implicitly. */
export async function findLatestCompletedRepositoryScan(
  executor: Executor,
  repositoryId: string
): Promise<LatestRepositoryScan | null> {
  const [row] = await executor
    .select({
      analyzerVersion: repositoryScan.analyzerVersion,
      commitSha: repositoryScan.commitSha,
      id: repositoryScan.id,
      registryVersion: repositoryScan.registryVersion,
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
  return row ?? null;
}

export interface TechnologyUpsert {
  category: string;
  description: string;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  registryVersion: string;
  subcategory: string;
}

export async function upsertTechnologies(
  executor: Executor,
  rows: readonly TechnologyUpsert[]
): Promise<void> {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    // biome-ignore lint/performance/noAwaitInLoops: batches share one transaction connection and must run sequentially
    await executor
      .insert(technology)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          category: excluded(technology.category),
          description: excluded(technology.description),
          metadata: excluded(technology.metadata),
          name: excluded(technology.name),
          registryVersion: excluded(technology.registryVersion),
          subcategory: excluded(technology.subcategory),
        },
        target: technology.id,
      });
  }
}

export interface LanguageUpsert {
  color: string | null;
  id: string;
  name: string;
  type: string;
}

export async function upsertLanguages(
  executor: Executor,
  rows: readonly LanguageUpsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await executor
    .insert(language)
    .values([...rows])
    .onConflictDoUpdate({
      set: {
        color: excluded(language.color),
        name: excluded(language.name),
        type: excluded(language.type),
      },
      target: language.id,
    });
}

export interface RepositoryResults {
  dependencies: {
    constraint: string | null;
    direct: boolean;
    ecosystem: string;
    manifestPath: string;
    name: string;
    scope: string;
  }[];
  detectedAt: Date;
  languages: {
    bytes: number;
    languageId: string;
    percentage: number;
    role: string;
  }[];
  repositoryId: string;
  repositoryScanId: string;
  technologies: {
    confidence: number;
    evidence: { kind: string; rule: string; source: string; weight: number }[];
    evidenceCount: number;
    technologyId: string;
    usageType: string;
  }[];
}

/** Writes one repository's analysis output; run inside the transaction that completes the repository scan. */
export async function insertRepositoryResults(
  executor: Executor,
  results: RepositoryResults
): Promise<void> {
  const { detectedAt, repositoryId, repositoryScanId } = results;

  if (results.languages.length > 0) {
    await executor.insert(repositoryLanguage).values(
      results.languages.map((row) => ({
        ...row,
        detectedAt,
        repositoryId,
        repositoryScanId,
      }))
    );
  }

  if (results.technologies.length > 0) {
    const inserted = await executor
      .insert(repositoryTechnology)
      .values(
        results.technologies.map(
          ({ confidence, evidenceCount, technologyId, usageType }) => ({
            confidence,
            detectedAt,
            evidenceCount,
            repositoryId,
            repositoryScanId,
            technologyId,
            usageType,
          })
        )
      )
      .returning({
        id: repositoryTechnology.id,
        technologyId: repositoryTechnology.technologyId,
      });
    const idByTechnology = new Map(
      inserted.map((row) => [row.technologyId, row.id])
    );
    const evidence = results.technologies.flatMap((detection) => {
      const repositoryTechnologyId = idByTechnology.get(detection.technologyId);
      return repositoryTechnologyId
        ? detection.evidence.map((record) => ({
            ...record,
            repositoryTechnologyId,
          }))
        : [];
    });
    for (const batch of chunk(evidence, BATCH_SIZE)) {
      // biome-ignore lint/performance/noAwaitInLoops: batches share one transaction connection and must run sequentially
      await executor.insert(technologyEvidence).values(batch);
    }
  }

  for (const batch of chunk(results.dependencies, BATCH_SIZE)) {
    // biome-ignore lint/performance/noAwaitInLoops: batches share one transaction connection and must run sequentially
    await executor
      .insert(repositoryDependency)
      .values(batch.map((row) => ({ ...row, repositoryId, repositoryScanId })));
  }
}
