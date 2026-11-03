import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const repositoryVisibility = pgEnum("repository_visibility", [
  "public",
  "private",
  "internal",
]);

export const repositoryOwnerType = pgEnum("repository_owner_type", [
  "user",
  "organization",
]);

export const repositoryOwnership = pgEnum("repository_ownership", [
  "owner",
  "organization",
  "collaborator",
]);

export const repository = pgTable(
  "repository",
  {
    defaultBranch: text("default_branch"),
    description: text("description"),
    forks: integer("forks").notNull(),
    fullName: text("full_name").notNull(),
    githubCreatedAt: timestamp("github_created_at", {
      withTimezone: true,
    }).notNull(),
    githubId: bigint("github_id", { mode: "number" }).notNull(),
    githubUpdatedAt: timestamp("github_updated_at", {
      withTimezone: true,
    }).notNull(),
    htmlUrl: text("html_url").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    isArchived: boolean("is_archived").notNull(),
    isDisabled: boolean("is_disabled").notNull(),
    isFork: boolean("is_fork").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
    license: text("license"),
    name: text("name").notNull(),
    nodeId: text("node_id").notNull(),
    ownerGithubId: bigint("owner_github_id", { mode: "number" }).notNull(),
    ownerLogin: text("owner_login").notNull(),
    ownerType: repositoryOwnerType("owner_type").notNull(),
    parentFullName: text("parent_full_name"),
    parentGithubId: bigint("parent_github_id", { mode: "number" }),
    primaryLanguage: text("primary_language"),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
    sizeKb: integer("size_kb").notNull(),
    stars: integer("stars").notNull(),
    topics: text("topics").array().notNull().default([]),
    visibility: repositoryVisibility("visibility").notNull(),
    watchers: integer("watchers").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("repository_github_id_idx").on(table.githubId),
    index("repository_owner_login_idx").on(table.ownerLogin),
  ]
);

export const repositorySelection = pgTable(
  "repository_selection",
  {
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    included: boolean("included").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    ownership: repositoryOwnership("ownership").notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("repository_selection_user_repository_idx").on(
      table.userId,
      table.repositoryId
    ),
    index("repository_selection_repository_idx").on(table.repositoryId),
  ]
);

export type RepositoryRow = typeof repository.$inferSelect;
export type RepositoryInsert = typeof repository.$inferInsert;
export type RepositorySelectionRow = typeof repositorySelection.$inferSelect;
export type RepositoryOwnership =
  (typeof repositoryOwnership.enumValues)[number];
