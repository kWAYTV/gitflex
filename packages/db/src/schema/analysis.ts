import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { repository } from "./repositories";

export const scanStatus = pgEnum("scan_status", [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
  "cancelled",
]);

export const scanTrigger = pgEnum("scan_trigger", [
  "initial",
  "manual",
  "scheduled",
  "webhook",
]);

export const repositoryScanStatus = pgEnum("repository_scan_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const scan = pgTable(
  "scan",
  {
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedRepositories: integer("completed_repositories")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currentStage: text("current_stage"),
    errorSummary: text("error_summary"),
    failedRepositories: integer("failed_repositories").notNull().default(0),
    id: uuid("id").primaryKey().defaultRandom(),
    skippedRepositories: integer("skipped_repositories").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: scanStatus("status").notNull().default("queued"),
    totalRepositories: integer("total_repositories").notNull().default(0),
    triggerType: scanTrigger("trigger_type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("scan_user_created_idx").on(table.userId, table.createdAt),
    // At most one in-flight scan per user; concurrent "scan now" clicks hit this constraint.
    uniqueIndex("scan_user_active_idx")
      .on(table.userId)
      .where(sql`${table.status} in ('queued', 'running')`),
  ]
);

export interface StageSummary {
  durationMs: number;
  error?: string;
  status: "completed" | "failed";
}

export interface RepositoryScanSummary {
  files: {
    analyzed: number;
    excluded: Record<string, number>;
    total: number;
    truncated: boolean;
  };
  manifests: {
    dependencyCount: number;
    ecosystem: string;
    error?: string;
    path: string;
    role: string;
    status: string;
    type: string;
  }[];
  stages: Record<string, StageSummary>;
}

export const repositoryScan = pgTable(
  "repository_scan",
  {
    analyzerVersion: text("analyzer_version").notNull(),
    commitSha: text("commit_sha"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    id: uuid("id").primaryKey().defaultRandom(),
    registryVersion: text("registry_version").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    retryCount: integer("retry_count").notNull().default(0),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scan.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: repositoryScanStatus("status").notNull().default("queued"),
    summary: jsonb("summary").$type<RepositoryScanSummary>(),
  },
  (table) => [
    uniqueIndex("repository_scan_scan_repository_idx").on(
      table.scanId,
      table.repositoryId
    ),
    index("repository_scan_repository_completed_idx").on(
      table.repositoryId,
      table.completedAt
    ),
  ]
);

export const language = pgTable("language", {
  color: text("color"),
  /** Lowercased Linguist name, e.g. `typescript` or `c#`. */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
});

export const repositoryLanguage = pgTable(
  "repository_language",
  {
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    languageId: text("language_id")
      .notNull()
      .references(() => language.id),
    percentage: real("percentage").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    repositoryScanId: uuid("repository_scan_id")
      .notNull()
      .references(() => repositoryScan.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (table) => [
    uniqueIndex("repository_language_scan_language_idx").on(
      table.repositoryScanId,
      table.languageId
    ),
  ]
);

/** Mirror of the version-controlled registry so detections can be joined and queried. */
export const technology = pgTable("technology", {
  category: text("category").notNull(),
  description: text("description").notNull(),
  id: text("id").primaryKey(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  name: text("name").notNull(),
  registryVersion: text("registry_version").notNull(),
  subcategory: text("subcategory").notNull(),
});

export const repositoryTechnology = pgTable(
  "repository_technology",
  {
    confidence: real("confidence").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    repositoryScanId: uuid("repository_scan_id")
      .notNull()
      .references(() => repositoryScan.id, { onDelete: "cascade" }),
    technologyId: text("technology_id")
      .notNull()
      .references(() => technology.id),
    usageType: text("usage_type").notNull(),
  },
  (table) => [
    uniqueIndex("repository_technology_scan_technology_idx").on(
      table.repositoryScanId,
      table.technologyId
    ),
    index("repository_technology_technology_idx").on(table.technologyId),
  ]
);

export const technologyEvidence = pgTable(
  "technology_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    repositoryTechnologyId: uuid("repository_technology_id")
      .notNull()
      .references(() => repositoryTechnology.id, { onDelete: "cascade" }),
    rule: text("rule").notNull(),
    source: text("source").notNull(),
    weight: real("weight").notNull(),
  },
  (table) => [
    index("technology_evidence_repository_technology_idx").on(
      table.repositoryTechnologyId
    ),
  ]
);

export const repositoryDependency = pgTable(
  "repository_dependency",
  {
    constraint: text("constraint"),
    direct: boolean("direct").notNull(),
    ecosystem: text("ecosystem").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    manifestPath: text("manifest_path").notNull(),
    name: text("name").notNull(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    repositoryScanId: uuid("repository_scan_id")
      .notNull()
      .references(() => repositoryScan.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
  },
  (table) => [
    index("repository_dependency_scan_idx").on(table.repositoryScanId),
    index("repository_dependency_package_idx").on(table.ecosystem, table.name),
  ]
);

export type ScanRow = typeof scan.$inferSelect;
export type ScanStatus = (typeof scanStatus.enumValues)[number];
export type ScanTrigger = (typeof scanTrigger.enumValues)[number];
export type RepositoryScanRow = typeof repositoryScan.$inferSelect;
export type RepositoryScanStatus =
  (typeof repositoryScanStatus.enumValues)[number];
