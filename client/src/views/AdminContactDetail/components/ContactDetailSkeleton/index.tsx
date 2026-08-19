// components
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 6;

const ContactDetailSkeleton = () => (
  <div className="bg-card space-y-3 rounded-xl border p-6">
    {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
      <Skeleton key={`skeleton-${i}`} className="h-8 rounded-lg" />
    ))}
  </div>
);

export default ContactDetailSkeleton;
