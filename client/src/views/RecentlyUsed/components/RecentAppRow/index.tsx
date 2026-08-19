// libs
import { ArrowUpRight, Timer } from "lucide-react";
// types
import type { LucideIcon } from "lucide-react";
// components
import CardItemTitle from "@/components/CardItemTitle";
import CustomButton from "@/components/CustomButton";
import { Card } from "@/components/ui/card";
// others
import { cn } from "@/libs/utils";

const RecentAppRow = ({
  name,
  category,
  time,
  icon: Icon,
  iconColor,
  iconBg,
  openLabel
}: {
  name: string;
  category: string;
  time: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  openLabel: string;
}) => (
  <Card
    className="flex flex-row items-center gap-3.5 rounded-xl border p-4"
    aria-labelledby={`recent-${name}-${time}-title`}
  >
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl",
        iconBg
      )}
      aria-hidden="true"
    >
      <Icon className={cn("size-5.5", iconColor)} />
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <CardItemTitle id={`recent-${name}-${time}-title`}>{name}</CardItemTitle>
      <span className="text-muted-foreground text-xs">{category}</span>
    </div>
    <div className="text-info flex items-center gap-1.5">
      <Timer className="size-3.5" aria-hidden="true" />
      <span className="text-xs font-semibold">
        <span className="sr-only">Last opened: </span>
        {time}
      </span>
    </div>
    <CustomButton
      size="sm"
      iconRight={<ArrowUpRight className="size-3" aria-hidden="true" />}
      aria-label={`${openLabel} ${name}`}
    >
      {openLabel}
    </CustomButton>
  </Card>
);

export default RecentAppRow;
