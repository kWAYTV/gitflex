import { LogoMark } from "./logo";

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-muted-foreground text-sm sm:px-6">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <LogoMark className="size-5" />
          GitFlex
        </span>
        <span>Open source and self-hostable.</span>
        <span className="ml-auto tabular-nums">{new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
