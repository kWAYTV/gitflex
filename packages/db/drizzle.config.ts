import "varlock/auto-load";
import { defineConfig } from "drizzle-kit";

import { ENV } from "./src/env";

export default defineConfig({
  dbCredentials: {
    url: ENV.DATABASE_URL_UNPOOLED,
  },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema/index.ts",
  schemaFilter: ["public"],
});
