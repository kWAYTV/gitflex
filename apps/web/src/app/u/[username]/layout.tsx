import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gitflex/ui/components/avatar";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CopyLinkButton } from "@/features/profile/copy-link-button";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { loadPublicProfile } from "@/server/public-profile";

interface Props {
  children: ReactNode;
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: Omit<Props, "children">): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadPublicProfile(username);
  if (!profile) {
    return { title: "Profile not found" };
  }
  const { owner, score } = profile;
  const description =
    score?.result.grade && score.result.overall !== null
      ? `${owner.name}'s GitFlex profile: grade ${score.result.grade}, scored ${score.result.overall} from GitHub repositories.`
      : `${owner.name}'s GitFlex profile, built from GitHub repositories.`;
  return {
    alternates: { canonical: `/u/${owner.username}` },
    description,
    openGraph: { description, title: `${owner.name} (@${owner.username})` },
    title: `${owner.name} (@${owner.username})`,
  };
}

export default async function PublicProfileLayout({ children, params }: Props) {
  const { username } = await params;
  const profile = await loadPublicProfile(username);
  if (!profile) {
    notFound();
  }
  const { owner } = profile;
  const basePath = `/u/${owner.username}`;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6">
      <header className="grid gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14">
            {owner.image ? <AvatarImage alt="" src={owner.image} /> : null}
            <AvatarFallback>{owner.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-2xl tracking-tight">
              {owner.name}
            </h1>
            <a
              className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              href={owner.githubUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              @{owner.username} <ExternalLink className="size-3" />
            </a>
          </div>
          <CopyLinkButton path={basePath} />
        </div>
        <ProfileTabs basePath={basePath} />
      </header>
      {children}
    </div>
  );
}
