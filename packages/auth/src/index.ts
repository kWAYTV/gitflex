import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@gitflex/db";
import { account, session, user, verification } from "@gitflex/db/schema/auth";
import { type BetterAuthPlugin, betterAuth } from "better-auth";

export interface AuthConfig {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export function createAuth(
  env: AuthConfig,
  database: Database,
  plugins: BetterAuthPlugin[] = []
) {
  return betterAuth({
    account: {
      encryptOAuthTokens: true,
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { account, session, user, verification },
    }),
    // Profile fields are sourced from GitHub; allowing client updates would let users claim arbitrary usernames.
    disabledPaths: ["/update-user"],
    plugins,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        mapProfileToUser: (profile) => ({ username: profile.login }),
        overrideUserInfoOnSignIn: true,
      },
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
    user: {
      additionalFields: {
        username: {
          required: true,
          type: "string",
          unique: true,
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
