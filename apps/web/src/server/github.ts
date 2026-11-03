import { findProviderAccountId } from "@gitflex/db/queries/users";
import { AppError } from "@gitflex/shared/errors";

import { auth, db } from "./auth";

const RECONNECT_MESSAGE =
  "GitHub access is missing or expired. Sign in with GitHub again.";

export async function getGitHubAccessToken(userId: string): Promise<string> {
  const accountId = await findProviderAccountId(db, userId, "github");
  if (!accountId) {
    throw new AppError("GITHUB_NOT_CONNECTED", RECONNECT_MESSAGE);
  }

  const tokens = await auth.api
    .getAccessToken({ body: { accountId, userId } })
    .catch((error: unknown) => {
      throw new AppError("GITHUB_TOKEN_INVALID", RECONNECT_MESSAGE, {
        cause: error,
      });
    });

  if (!tokens.accessToken) {
    throw new AppError("GITHUB_TOKEN_INVALID", RECONNECT_MESSAGE);
  }
  return tokens.accessToken;
}
