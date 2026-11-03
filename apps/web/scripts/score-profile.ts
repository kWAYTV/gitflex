import "varlock/auto-load";

import { createProfileSnapshot } from "@gitflex/core/scoring/snapshot";
import { closeDatabase, createDb } from "@gitflex/db";
import { findLatestScan } from "@gitflex/db/queries/analysis";
import { findUserIdByUsername } from "@gitflex/db/queries/users";

import { ENV } from "../src/env";

const [, , username] = process.argv;
if (!username) {
  throw new Error("Usage: bun scripts/score-profile.ts <github-username>");
}

const db = createDb(ENV);
try {
  const userId = await findUserIdByUsername(db, username);
  if (!userId) {
    throw new Error(`No user with username ${username}`);
  }
  const scan = await findLatestScan(db, userId);
  if (!scan?.completedAt) {
    throw new Error("No settled scan to score.");
  }
  console.log(`snapshot ${await createProfileSnapshot(db, scan.id)}`);
} finally {
  await closeDatabase(db);
}
