import type { Auth } from "@gitflex/auth";
import { getGitHubAccessToken } from "@gitflex/auth/github-token";
import {
  executeScan,
  type ScanResult,
  stopScan,
} from "@gitflex/core/analysis/scan";
import type { Database } from "@gitflex/db";
import { type RunScanJob, runScanJobSchema } from "@gitflex/queue/definitions";
import { isAppError } from "@gitflex/shared/errors";
import { DelayedError, type Job, UnrecoverableError } from "bullmq";
import type { Logger } from "pino";

/** Errors that will not resolve by retrying the same job. */
const UNRECOVERABLE_CODES = new Set([
  "GITHUB_NOT_CONNECTED",
  "GITHUB_TOKEN_INVALID",
  "NOT_FOUND",
]);

const DEFAULT_RATE_LIMIT_DELAY_MS = 15 * 60 * 1000;

export interface ScanProcessorDeps {
  auth: Auth;
  concurrency: number;
  db: Database;
  logger: Logger;
}

export function createScanProcessor({
  auth,
  concurrency,
  db,
  logger,
}: ScanProcessorDeps) {
  return async (job: Job<RunScanJob>, token?: string): Promise<ScanResult> => {
    const data = runScanJobSchema.parse(job.data);
    const log = logger.child({ jobId: job.id, scanId: data.scanId });

    try {
      const accessToken = await getGitHubAccessToken(auth, db, data.userId);
      const result = await executeScan({
        accessToken,
        concurrency,
        db,
        force: data.force,
        onProgress: async (repository, outcome) => {
          log.debug(
            { outcome: outcome.status, repository: repository.fullName },
            "repository analyzed"
          );
          await job.updateProgress({ lastRepository: repository.fullName });
        },
        scanId: data.scanId,
      });
      log.info(result, "scan finished");
      return result;
    } catch (error) {
      if (isAppError(error) && error.code === "RATE_LIMITED") {
        const until =
          error.retryAfter?.getTime() ??
          Date.now() + DEFAULT_RATE_LIMIT_DELAY_MS;
        log.warn(
          { until: new Date(until) },
          "scan paused for GitHub rate limit"
        );
        await job.moveToDelayed(until, token);
        // biome-ignore lint/style/useErrorCause: BullMQ control-flow signal, not an error chain
        throw new DelayedError();
      }

      if (isAppError(error) && UNRECOVERABLE_CODES.has(error.code)) {
        log.warn({ code: error.code }, "scan cannot continue");
        await stopScan(db, data.scanId, error.message);
        // biome-ignore lint/style/useErrorCause: BullMQ control-flow signal, not an error chain
        throw new UnrecoverableError(error.message);
      }

      const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      log.error({ err: error, finalAttempt }, "scan attempt failed");
      if (finalAttempt) {
        await stopScan(db, data.scanId, "Scan failed after repeated errors.");
      }
      throw error;
    }
  };
}
