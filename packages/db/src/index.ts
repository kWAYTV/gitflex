import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig) {
  return drizzle(env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;

export async function pingDatabase(database: Database): Promise<void> {
  await database.execute(sql`select 1`);
}

export async function closeDatabase(database: Database): Promise<void> {
  await database.$client.end();
}
