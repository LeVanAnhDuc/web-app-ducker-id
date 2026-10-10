// types
import type { ReactNode } from "react";
import type { RecentGroupKey } from "@/types/RecentlyUsed";
// components
import { Badge } from "@/components/ui/badge";
// others
import { cn } from "@/libs/utils";

const GROUP_DOTS: Record<RecentGroupKey, string> = {
  today: "bg-success",
  yesterday: "bg-warning",
  thisWeek: "bg-muted-foreground",
  earlier: "bg-muted-foreground/60"
};

const RecentAppGroup = ({
  groupKey,
  title,
  countLabel,
  children
}: {
  groupKey: RecentGroupKey;
  title: string;
  countLabel: string;
  children: ReactNode;
}) => (
  <section
    className="flex flex-col gap-3"
    aria-labelledby={`recent-group-${groupKey}`}
  >
    <div className="flex items-center gap-2.5">
      <span
        className={cn("size-2 rounded-full", GROUP_DOTS[groupKey])}
        aria-hidden="true"
      />
      <h2
        id={`recent-group-${groupKey}`}
        className="text-foreground text-base font-bold"
      >
        {title}
      </h2>
      <Badge
        variant="secondary"
        className="bg-muted text-muted-foreground rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold"
      >
        {countLabel}
      </Badge>
    </div>
    <ul className="flex flex-col gap-3">{children}</ul>
  </section>
);

export default RecentAppGroup;
