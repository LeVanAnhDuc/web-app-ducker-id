// components
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RecentAppsSkeleton = () => (
  <div className="flex flex-col gap-3">
    <Skeleton className="h-5 w-32" />
    {Array.from({ length: 5 }).map((_, idx) => (
      <Card
        key={`recent-skeleton-${idx}`}
        className="flex flex-row items-center gap-3.5 rounded-xl border p-4"
      >
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </Card>
    ))}
  </div>
);

export default RecentAppsSkeleton;
