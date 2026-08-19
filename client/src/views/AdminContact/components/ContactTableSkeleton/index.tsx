// components
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 5;

const ContactTableSkeleton = () => (
  <div className="bg-card rounded-xl border p-4">
    <div className="flex flex-col gap-2">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <Skeleton key={`skeleton-${i}`} className="h-12 rounded-lg" />
      ))}
    </div>
  </div>
);

export default ContactTableSkeleton;
