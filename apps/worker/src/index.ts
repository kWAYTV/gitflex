import { closeDatabase, createDb } from "@gitflex/db";
import { Redis } from "ioredis";

import { ENV } from "./env.server";
import { startHealthServer } from "./health";
import { logger } from "./logger";

const db = createDb(ENV);
const redis = new Redis(ENV.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

redis.on("error", (error) =>
  logger.error({ err: error }, "redis connection error")
);

await redis.connect();

const healthServer = startHealthServer(ENV.WORKER_HEALTH_PORT, db, redis);
logger.info({ port: healthServer.port }, "worker started");

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "worker shutting down");

  await healthServer.stop();
  await Promise.allSettled([redis.quit(), closeDatabase(db)]);

  logger.info("worker stopped");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
