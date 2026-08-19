// components
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 4;
const SKELETON_COL_COUNT = 5;

const EntitlementMatrixSkeleton = () => (
  <div className="bg-card rounded-xl border p-4">
    <div className="flex items-center gap-4 pb-4">
      <Skeleton className="h-4 w-32 rounded-md" />
      {Array.from({ length: SKELETON_COL_COUNT }).map((_, i) => (
        <Skeleton
          key={`entitlement-matrix-skeleton-head-${i}`}
          className="size-9 shrink-0 rounded-xl"
        />
      ))}
    </div>
    {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
      <div
        key={`entitlement-matrix-skeleton-row-${rowIndex}`}
        className="flex items-center gap-4 border-t py-3"
      >
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-32 rounded-md" />
        {Array.from({ length: SKELETON_COL_COUNT }).map((_, colIndex) => (
          <Skeleton
            key={`entitlement-matrix-skeleton-cell-${rowIndex}-${colIndex}`}
            className="ml-6 size-4 shrink-0 rounded-md"
          />
        ))}
      </div>
    ))}
  </div>
);

export default EntitlementMatrixSkeleton;
