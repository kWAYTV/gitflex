"use client";

import { Button } from "@gitflex/ui/components/button";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function GitHubSignInButton() {
  const [isPending, setIsPending] = useState(false);

  const signIn = useCallback(async () => {
    setIsPending(true);
    const { error } = await authClient.signIn.social({
      callbackURL: "/dashboard",
      provider: "github",
    });
    if (error) {
      setIsPending(false);
      toast.error(error.message ?? "GitHub sign-in failed");
    }
  }, []);

  return (
    <Button className="w-full" disabled={isPending} onClick={signIn} size="lg">
      {isPending ? "Redirecting to GitHub..." : "Continue with GitHub"}
    </Button>
  );
}
