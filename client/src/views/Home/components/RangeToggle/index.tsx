"use client";

// types
import type { LoginStatsRange } from "@/types/LoginHistory";
import type { HomeMessages, LeafKeyOf } from "@/types/libs";
// libs
import { useTranslations } from "next-intl";
// dataSources
import { HOME_RANGE_OPTIONS } from "@/dataSources/Home";
// others
import { cn } from "@/libs/utils";

const RangeToggle = ({
  value,
  onChange
}: {
  value: LoginStatsRange;
  onChange: (next: LoginStatsRange) => void;
}) => {
  const t = useTranslations("home.range");

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="border-border bg-card inline-flex shrink-0 overflow-hidden rounded-lg border"
    >
      {HOME_RANGE_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            "border-border focus-visible:ring-ring h-9 cursor-pointer border-r px-3.5 text-sm font-medium transition-colors last:border-r-0 focus-visible:ring-2 focus-visible:outline-none",
            option === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {t(option as LeafKeyOf<HomeMessages["range"]>)}
        </button>
      ))}
    </div>
  );
};

export default RangeToggle;
