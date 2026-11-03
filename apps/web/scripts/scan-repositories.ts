import "varlock/auto-load";

import { createAuth } from "@gitflex/auth";
import { runRepositoryScan } from "@gitflex/core/analysis/scan";
import { closeDatabase, createDb } from "@gitflex/db";
import {
  findProviderAccountId,
  findUserIdByUsername,
} from "@gitflex/db/queries/users";

import { ENV } from "../src/env";

const args = process.argv.slice(2);
const force = args.includes("--force");
const username = args.find((arg) => !arg.startsWith("--"));
if (!username) {
  throw new Error(
    "Usage: bun scripts/scan-repositories.ts <github-username> [--force]"
  );
}

const db = createDb(ENV);
const auth = createAuth(ENV, db);

try {
  const userId = await findUserIdByUsername(db, username);
  if (!userId) {
    throw new Error(`No user with username ${username}`);
  }
  const accountId = await findProviderAccountId(db, userId, "github");
  if (!accountId) {
    throw new Error("User has no GitHub account");
  }
  const { accessToken } = await auth.api.getAccessToken({
    body: { accountId, userId },
  });

  const result = await runRepositoryScan({
    accessToken,
    db,
    force,
    onProgress: (repository, outcome) => {
      let detail: string;
      if (outcome.status === "completed") {
        detail = `${outcome.technologies} technologies`;
      } else if (outcome.status === "skipped") {
        detail = outcome.reason;
      } else {
        detail = `${outcome.code}: ${outcome.message}`;
      }
      console.log(
        `${outcome.status.padEnd(9)} ${repository.fullName.padEnd(50)} ${detail}`
      );
    },
    triggerType: "manual",
    userId,
  });
  console.log(result);
} finally {
  await closeDatabase(db);
}
