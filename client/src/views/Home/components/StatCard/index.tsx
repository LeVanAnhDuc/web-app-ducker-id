// types
import type { LucideIcon } from "lucide-react";
import type { StatTone } from "@/dataSources/Home";
// libs
import { ArrowRight } from "lucide-react";
// components
import { Skeleton } from "@/components/ui/skeleton";
// others
import { Link } from "@/i18n/navigation";
import { cn } from "@/libs/utils";

const ICON_TONE: Record<StatTone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive"
};

/**
 * Every card on Home leads somewhere, so every card is an anchor — middle
 * click, "open in new tab" and the screen reader's link list all work, which a
 * div with an onClick quietly takes away.
 */
const StatCard = ({
  icon: Icon,
  tone,
  value,
  label,
  hint,
  href,
  viewLabel,
  isLoading
}: {
  icon: LucideIcon;
  tone: StatTone;
  value: number;
  label: string;
  hint: string;
  href: string;
  viewLabel: string;
  isLoading?: boolean;
}) => (
  <Link
    href={href}
    aria-label={`${label}: ${value}. ${viewLabel}`}
    className="bg-card border-border hover:border-primary/40 focus-visible:ring-ring group relative flex flex-col gap-3 rounded-xl border p-6 transition-[border-color,box-shadow] hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
  >
    <ArrowRight
      className="text-muted-foreground/60 group-hover:text-primary absolute top-6 right-6 size-4 transition-colors"
      aria-hidden="true"
    />
    <span
      className={cn(
        "flex size-11 items-center justify-center rounded-xl",
        ICON_TONE[tone]
      )}
      aria-hidden="true"
    >
      <Icon className="size-6" />
    </span>
    {isLoading ? (
      <Skeleton className="h-9 w-16" />
    ) : (
      <span
        className="text-foreground text-3xl font-bold tabular-nums"
        aria-hidden="true"
      >
        {value}
      </span>
    )}
    <span className="text-muted-foreground text-sm" aria-hidden="true">
      {label}
    </span>
    <span className="text-muted-foreground/80 text-xs" aria-hidden="true">
      {hint}
    </span>
  </Link>
);

export default StatCard;
