// libs
import { ArrowUpRight } from "lucide-react";
// types
import type { UserApp } from "@/types/Apps";
// components
import CustomImage from "@/components/CustomImage";
// others
import { cn } from "@/libs/utils";

const ResultRow = ({
  id,
  app,
  openLabel,
  isActive,
  onSelect
}: {
  id: string;
  app: UserApp;
  openLabel: string;
  isActive: boolean;
  onSelect: (app: UserApp) => void;
}) => {
  const initial = app.displayName.charAt(0).toUpperCase();
  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      aria-label={`${openLabel} ${app.displayName}`}
      tabIndex={-1}
      onClick={() => onSelect(app)}
      className={cn(
        "group hover:bg-accent flex cursor-pointer items-center justify-between gap-3 rounded-md p-2.5 transition-colors",
        isActive && "bg-accent"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-semibold"
          aria-hidden="true"
        >
          {app.iconUrl ? (
            <CustomImage
              src={app.iconUrl}
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-sm font-semibold">
            {app.displayName}
          </span>
          {app.category && (
            <span className="text-muted-foreground truncate text-xs">
              {app.category}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight
        className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </div>
  );
};

export default ResultRow;
