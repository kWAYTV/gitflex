import { Redis } from "ioredis";

/**
 * BullMQ requires `maxRetriesPerRequest: null` on connections used by workers
 * so blocking commands survive reconnects instead of failing jobs.
 */
export function createRedisConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}
