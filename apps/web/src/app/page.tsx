import { Badge } from "@gitflex/ui/components/badge";
import { Button } from "@gitflex/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import { Separator } from "@gitflex/ui/components/separator";
import Link from "next/link";

import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { EvidenceList } from "@/features/insights/evidence-list";
import { getSession } from "@/server/auth";

const SAMPLE_EVIDENCE = [
  { kind: "configuration", source: "apps/web/next.config.ts" },
  {
    kind: "dependency-with-structure",
    source: "apps/web/src/app/[locale]/about/page.tsx",
  },
  { kind: "dependency", source: "apps/web/package.json#next" },
];

const POINTS = [
  {
    body: "Languages are weighted by the repositories they matter in, so one vendored C library does not turn you into a C developer.",
    title: "Weighted by repositories",
  },
  {
    body: "Every framework, database and tool is detected from manifests, configuration and project structure, and links back to those files.",
    title: "Backed by files",
  },
  {
    body: "Practices such as CI, testing and static typing come from documented rules over detected technologies, never from guesswork.",
    title: "Derived by rules",
  },
];

export default async function Home() {
  const session = await getSession();

  return (
    <div className="container mx-auto grid max-w-5xl gap-16 px-4 py-16 md:py-24">
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-6">
          <h1 className="text-balance font-semibold text-4xl leading-[1.05] tracking-tight md:text-5xl">
            A developer profile you can check line by line.
          </h1>
          <p className="max-w-prose text-pretty text-base text-muted-foreground">
            GitFlex reads your GitHub repositories and builds a profile where
            every language, framework and practice points to the files that
            prove it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {session ? (
              <Button
                nativeButton={false}
                render={<Link href="/dashboard" />}
                size="lg"
              >
                Open your profile
              </Button>
            ) : (
              <div className="w-full max-w-60">
                <GitHubSignInButton />
              </div>
            )}
            <span className="text-muted-foreground text-xs">
              Open source and self-hostable.
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Next.js</CardTitle>
              <Badge variant="outline">Full-stack</Badge>
              <Badge className="ml-auto">Strong evidence</Badge>
            </div>
            <CardDescription>
              Detected in 13 repositories. Evidence from acme/storefront:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EvidenceList evidence={SAMPLE_EVIDENCE} />
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="grid gap-8 md:grid-cols-3">
        {POINTS.map((point) => (
          <div className="grid content-start gap-2" key={point.title}>
            <h2 className="font-medium text-sm">{point.title}</h2>
            <p className="text-muted-foreground text-sm">{point.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
