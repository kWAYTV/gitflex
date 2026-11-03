import type { ProfileScore } from "@gitflex/scoring/types";
import {
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { scan } from "./analysis";
import { user } from "./auth";

/** Immutable: a rescore inserts a new snapshot instead of updating one. */
export const profileSnapshot = pgTable(
  "profile_snapshot",
  {
    analyzerVersion: text("analyzer_version").notNull(),
    /** Full result including every metric, its evidence and unknown reasons. */
    breakdown: jsonb("breakdown").$type<ProfileScore>().notNull(),
    confidence: real("confidence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    grade: text("grade"),
    id: uuid("id").primaryKey().defaultRandom(),
    overallScore: real("overall_score"),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scan.id, { onDelete: "cascade" }),
    scoringVersion: text("scoring_version").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("profile_snapshot_scan_version_idx").on(
      table.scanId,
      table.scoringVersion
    ),
    index("profile_snapshot_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);

export const score = pgTable(
  "score",
  {
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
    confidence: real("confidence").notNull(),
    dimension: text("dimension").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    score: real("score"),
    scoringVersion: text("scoring_version").notNull(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => profileSnapshot.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("score_snapshot_dimension_idx").on(
      table.snapshotId,
      table.dimension
    ),
    index("score_user_dimension_idx").on(table.userId, table.dimension),
  ]
);

export type ProfileSnapshotRow = typeof profileSnapshot.$inferSelect;
