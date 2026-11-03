import { Badge } from "@gitflex/ui/components/badge";
import { Button } from "@gitflex/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gitflex/ui/components/card";
import Link from "next/link";
import type { ReactNode } from "react";

import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { ShareChart } from "@/features/insights/share-chart";
import { EvidenceSample } from "@/features/landing/evidence-sample";
import {
  SAMPLE_DOMAINS,
  SAMPLE_LANGUAGES,
  SAMPLE_SCORE,
} from "@/features/landing/sample";
import { ScoreSummary } from "@/features/scores/score-summary";
import { getSession } from "@/server/auth";

function PrimaryAction({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <Button nativeButton={false} render={<Link href="/dashboard" />} size="lg">
      Open your profile
    </Button>
  ) : (
    <div className="w-full max-w-64">
      <GitHubSignInButton />
    </div>
  );
}

function Feature({
  body,
  children,
  title,
}: {
  body: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-8 border-t pt-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
      <div className="grid content-start gap-3 lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-(length:--text-section) font-semibold leading-[1.1] tracking-(--tracking-display)">
          {title}
        </h2>
        <p className="max-w-[40ch] text-muted-foreground">{body}</p>
      </div>
      <div aria-hidden className="pointer-events-none select-none" inert>
        {children}
      </div>
    </section>
  );
}

export default async function Home() {
  const session = await getSession();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-(--section-gap) px-4 pt-12 pb-24 sm:px-6 md:pt-16">
      <section className="grid items-center gap-12 lg:min-h-[min(calc(100svh-8rem),52rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="grid content-center gap-6">
          <h1 className="text-(length:--text-display) max-w-[14ch] font-semibold leading-[1.02] tracking-(--tracking-display)">
            A developer profile you can check line by line.
          </h1>
          <p className="text-(length:--text-lead) max-w-[46ch] text-muted-foreground leading-relaxed">
            GitFlex reads your GitHub repositories and builds a profile where
            every language, framework and practice points to the files that
            prove it.
          </p>
          <div className="grid justify-items-start gap-3 pt-2">
            <PrimaryAction signedIn={session !== null} />
            <span className="text-muted-foreground text-sm">
              Open source and self-hostable.
            </span>
          </div>
        </div>

        <EvidenceSample />
      </section>

      <div className="grid gap-24">
        <Feature
          body="Languages are weighted by the repositories they matter in, so one vendored C library does not turn you into a C developer."
          title="Weighted by repositories"
        >
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
              <CardDescription>
                Share of repositories where each language is significant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShareChart slices={SAMPLE_LANGUAGES} />
            </CardContent>
          </Card>
        </Feature>

        <Feature
          body="Every framework, database and tool is detected from manifests, configuration and project structure, and links back to those files."
          title="Backed by files"
        >
          <Card>
            <CardHeader>
              <CardTitle>Technologies</CardTitle>
              <CardDescription>
                Most used per domain. Evidence strength is not proficiency.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {SAMPLE_DOMAINS.map((domain) => (
                <div className="grid content-start gap-2" key={domain.name}>
                  <h3 className="font-medium text-muted-foreground text-sm">
                    {domain.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {domain.technologies.map(([name, repositories]) => (
                      <Badge key={name} variant="secondary">
                        {name}
                        <span className="text-muted-foreground tabular-nums">
                          {repositories}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </Feature>

        <Feature
          body="Practices such as CI, testing and static typing come from documented rules over detected technologies, never from guesswork."
          title="Derived by rules"
        >
          <ScoreSummary score={SAMPLE_SCORE} />
        </Feature>
      </div>

      {session ? null : (
        <section className="grid gap-6 rounded-3xl bg-secondary/60 p-8 sm:p-12 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid gap-2">
            <h2 className="text-(length:--text-section) font-semibold leading-[1.1] tracking-(--tracking-display)">
              Sign in to GitFlex
            </h2>
            <p className="max-w-[52ch] text-secondary-foreground">
              We read your public GitHub profile and email. Repository access is
              requested separately when you sync.
            </p>
          </div>
          <GitHubSignInButton />
        </section>
      )}
    </div>
  );
}
