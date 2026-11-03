import { analyzeRepository } from "@gitflex/analyzer/analyze";
import { ANALYZER_VERSION } from "@gitflex/analyzer/version";
import type { Database } from "@gitflex/db";
import {
  createRepositoryScan,
  createScan,
  findLatestCompletedRepositoryScan,
  finishRepositoryScan,
  insertRepositoryResults,
  listIncludedRepositories,
  type ScanRepository,
  updateScan,
  upsertLanguages,
  upsertTechnologies,
} from "@gitflex/db/queries/analysis";
import type { ScanStatus, ScanTrigger } from "@gitflex/db/schema/analysis";
import { createGitHubClient, type GitHubClient } from "@gitflex/github/client";
import { getRepositoryHead } from "@gitflex/github/contents";
import { isAppError } from "@gitflex/shared/errors";
import { REGISTRY_VERSION } from "@gitflex/technologies/registry";

import {
  allStagesCompleted,
  languageRows,
  registryRows,
  toResults,
  toSummary,
} from "./results";
import { createGitHubSnapshot } from "./snapshot";

const DEFAULT_CONCURRENCY = 3;

export type RepositoryOutcome =
  | { status: "completed"; repositoryId: string; technologies: number }
  | { status: "skipped"; repositoryId: string; reason: string }
  | { status: "failed"; repositoryId: string; code: string; message: string };

export interface RunScanInput {
  accessToken: string;
  concurrency?: number;
  db: Database;
  /** Re-analyze even when the commit and analyzer versions are unchanged. */
  force?: boolean;
  onProgress?: (repository: ScanRepository, outcome: RepositoryOutcome) => void;
  triggerType: ScanTrigger;
  userId: string;
}

export interface RunScanResult {
  completed: number;
  failed: number;
  scanId: string;
  skipped: number;
  status: ScanStatus;
}

interface ScanContext {
  client: GitHubClient;
  db: Database;
  force: boolean;
  scanId: string;
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

function finalStatus(counts: {
  completed: number;
  failed: number;
  notStarted: number;
}): ScanStatus {
  if (counts.failed === 0 && counts.notStarted === 0) {
    return "completed";
  }
  return counts.completed > 0 ? "partial" : "failed";
}

/** Analyzes every included repository for a user. Runs in-process until the job queue lands. */
export async function runRepositoryScan(
  input: RunScanInput
): Promise<RunScanResult> {
  const { db } = input;
  const repositories = await listIncludedRepositories(db, input.userId);
  await upsertTechnologies(db, registryRows());

  const scanId = await createScan(db, {
    startedAt: new Date(),
    totalRepositories: repositories.length,
    triggerType: input.triggerType,
    userId: input.userId,
  });
  const context: ScanContext = {
    client: createGitHubClient(input.accessToken),
    db,
    force: input.force ?? false,
    scanId,
  };

  const counts = { completed: 0, failed: 0, skipped: 0 };
  let next = 0;
  let abortReason: string | null = null;

  const workerLoop = async () => {
    while (abortReason === null && next < repositories.length) {
      const repository = repositories[next];
      next += 1;
      if (!repository) {
        break;
      }
      // biome-ignore lint/performance/noAwaitInLoops: each worker processes its share sequentially; parallelism comes from the pool
      const outcome = await analyzeOne(context, repository);
      counts[outcome.status] += 1;
      if (outcome.status === "failed" && outcome.code === "RATE_LIMITED") {
        abortReason = outcome.message;
      }
      input.onProgress?.(repository, outcome);
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

  const notStarted = repositories.length - next;
  const status = finalStatus({ ...counts, notStarted });
  await updateScan(db, scanId, {
    completedAt: new Date(),
    currentStage: null,
    errorSummary: abortReason
      ? `Stopped early: ${abortReason} ${notStarted} repositories not analyzed.`
      : null,
    skippedRepositories: counts.skipped + notStarted,
    status,
  });

  return {
    ...counts,
    scanId,
    skipped: counts.skipped + notStarted,
    status,
  };
}
