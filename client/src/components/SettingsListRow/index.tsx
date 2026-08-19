// libs
import type { ReactNode } from "react";
// others
import { cn } from "@/libs/utils";

const SettingsListRow = ({
  leading,
  title,
  description,
  trailing,
  className
}: {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "border-border flex flex-wrap items-center gap-4 border-b px-6 py-4 last:border-b-0",
      className
    )}
  >
    {leading && (
      <div className="bg-muted/60 border-border flex size-10 shrink-0 items-center justify-center rounded-xl border">
        {leading}
      </div>
    )}
    <div className="min-w-0 flex-1">
      <p className="text-foreground truncate text-sm font-semibold">{title}</p>
      {description && (
        <p className="text-muted-foreground truncate text-sm">{description}</p>
      )}
    </div>
    {trailing && (
      <div className="flex shrink-0 items-center gap-2">{trailing}</div>
    )}
  </div>
);

export default SettingsListRow;
