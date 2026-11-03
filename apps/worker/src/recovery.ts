import type { Database } from "@gitflex/db";
import { listActiveScans } from "@gitflex/db/queries/analysis";
import { enqueueScan, type ScanQueue } from "@gitflex/queue/producers";
import type { Logger } from "pino";

/**
 * Re-enqueues scans the database still considers active. Job IDs equal scan IDs,
 * so scans whose job is still in Redis are untouched; only orphans (Redis flush,
 * enqueue failure after the row was written) get a new job.
 */
export async function recoverActiveScans(
  db: Database,
  queue: ScanQueue,
  logger: Logger
): Promise<number> {
  const scans = await listActiveScans(db);
  let recovered = 0;
  for (const scan of scans) {
    // biome-ignore lint/performance/noAwaitInLoops: startup task over a handful of rows; sequential keeps Redis load flat
    const existing = await queue.getJob(scan.id);
    const state = existing ? await existing.getState() : null;
    // A finished job under the same ID would block re-adding it.
    if (existing && (state === "completed" || state === "failed")) {
      await existing.remove();
    }
    if (!existing || state === "completed" || state === "failed") {
      await enqueueScan(queue, {
        force: false,
        scanId: scan.id,
        userId: scan.userId,
      });
      recovered += 1;
    }
  }
  if (recovered > 0) {
    logger.info({ recovered }, "re-enqueued orphaned scans");
  }
  return recovered;
}
