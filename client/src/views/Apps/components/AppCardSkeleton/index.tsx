// components
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const AppCardSkeleton = () => (
  <Card className="flex flex-col overflow-hidden rounded-xl border p-0">
    <div className="flex flex-col gap-3.5 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="border-border border-t" aria-hidden="true" />
    <div className="flex items-center justify-end px-6 py-3">
      <Skeleton className="h-8 w-20" />
    </div>
  </Card>
);

export default AppCardSkeleton;
