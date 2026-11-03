import type { Database } from "@gitflex/db";
import { findScan } from "@gitflex/db/queries/analysis";
import {
  getUserLanguageOverview,
  getUserTechnologyUsage,
  type LanguageOverview,
  listRepositoryAnalysisStates,
  listUserRepositoryTechnologies,
  type RepositoryScope,
  type RepositoryTechnologyRow,
  type TechnologyUsage,
} from "@gitflex/db/queries/insights";
import {
  findProfileOwner,
  listPublicRepositories,
  type PublicRepository,
} from "@gitflex/db/queries/profile";
import {
  findLatestProfileSnapshot,
  loadScoringRepositories,
} from "@gitflex/db/queries/scoring";
import { calculateProfileScore } from "@gitflex/scoring/score";
import type { ProfileScore } from "@gitflex/scoring/types";

export interface PublicProfileOwner {
  githubUrl: string;
  image: string | null;
  name: string;
  username: string;
}

/**
 * Everything a public profile may show. Built field by field: database rows and
 * stored snapshots are never passed through, because both can name private repositories.
 */
export interface PublicProfile {
  /** "included" only when the owner opted to publish aggregates from private repositories. */
  aggregateScope: RepositoryScope;
  /** Analyzed repositories within `aggregateScope`; the denominator for language shares. */
  analyzedRepositories: number;
  languages: LanguageOverview[];
  owner: PublicProfileOwner;
  repositories: PublicRepository[];
  score: { calculatedAt: Date; result: ProfileScore } | null;
  /** Detections from public repositories only, so every row can be shown and linked. */
  technologies: RepositoryTechnologyRow[];
  /** Detections within `aggregateScope`, for counts and shares only. */
  technologyAggregates: RepositoryTechnologyRow[];
}

/** Drops metric evidence that points at anything other than a listed public repository. */
export function redactEvidence(
  result: ProfileScore,
  publicIds: ReadonlySet<string>
): ProfileScore {
  return {
    ...result,
    dimensions: result.dimensions.map((dimension) => ({
      ...dimension,
      metrics: dimension.metrics.map((metric) => ({
        ...metric,
        repositories: metric.repositories.filter((entry) =>
          publicIds.has(entry.repositoryId)
        ),
      })),
    })),
  };
}

async function publicScore(
  db: Database,
  userId: string,
  scope: RepositoryScope,
  publicIds: ReadonlySet<string>
): Promise<PublicProfile["score"]> {
  const snapshot = await findLatestProfileSnapshot(db, userId);
  const scan = snapshot ? await findScan(db, snapshot.scanId) : null;
  if (!scan?.completedAt) {
    return null;
  }
  const repositories = await loadScoringRepositories(db, userId, {
    asOf: scan.completedAt,
    scope,
  });
  const result = calculateProfileScore({
    now: scan.completedAt,
    repositories,
  });
  return {
    calculatedAt: scan.completedAt,
    result: redactEvidence(result, publicIds),
  };
}

/** Repositories and evidence for one technology, from public repositories only; `null` like `getPublicProfile`. */
export async function getPublicTechnologyUsage(
  db: Database,
  username: string,
  technologyId: string
): Promise<TechnologyUsage[] | null> {
  const owner = await findProfileOwner(db, username);
  if (owner?.visibility !== "public") {
    return null;
  }
  return getUserTechnologyUsage(db, owner.id, technologyId, "public");
}

/** `null` when the user does not exist or keeps the profile private; callers must not distinguish the two. */
export async function getPublicProfile(
  db: Database,
  username: string
): Promise<PublicProfile | null> {
  const owner = await findProfileOwner(db, username);
  if (owner?.visibility !== "public") {
    return null;
  }
  const aggregateScope: RepositoryScope = owner.publishPrivateAggregates
    ? "included"
    : "public";

  const repositories = await listPublicRepositories(db, owner.id);
  const publicIds = new Set(repositories.map((entry) => entry.id));
  const [languages, technologies, technologyAggregates, score, states] =
    await Promise.all([
      getUserLanguageOverview(db, owner.id, aggregateScope),
      listUserRepositoryTechnologies(db, owner.id, "public"),
      aggregateScope === "public"
        ? null
        : listUserRepositoryTechnologies(db, owner.id, aggregateScope),
      publicScore(db, owner.id, aggregateScope, publicIds),
      aggregateScope === "public"
        ? null
        : listRepositoryAnalysisStates(db, owner.id),
    ]);

  return {
    aggregateScope,
    analyzedRepositories: states
      ? states.filter((state) => state.status === "completed").length
      : repositories.filter((entry) => entry.analyzed).length,
    languages,
    owner: {
      githubUrl: `https://github.com/${owner.username}`,
      image: owner.image,
      name: owner.name,
      username: owner.username,
    },
    repositories,
    score,
    technologies,
    technologyAggregates: technologyAggregates ?? technologies,
  };
}
