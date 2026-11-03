import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const profileVisibility = pgEnum("profile_visibility", [
  "public",
  "private",
]);

/** Publication settings, kept out of the Better Auth `user` table so schema regeneration cannot drop them. A missing row means the defaults. */
export const profile = pgTable("profile", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  /** Separate from analysing private repositories: aggregates from them stay unpublished until this is set. */
  publishPrivateAggregates: boolean("publish_private_aggregates")
    .default(false)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  visibility: profileVisibility("visibility").default("public").notNull(),
});

export type ProfileVisibility = (typeof profileVisibility.enumValues)[number];
