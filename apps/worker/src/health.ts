import { type Database, pingDatabase } from "@gitflex/db";
import { serve } from "bun";
import type { Redis } from "ioredis";

type CheckResult = { ok: true } | { ok: false; error: string };

export interface HealthReport {
  checks: { postgres: CheckResult; redis: CheckResult };
  status: "ok" | "degraded";
}

async function runCheck(check: () => Promise<unknown>): Promise<CheckResult> {
  try {
    await check();
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "unknown error",
      ok: false,
    };
  }
}

export async function checkHealth(
  database: Database,
  redis: Redis
): Promise<HealthReport> {
  const [postgres, redisCheck] = await Promise.all([
    runCheck(() => pingDatabase(database)),
    runCheck(() => redis.ping()),
  ]);

  return {
    checks: { postgres, redis: redisCheck },
    status: postgres.ok && redisCheck.ok ? "ok" : "degraded",
  };
}

export function startHealthServer(
  port: number,
  database: Database,
  redis: Redis
) {
  return serve({
    fetch: () => new Response("Not Found", { status: 404 }),
    port,
    routes: {
      "/health": async () => {
        const report = await checkHealth(database, redis);
        return Response.json(report, {
          status: report.status === "ok" ? 200 : 503,
        });
      },
    },
  });
}
