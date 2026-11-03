import { ANALYZER_VERSION } from "@gitflex/analyzer/version";
import type { Database } from "@gitflex/db";
import { findScan } from "@gitflex/db/queries/analysis";
import {
  insertProfileSnapshot,
  loadScoringRepositories,
} from "@gitflex/db/queries/scoring";
import { calculateProfileScore } from "@gitflex/scoring/score";
import { AppError } from "@gitflex/shared/errors";

/** Scores a settled scan and stores an immutable snapshot. Safe to call repeatedly. */
export async function createProfileSnapshot(
  db: Database,
  scanId: string
): Promise<string> {
  const scan = await findScan(db, scanId);
  if (!scan?.completedAt) {
    throw new AppError("NOT_FOUND", `Scan ${scanId} has not settled.`);
  }
  const repositories = await loadScoringRepositories(db, scan.userId);
  const result = calculateProfileScore({ now: scan.completedAt, repositories });
  return insertProfileSnapshot(db, {
    analyzerVersion: ANALYZER_VERSION,
    calculatedAt: scan.completedAt,
    result,
    scanId,
    userId: scan.userId,
  });
}
