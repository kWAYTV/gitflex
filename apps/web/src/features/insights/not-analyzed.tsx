import { Button } from "@gitflex/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@gitflex/ui/components/empty";
import Link from "next/link";

export function NotAnalyzed() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Nothing analyzed yet</EmptyTitle>
        <EmptyDescription>
          Run a scan from the overview to populate this section.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button nativeButton={false} render={<Link href="/dashboard" />}>
          Go to overview
        </Button>
      </EmptyContent>
    </Empty>
  );
}
