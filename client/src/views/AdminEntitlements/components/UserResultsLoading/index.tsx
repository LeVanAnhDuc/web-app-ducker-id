// components
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 3;

const UserResultsLoading = () => (
  <div className="flex flex-col gap-1 p-2">
    {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
      <Skeleton key={`user-result-skeleton-${i}`} className="h-14 rounded-md" />
    ))}
  </div>
);

export default UserResultsLoading;
