import { redirect } from "next/navigation";

import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { LogoMark } from "@/components/logo";
import { EvidenceSample } from "@/features/landing/evidence-sample";
import { getSession } from "@/server/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="grid max-w-md gap-6">
        <LogoMark className="size-10" />
        <div className="grid gap-3">
          <h1 className="text-(length:--text-section) font-semibold leading-[1.1] tracking-(--tracking-display)">
            Sign in to GitFlex
          </h1>
          <p className="text-muted-foreground">
            We read your public GitHub profile and email. Repository access is
            requested separately when you sync.
          </p>
        </div>
        <div className="max-w-64">
          <GitHubSignInButton />
        </div>
      </div>
      <EvidenceSample />
    </div>
  );
}
