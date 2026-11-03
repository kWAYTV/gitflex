import type { DefaultJobOptions } from "bullmq";
import { z } from "zod";

export const QUEUE_NAMES = {
  scans: "scans",
} as const;

export const JOB_NAMES = {
  runScan: "scan.run",
} as const;

export const runScanJobSchema = z.object({
  force: z.boolean().default(false),
  scanId: z.uuid(),
  userId: z.string().min(1),
});

export type RunScanJob = z.infer<typeof runScanJobSchema>;

export const SCAN_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { delay: 30_000, type: "exponential" },
  removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
  removeOnFail: { age: 30 * 24 * 3600 },
};
