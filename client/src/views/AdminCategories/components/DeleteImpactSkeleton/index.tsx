// components
import { Skeleton } from "@/components/ui/skeleton";

const DeleteImpactSkeleton = () => (
  <div className="flex flex-col gap-2" aria-busy="true">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export default DeleteImpactSkeleton;
