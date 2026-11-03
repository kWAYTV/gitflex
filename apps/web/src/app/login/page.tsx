import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import { redirect } from "next/navigation";

import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { LogoMark } from "@/components/logo";
import { getSession } from "@/server/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="grid place-items-center px-4 py-24">
      <Card className="w-full max-w-sm">
        <CardHeader className="gap-3">
          <LogoMark className="size-7" />
          <CardTitle className="text-lg">Sign in to GitFlex</CardTitle>
          <CardDescription className="text-sm">
            We read your public GitHub profile and email. Repository access is
            requested separately when you sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GitHubSignInButton />
        </CardContent>
      </Card>
    </div>
  );
}
