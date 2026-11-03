import { analyzeRepository } from "@gitflex/analyzer/analyze";
import { ANALYZER_VERSION } from "@gitflex/analyzer/version";
import type { Database } from "@gitflex/db";
import {
  countRepositoryScans,
  createRepositoryScan,
  createScan,
  findLatestCompletedRepositoryScan,
  findScan,
  finishRepositoryScan,
  insertRepositoryResults,
  listIncludedRepositories,
  resetUnfinishedRepositoryScans,
  type ScanRepository,
  updateScan,
  upsertLanguages,
  upsertTechnologies,
} from "@gitflex/db/queries/analysis";
import type { ScanStatus, ScanTrigger } from "@gitflex/db/schema/analysis";
import { createGitHubClient, type GitHubClient } from "@gitflex/github/client";
import { getRepositoryHead } from "@gitflex/github/contents";
import { AppError, isAppError } from "@gitflex/shared/errors";
import { REGISTRY_VERSION } from "@gitflex/technologies/registry";

import { createProfileSnapshot } from "../scoring/snapshot";
import {
  allStagesCompleted,
  languageRows,
  registryRows,
  toResults,
  toSummary,
} from "./results";
import { createGitHubSnapshot } from "./snapshot";

const DEFAULT_CONCURRENCY = 3;
const UNIQUE_VIOLATION = "23505";

export type RepositoryOutcome =
  | { status: "completed"; repositoryId: string; technologies: number }
  | { status: "skipped"; repositoryId: string; reason: string }
  | { status: "failed"; repositoryId: string; code: string; message: string };

export interface ScanCounts {
  completed: number;
  failed: number;
  skipped: number;
}

export interface ScanResult extends ScanCounts {
  scanId: string;
  status: ScanStatus;
}

interface ScanContext {
  client: GitHubClient;
  db: Database;
  force: boolean;
  scanId: string;
}

function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) {
      return true;
    }
  }
  return false;
}

/** Creates a queued scan. Throws `SCAN_ALREADY_RUNNING` when one is already queued or running. */
export async function createQueuedScan(input: {
  db: Database;
  triggerType: ScanTrigger;
  userId: string;
}): Promise<string> {
  try {
    return await createScan(input.db, {
      status: "queued",
      triggerType: input.triggerType,
      userId: input.userId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // biome-ignore lint/style/useErrorCause: cause is passed through the options argument
      throw new AppError(
        "SCAN_ALREADY_RUNNING",
        "A scan is already in progress.",
        { cause: error }
      );
    }
    throw error;
  }
}

class RateLimitedSignal extends Error {
  readonly appError: AppError;
  constructor(appError: AppError) {
    super(appError.message, { cause: appError });
    this.appError = appError;
  }
}

async function analyzeOne(
  context: ScanContext,
  repository: ScanRepository
): Promise<RepositoryOutcome> {
  const { client, db, scanId } = context;
  const repositoryId = repository.id;
  const repositoryScanId = await createRepositoryScan(db, {
    analyzerVersion: ANALYZER_VERSION,
    registryVersion: REGISTRY_VERSION,
    repositoryId,
    scanId,
    startedAt: new Date(),
  });

  const skip = async (reason: string, commitSha: string | null = null) => {
    await finishRepositoryScan(db, repositoryScanId, {
      commitSha,
      completedAt: new Date(),
      errorMessage: reason,
      status: "skipped",
    });
    return { reason, repositoryId, status: "skipped" } as const;
  };

  try {
    if (repository.isDisabled) {
      return await skip("repository is disabled");
    }
    const ref = { name: repository.name, owner: repository.ownerLogin };
    const head = repository.defaultBranch
      ? await getRepositoryHead(client, ref, repository.defaultBranch)
      : null;
    if (!head) {
      return await skip("repository is empty");
    }

    const previous = await findLatestCompletedRepositoryScan(db, repositoryId);
    if (
      !context.force &&
      previous?.commitSha === head.commitSha &&
      previous.analyzerVersion === ANALYZER_VERSION &&
      previous.registryVersion === REGISTRY_VERSION &&
      allStagesCompleted(previous.summary)
    ) {
      return await skip("unchanged since last analysis", head.commitSha);
    }

    const snapshot = await createGitHubSnapshot(client, ref, head);
    const analysis = await analyzeRepository(snapshot);
    const results = toResults(analysis, { repositoryId, repositoryScanId });

    await db.transaction(async (tx) => {
      await upsertLanguages(tx, languageRows(analysis));
      await insertRepositoryResults(tx, results);
      await finishRepositoryScan(tx, repositoryScanId, {
        commitSha: head.commitSha,
        completedAt: new Date(),
        status: "completed",
        summary: toSummary(analysis),
      });
    });

    return {
      repositoryId,
      status: "completed",
      technologies: results.technologies.length,
    };
  } catch (error) {
    // Left unfinished on purpose: the resume path discards it and retries the repository.
    if (isAppError(error) && error.code === "RATE_LIMITED") {
      // biome-ignore lint/style/useErrorCause: the signal stores the error as its cause
      throw new RateLimitedSignal(error);
    }
    const code = isAppError(error) ? error.code : "ANALYSIS_FAILED";
    const message =
      error instanceof Error ? error.message.slice(0, 500) : "Analysis failed";
    await finishRepositoryScan(db, repositoryScanId, {
      completedAt: new Date(),
      errorCode: code,
      errorMessage: message,
      status: "failed",
    });
    return { code, message, repositoryId, status: "failed" };
  }
}

function settledStatus(counts: ScanCounts): ScanStatus {
  if (counts.failed === 0) {
    return "completed";
  }
  return counts.completed + counts.skipped > 0 ? "partial" : "failed";
}

export interface ExecuteScanInput {
  accessToken: string;
  concurrency?: number;
  db: Database;
  /** Re-analyze even when the commit and analyzer versions are unchanged. */
  force?: boolean;
  onProgress?: (
    repository: ScanRepository,
    outcome: RepositoryOutcome
  ) => void | Promise<void>;
  scanId: string;
}

/**
 * Executes a queued scan. Safe to call again for the same scan after a crash or
 * retry: finished repositories are kept and only the remainder is analyzed.
 * Throws `RATE_LIMITED` (with `retryAfter`) after returning the scan to `queued`.
 */
export async function executeScan(
  input: ExecuteScanInput
): Promise<ScanResult> {
  const { db, scanId } = input;
  const scan = await findScan(db, scanId);
  if (!scan) {
    throw new AppError("NOT_FOUND", `Scan ${scanId} does not exist.`);
  }
  if (scan.status !== "queued" && scan.status !== "running") {
    if (scan.status === "completed" || scan.status === "partial") {
      await createProfileSnapshot(db, scanId);
    }
    return {
      completed: scan.completedRepositories,
      failed: scan.failedRepositories,
      scanId,
      skipped: scan.skippedRepositories,
      status: scan.status,
    };
  }

  const repositories = await listIncludedRepositories(db, scan.userId);
  await upsertTechnologies(db, registryRows());
  const finished = await resetUnfinishedRepositoryScans(db, scanId);
  const pending = repositories.filter(
    (repository) => !finished.has(repository.id)
  );

  await updateScan(db, scanId, {
    errorSummary: null,
    startedAt: scan.startedAt ?? new Date(),
    status: "running",
    totalRepositories: repositories.length,
  });

  const context: ScanContext = {
    client: createGitHubClient(input.accessToken),
    db,
    force: input.force ?? false,
    scanId,
  };
  let next = 0;
  let rateLimit: AppError | null = null;

  const workerLoop = async () => {
    while (rateLimit === null && next < pending.length) {
      const repository = pending[next];
      next += 1;
      if (!repository) {
        break;
      }
      try {
        // biome-ignore lint/performance/noAwaitInLoops: each worker processes its share sequentially; parallelism comes from the pool
        const outcome = await analyzeOne(context, repository);
        await input.onProgress?.(repository, outcome);
      } catch (error) {
        if (error instanceof RateLimitedSignal) {
          rateLimit = error.appError;
          break;
        }
        throw error;
      }
      const counts = await countRepositoryScans(db, scanId);
      await updateScan(db, scanId, {
        completedRepositories: counts.completed,
        currentStage: `analyzed ${repository.fullName}`,
        failedRepositories: counts.failed,
        skippedRepositories: counts.skipped,
      });
    }
  };

  const concurrency = Math.max(1, input.concurrency ?? DEFAULT_CONCURRENCY);
  await Promise.all(Array.from({ length: concurrency }, workerLoop));

  const counts = await countRepositoryScans(db, scanId);
  if (rateLimit) {
    await updateScan(db, scanId, {
      completedRepositories: counts.completed,
      currentStage: null,
      errorSummary: "Paused until the GitHub rate limit resets.",
      failedRepositories: counts.failed,
      skippedRepositories: counts.skipped,
      status: "queued",
    });
    throw rateLimit;
  }

  const status = settledStatus(counts);
  await updateScan(db, scanId, {
    completedAt: new Date(),
    completedRepositories: counts.completed,
    currentStage: null,
    failedRepositories: counts.failed,
    skippedRepositories: counts.skipped,
    status,
  });
  if (status !== "failed") {
    await createProfileSnapshot(db, scanId);
  }
  return { ...counts, scanId, status };
}

/** Terminal state for a scan that cannot continue (retries exhausted, token revoked). */
export async function stopScan(
  db: Database,
  scanId: string,
  reason: string
): Promise<ScanStatus> {
  await resetUnfinishedRepositoryScans(db, scanId);
  const counts = await countRepositoryScans(db, scanId);
  const status: ScanStatus =
    counts.completed + counts.skipped > 0 ? "partial" : "failed";
  await updateScan(db, scanId, {
    completedAt: new Date(),
    completedRepositories: counts.completed,
    currentStage: null,
    errorSummary: reason.slice(0, 500),
    failedRepositories: counts.failed,
    skippedRepositories: counts.skipped,
    status,
  });
  return status;
}

/** In-process scan for scripts: create, execute and settle without the queue. */
export async function runRepositoryScan(
  input: Omit<ExecuteScanInput, "scanId"> & {
    triggerType: ScanTrigger;
    userId: string;
  }
): Promise<ScanResult> {
  const scanId = await createQueuedScan(input);
  try {
    return await executeScan({ ...input, scanId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    const status = await stopScan(input.db, scanId, message);
    const counts = await countRepositoryScans(input.db, scanId);
    return { ...counts, scanId, status };
  }
}
