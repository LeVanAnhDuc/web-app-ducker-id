// types
import type { ReactNode } from "react";
// components
import { Badge } from "@/components/ui/badge";
// others
import { cn } from "@/libs/utils";

const StatCard = ({
  icon,
  iconBg,
  value,
  label,
  badge,
  badgeBg,
  badgeText
}: {
  icon: ReactNode;
  iconBg: string;
  value: string;
  label: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
}) => (
  <div
    className="bg-card border-border flex flex-col gap-3 rounded-xl border p-6"
    role="group"
    aria-label={`${label}: ${value}`}
  >
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-xl",
        iconBg
      )}
      aria-hidden="true"
    >
      {icon}
    </div>
    <span className="text-foreground text-3xl font-bold" aria-hidden="true">
      {value}
    </span>
    <span className="text-muted-foreground text-sm" aria-hidden="true">
      {label}
    </span>
    <Badge
      variant="secondary"
      className={cn(
        "w-fit rounded-full border-0 px-2 py-1 text-xs font-medium",
        badgeBg,
        badgeText
      )}
    >
      {badge}
    </Badge>
  </div>
);

export default StatCard;
