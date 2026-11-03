import "varlock/auto-load";

import { createAuth } from "@gitflex/auth";
import { syncUserRepositories } from "@gitflex/core/repositories/sync";
import { closeDatabase, createDb } from "@gitflex/db";
import { listUserRepositories } from "@gitflex/db/queries/repositories";
import {
  findProviderAccountId,
  findUserIdByUsername,
} from "@gitflex/db/queries/users";

import { ENV } from "../src/env";

const [, , username] = process.argv;
if (!username) {
  throw new Error("Usage: bun scripts/sync-repositories.ts <github-username>");
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

  const result = await syncUserRepositories({ accessToken, db, userId });
  console.log(result);

  const repositories = await listUserRepositories(db, userId);
  for (const repository of repositories) {
    const included = repository.included ? "[x]" : "[ ]";
    const fork = repository.isFork ? "fork " : "     ";
    console.log(
      `${included} ${repository.ownership.padEnd(12)} ${fork}${repository.fullName}`
    );
  }
} finally {
  await closeDatabase(db);
}
