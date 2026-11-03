"use client";

import { Button } from "@gitflex/ui/components/button";
import { Check, Link2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        new URL(path, window.location.origin).toString()
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  }, [path]);

  return (
    <Button onClick={copy} size="sm" variant="outline">
      {copied ? <Check /> : <Link2 />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
