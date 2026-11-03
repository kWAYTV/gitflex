import { and, eq } from "drizzle-orm";

import { account, user } from "../schema/auth";
import type { Executor } from "./repositories";

export async function findUserIdByUsername(
  executor: Executor,
  username: string
): Promise<string | null> {
  const [row] = await executor
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  return row?.id ?? null;
}

/** Returns the internal auth account ID (not the provider's user ID) for a user's provider account. */
export async function findProviderAccountId(
  executor: Executor,
  userId: string,
  providerId: string
): Promise<string | null> {
  const [row] = await executor
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
    .limit(1);
  return row?.id ?? null;
}
