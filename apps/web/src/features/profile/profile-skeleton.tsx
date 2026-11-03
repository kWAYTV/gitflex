import { Skeleton } from "@gitflex/ui/components/skeleton";

export function ProfileContentSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6">
      <span className="sr-only">Loading profile</span>
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
