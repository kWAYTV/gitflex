import { Queue } from "bullmq";
import type { Redis } from "ioredis";

import {
  JOB_NAMES,
  QUEUE_NAMES,
  type RunScanJob,
  runScanJobSchema,
  SCAN_JOB_OPTIONS,
} from "./definitions";

export type ScanQueue = Queue<RunScanJob>;

export function createScanQueue(connection: Redis): ScanQueue {
  return new Queue<RunScanJob>(QUEUE_NAMES.scans, {
    connection,
    defaultJobOptions: SCAN_JOB_OPTIONS,
  });
}

/** The scan ID doubles as the job ID, so enqueueing the same scan twice is a no-op. */
export async function enqueueScan(
  queue: ScanQueue,
  payload: RunScanJob
): Promise<void> {
  const data = runScanJobSchema.parse(payload);
  await queue.add(JOB_NAMES.runScan, data, { jobId: data.scanId });
}
