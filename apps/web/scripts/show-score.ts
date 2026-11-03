import "varlock/auto-load";

import { closeDatabase, createDb } from "@gitflex/db";
import { findLatestProfileSnapshot } from "@gitflex/db/queries/scoring";
import { findUserIdByUsername } from "@gitflex/db/queries/users";

import { ENV } from "../src/env";

const [, , username] = process.argv;
if (!username) {
  throw new Error("Usage: bun scripts/show-score.ts <github-username>");
}

const db = createDb(ENV);
try {
  const userId = await findUserIdByUsername(db, username);
  if (!userId) {
    throw new Error(`No user with username ${username}`);
  }
  const snapshot = await findLatestProfileSnapshot(db, userId);
  if (!snapshot) {
    throw new Error("No profile snapshot yet. Run a scan first.");
  }
  const { breakdown } = snapshot;
  console.log(
    `Overall ${breakdown.overall ?? "-"} (${breakdown.grade ?? "-"}), confidence ${breakdown.confidence}, scoring ${breakdown.version}`
  );
  for (const dimension of breakdown.dimensions) {
    console.log(
      `\n${dimension.dimension.padEnd(16)} ${String(dimension.score ?? "-").padStart(3)}  confidence ${dimension.confidence}`
    );
    for (const metric of dimension.metrics) {
      console.log(
        `  ${metric.label.padEnd(28)} ${String(metric.score ?? "-").padStart(5)}  ${metric.assessment.padEnd(8)} ${metric.summary}`
      );
    }
  }
} finally {
  await closeDatabase(db);
}
