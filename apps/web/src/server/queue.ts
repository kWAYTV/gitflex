import { createRedisConnection } from "@gitflex/queue/connection";
import { createScanQueue, type ScanQueue } from "@gitflex/queue/producers";

import { ENV } from "@/env";

const globalForQueue = globalThis as unknown as { scanQueue?: ScanQueue };

/** One connection per server process; dev hot reloads would otherwise leak a client per edit. */
export function getScanQueue(): ScanQueue {
  globalForQueue.scanQueue ??= createScanQueue(
    createRedisConnection(ENV.REDIS_URL)
  );
  return globalForQueue.scanQueue;
}
