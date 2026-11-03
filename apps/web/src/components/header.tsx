import Link from "next/link";

import { LogoMark } from "./logo";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
        <Link
          className="flex items-center gap-2 font-semibold text-sm"
          href="/"
        >
          <LogoMark className="size-5" />
          GitFlex
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
