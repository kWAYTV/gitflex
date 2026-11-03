import { Skeleton } from "@gitflex/ui/components/skeleton";

import { ProfileContentSkeleton } from "@/features/profile/profile-skeleton";

export default function PublicProfileLoading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6">
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="grid gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-full max-w-md" />
      </div>
      <ProfileContentSkeleton />
    </div>
  );
}
