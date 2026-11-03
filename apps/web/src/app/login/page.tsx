import { redirect } from "next/navigation";

import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { getSession } from "@/server/auth";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm p-6">
      <h1 className="mb-2 font-bold text-2xl">Sign in to GitFlex</h1>
      <p className="mb-6 text-muted-foreground text-sm">
        We read your public GitHub profile and email. Repository access is
        requested separately.
      </p>
      <GitHubSignInButton />
    </div>
  );
}
