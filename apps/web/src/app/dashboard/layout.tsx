import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gitflex/ui/components/avatar";
import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ProfileTabs } from "@/features/profile/profile-tabs";
import { getSession } from "@/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const { user } = session;

  return (
    <div className="container mx-auto grid max-w-5xl gap-6 px-4 py-6">
      <header className="grid gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            {user.image ? <AvatarImage alt="" src={user.image} /> : null}
            <AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate font-bold text-xl">{user.name}</h1>
            <a
              className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
              href={`https://github.com/${user.username}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              @{user.username} <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <ProfileTabs />
      </header>
      {children}
    </div>
  );
}
