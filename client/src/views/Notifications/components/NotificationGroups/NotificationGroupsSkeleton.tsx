// components
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the GroupHeader + NotificationItem layout to prevent layout shift. */
const SkeletonGroupHeader = () => (
  <div className="bg-muted/60 border-border flex items-center border-b px-5 py-2">
    <Skeleton className="h-3 w-16" />
  </div>
);

const SkeletonNotificationItem = () => (
  <div className="border-border flex items-start gap-3 border-b px-5 py-4">
    {/* icon circle */}
    <Skeleton className="size-10 shrink-0 rounded-full" />
    {/* text block */}
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-14 shrink-0" />
      </div>
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
);

const SKELETON_GROUPS = [3, 2] as const;

const NotificationGroupsSkeleton = () => (
  <div aria-hidden="true">
    {SKELETON_GROUPS.map((count, gi) => (
      <div key={gi}>
        <SkeletonGroupHeader />
        {Array.from({ length: count }, (_, i) => (
          <SkeletonNotificationItem key={i} />
        ))}
      </div>
    ))}
  </div>
);

export default NotificationGroupsSkeleton;
