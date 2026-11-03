"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gitflex/ui/components/avatar";
import { Button } from "@gitflex/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gitflex/ui/components/dropdown-menu";
import { Skeleton } from "@gitflex/ui/components/skeleton";
import { LayoutDashboard, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const signOut = useCallback(() => {
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
  }, [router]);

  if (isPending) {
    return <Skeleton className="size-8 rounded-full" />;
  }

  if (!session) {
    return (
      <Button nativeButton={false} render={<Link href="/login" />} size="sm">
        Sign in
      </Button>
    );
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Account"
            className="rounded-full"
            size="icon"
            variant="ghost"
          />
        }
      >
        <Avatar size="sm">
          {user.image ? <AvatarImage alt="" src={user.image} /> : null}
          <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block font-medium text-foreground">
              {user.name}
            </span>
            <span className="block truncate">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            <LayoutDashboard />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/dashboard/technologies" />}>
            <Sparkles />
            Technologies
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={signOut} variant="destructive">
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
