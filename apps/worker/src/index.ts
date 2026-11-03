import { createAuth } from "@gitflex/auth";
import { closeDatabase, createDb } from "@gitflex/db";
import { createRedisConnection } from "@gitflex/queue/connection";
import { QUEUE_NAMES, type RunScanJob } from "@gitflex/queue/definitions";
import { createScanQueue } from "@gitflex/queue/producers";
import { Worker } from "bullmq";

import { ENV } from "./env.server";
import { startHealthServer } from "./health";
import { logger } from "./logger";
import { createScanProcessor } from "./processors/scan";
import { recoverActiveScans } from "./recovery";

const db = createDb(ENV);
const auth = createAuth(ENV, db);
const redis = createRedisConnection(ENV.REDIS_URL);

redis.on("error", (error) =>
  logger.error({ err: error }, "redis connection error")
);

const scanQueue = createScanQueue(redis);
const scanWorker = new Worker<RunScanJob>(
  QUEUE_NAMES.scans,
  createScanProcessor({
    auth,
    concurrency: ENV.SCAN_REPOSITORY_CONCURRENCY,
    db,
    logger,
  }),
  {
    concurrency: ENV.SCAN_JOB_CONCURRENCY,
    connection: redis,
    // Scans run for minutes; a long lock keeps a busy event loop from being mistaken for a stall.
    lockDuration: 5 * 60 * 1000,
  }
);

scanWorker.on("failed", (job, error) =>
  logger.warn({ err: error, jobId: job?.id }, "scan job failed")
);
scanWorker.on("error", (error) =>
  logger.error({ err: error }, "scan worker error")
);

await recoverActiveScans(db, scanQueue, logger);

const healthServer = startHealthServer(ENV.WORKER_HEALTH_PORT, db, redis);
logger.info({ port: healthServer.port }, "worker started");

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "worker shutting down");

  // Waits for in-flight jobs; unfinished repositories resume on the next run.
  await scanWorker.close();
  await scanQueue.close();
  await healthServer.stop();
  await Promise.allSettled([redis.quit(), closeDatabase(db)]);

  logger.info("worker stopped");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
