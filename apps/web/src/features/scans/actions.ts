"use server";

import { createQueuedScan, stopScan } from "@gitflex/core/analysis/scan";
import { findLatestScan } from "@gitflex/db/queries/analysis";
import { enqueueScan } from "@gitflex/queue/producers";
import {
  type ActionResult,
  AppError,
  toActionError,
} from "@gitflex/shared/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, getSession } from "@/server/auth";
import { getScanQueue } from "@/server/queue";

const startScanInputSchema = z.object({ force: z.boolean().default(false) });

export async function startScanAction(
  input: z.input<typeof startScanInputSchema> = {}
): Promise<ActionResult<{ scanId: string }>> {
  const parsed = startScanInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      code: "VALIDATION_ERROR",
      message: "Invalid scan request.",
      ok: false,
    };
  }

  let scanId: string | null = null;
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "You are not signed in.");
    }
    const userId = session.user.id;
    scanId = await createQueuedScan({ db, triggerType: "manual", userId });
    await enqueueScan(getScanQueue(), {
      force: parsed.data.force,
      scanId,
      userId,
    });

    revalidatePath("/dashboard");
    return { data: { scanId }, ok: true };
  } catch (error) {
    // The row exists but no job will ever pick it up; settle it so the user can retry.
    if (scanId && !(error instanceof AppError)) {
      await stopScan(db, scanId, "Could not queue the scan.").catch(() => null);
    }
    console.error("starting scan failed", error);
    return toActionError(error);
  }
}

export interface ScanStatusView {
  completed: number;
  failed: number;
  id: string;
  skipped: number;
  status: string;
  total: number;
}

export async function getLatestScanStatusAction(): Promise<
  ActionResult<ScanStatusView | null>
> {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "You are not signed in.");
    }
    const scan = await findLatestScan(db, session.user.id);
    return {
      data: scan
        ? {
            completed: scan.completedRepositories,
            failed: scan.failedRepositories,
            id: scan.id,
            skipped: scan.skippedRepositories,
            status: scan.status,
            total: scan.totalRepositories,
          }
        : null,
      ok: true,
    };
  } catch (error) {
    return toActionError(error);
  }
}
