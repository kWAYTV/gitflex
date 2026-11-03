"use client";

import { Button } from "@gitflex/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import { Progress } from "@gitflex/ui/components/progress";
import { ScanSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getLatestScanStatusAction,
  type ScanStatusView,
  startScanAction,
} from "./actions";

const POLL_INTERVAL_MS = 2000;
const ACTIVE_STATUSES = new Set(["queued", "running"]);

const STATUS_LABELS: Record<string, string> = {
  cancelled: "Cancelled",
  completed: "Completed",
  failed: "Failed",
  partial: "Completed with errors",
  queued: "Queued",
  running: "Analyzing",
};

function isActive(scan: ScanStatusView | null): boolean {
  return scan !== null && ACTIVE_STATUSES.has(scan.status);
}

function describe(scan: ScanStatusView | null): string {
  if (!scan) {
    return "Analyze your included repositories to detect languages and technologies.";
  }
  const processed = scan.completed + scan.failed + scan.skipped;
  const parts = [`${processed} of ${scan.total} repositories processed`];
  if (scan.skipped > 0) {
    parts.push(`${scan.skipped} unchanged or skipped`);
  }
  if (scan.failed > 0) {
    parts.push(`${scan.failed} failed`);
  }
  return parts.join(" · ");
}

export function ScanPanel({
  initialScan,
}: {
  initialScan: ScanStatusView | null;
}) {
  const router = useRouter();
  const [scan, setScan] = useState(initialScan);
  const [isStarting, startTransition] = useTransition();
  const active = isActive(scan);

  useEffect(() => {
    if (!active) {
      return;
    }
    let cancelled = false;
    const timer = setInterval(async () => {
      const result = await getLatestScanStatusAction();
      if (cancelled || !result.ok || result.data === null) {
        return;
      }
      setScan(result.data);
      if (!ACTIVE_STATUSES.has(result.data.status)) {
        router.refresh();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, router]);

  const start = useCallback(() => {
    startTransition(async () => {
      const result = await startScanAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setScan({
        completed: 0,
        failed: 0,
        id: result.data.scanId,
        skipped: 0,
        status: "queued",
        total: 0,
      });
    });
  }, []);

  const processed = scan ? scan.completed + scan.failed + scan.skipped : 0;
  const percent =
    scan && scan.total > 0 ? Math.round((processed / scan.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Analysis
          {scan ? ` · ${STATUS_LABELS[scan.status] ?? scan.status}` : ""}
        </CardTitle>
        <CardDescription>{describe(scan)}</CardDescription>
        <CardAction>
          <Button disabled={active || isStarting} onClick={start}>
            <ScanSearch />
            {active ? "Scanning..." : "Scan now"}
          </Button>
        </CardAction>
      </CardHeader>
      {active ? (
        <CardContent>
          <Progress aria-label="Scan progress" value={percent} />
        </CardContent>
      ) : null}
    </Card>
  );
}
