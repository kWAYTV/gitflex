import { createAuth } from "@gitflex/auth";
import { createDb } from "@gitflex/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
