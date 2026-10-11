// components
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors NotificationItem's layout so the list does not jump on load. */
const NotificationListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="flex items-start gap-3 border-l-2 border-l-transparent px-4 py-3"
      >
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-14 shrink-0" />
          </div>
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);

export default NotificationListSkeleton;
