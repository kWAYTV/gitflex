import type { ProfileScore, ScoringRepository } from "@gitflex/scoring/types";
import { and, desc, eq, inArray, isNull, lte } from "drizzle-orm";

import {
  language,
  repositoryDependency,
  repositoryLanguage,
  repositoryScan,
  repositoryTechnology,
} from "../schema/analysis";
import { repository, repositorySelection } from "../schema/repositories";
import {
  type ProfileSnapshotRow,
  profileSnapshot,
  score,
} from "../schema/scoring";
import type { RepositoryScope } from "./insights";
import type { Executor } from "./repositories";

/**
 * Included repositories (within `scope`) with metadata and the evidence from each one's
 * latest completed scan; with `asOf`, the latest completed by then, so a stored snapshot can be reproduced.
 */
export async function loadScoringRepositories(
  executor: Executor,
  userId: string,
  { asOf, scope = "included" }: { asOf?: Date; scope?: RepositoryScope } = {}
): Promise<ScoringRepository[]> {
  const [repositories, scans] = await Promise.all([
    executor
      .select({
        description: repository.description,
        forks: repository.forks,
        fullName: repository.fullName,
        id: repository.id,
        isArchived: repository.isArchived,
        isFork: repository.isFork,
        ownership: repositorySelection.ownership,
        pushedAt: repository.pushedAt,
        sizeKb: repository.sizeKb,
        stars: repository.stars,
      })
      .from(repositorySelection)
      .innerJoin(
        repository,
        eq(repository.id, repositorySelection.repositoryId)
      )
      .where(
        and(
          eq(repositorySelection.userId, userId),
          eq(repositorySelection.included, true),
          isNull(repositorySelection.removedAt),
          scope === "public" ? eq(repository.visibility, "public") : undefined
        )
      ),
    executor
      .selectDistinctOn([repositoryScan.repositoryId], {
        id: repositoryScan.id,
        repositoryId: repositoryScan.repositoryId,
        summary: repositoryScan.summary,
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
      .where(
        and(
          eq(repositoryScan.status, "completed"),
          asOf ? lte(repositoryScan.completedAt, asOf) : undefined
        )
      )
      .orderBy(repositoryScan.repositoryId, desc(repositoryScan.completedAt)),
  ]);

  const repositoryIds = new Set(repositories.map((row) => row.id));
  const scopedScans = scans.filter((entry) =>
    repositoryIds.has(entry.repositoryId)
  );
  const scanIds = scopedScans.map((entry) => entry.id);
  const [technologies, languages, dependencies] =
    scanIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          executor
            .select({
              confidence: repositoryTechnology.confidence,
              repositoryScanId: repositoryTechnology.repositoryScanId,
              technologyId: repositoryTechnology.technologyId,
            })
            .from(repositoryTechnology)
            .where(inArray(repositoryTechnology.repositoryScanId, scanIds)),
          executor
            .select({
              languageId: repositoryLanguage.languageId,
              percentage: repositoryLanguage.percentage,
              repositoryScanId: repositoryLanguage.repositoryScanId,
              role: repositoryLanguage.role,
              type: language.type,
            })
            .from(repositoryLanguage)
            .innerJoin(language, eq(language.id, repositoryLanguage.languageId))
            .where(inArray(repositoryLanguage.repositoryScanId, scanIds)),
          executor
            .selectDistinct({
              repositoryScanId: repositoryDependency.repositoryScanId,
            })
            .from(repositoryDependency)
            .where(inArray(repositoryDependency.repositoryScanId, scanIds)),
        ]);

  const scanByRepository = new Map(
    scopedScans.map((entry) => [entry.repositoryId, entry])
  );
  const technologiesByScan = Map.groupBy(
    technologies,
    (row) => row.repositoryScanId
  );
  const languagesByScan = Map.groupBy(languages, (row) => row.repositoryScanId);
  const scansWithDependencies = new Set(
    dependencies.map((row) => row.repositoryScanId)
  );

  return repositories.map((row) => {
    const latest = scanByRepository.get(row.id);
    return {
      ...row,
      analyzed: latest !== undefined,
      hasDependencies: latest ? scansWithDependencies.has(latest.id) : false,
      languages: latest
        ? (languagesByScan.get(latest.id) ?? []).map(
            ({ languageId, percentage, role, type }) => ({
              languageId,
              percentage,
              role,
              type,
            })
          )
        : [],
      signals: latest?.summary?.signals ?? null,
      technologies: latest
        ? (technologiesByScan.get(latest.id) ?? []).map(
            ({ confidence, technologyId }) => ({ confidence, technologyId })
          )
        : [],
    };
  });
}

export interface ProfileSnapshotInsert {
  analyzerVersion: string;
  calculatedAt: Date;
  result: ProfileScore;
  scanId: string;
  userId: string;
}

/** Idempotent per scan and scoring version: returns the existing snapshot ID on a repeat call. */
export function insertProfileSnapshot(
  executor: Executor,
  input: ProfileSnapshotInsert
): Promise<string> {
  return executor.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(profileSnapshot)
      .values({
        analyzerVersion: input.analyzerVersion,
        breakdown: input.result,
        confidence: input.result.confidence,
        grade: input.result.grade,
        overallScore: input.result.overall,
        scanId: input.scanId,
        scoringVersion: input.result.version,
        userId: input.userId,
      })
      .onConflictDoNothing({
        target: [profileSnapshot.scanId, profileSnapshot.scoringVersion],
      })
      .returning({ id: profileSnapshot.id });

    if (!inserted) {
      const [existing] = await tx
        .select({ id: profileSnapshot.id })
        .from(profileSnapshot)
        .where(
          and(
            eq(profileSnapshot.scanId, input.scanId),
            eq(profileSnapshot.scoringVersion, input.result.version)
          )
        );
      if (!existing) {
        throw new Error("Profile snapshot conflict without an existing row.");
      }
      return existing.id;
    }

    await tx.insert(score).values(
      input.result.dimensions.map((dimension) => ({
        calculatedAt: input.calculatedAt,
        confidence: dimension.confidence,
        dimension: dimension.dimension,
        score: dimension.score,
        scoringVersion: input.result.version,
        snapshotId: inserted.id,
        userId: input.userId,
      }))
    );
    return inserted.id;
  });
}

export async function findLatestProfileSnapshot(
  executor: Executor,
  userId: string
): Promise<ProfileSnapshotRow | null> {
  const [row] = await executor
    .select()
    .from(profileSnapshot)
    .where(eq(profileSnapshot.userId, userId))
    .orderBy(desc(profileSnapshot.createdAt))
    .limit(1);
  return row ?? null;
}
