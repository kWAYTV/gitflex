import { getGitHubAccessToken as getToken } from "@gitflex/auth/github-token";

import { auth, db } from "./auth";

export function getGitHubAccessToken(userId: string): Promise<string> {
  return getToken(auth, db, userId);
}
