import { createAuth } from "@gitflex/auth";
import { createDb } from "@gitflex/db";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { cache } from "react";

import { ENV } from "@/env";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db, [nextCookies()]);

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);
