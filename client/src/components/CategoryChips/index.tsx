"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { KeyboardEvent, SyntheticEvent } from "react";
import type { UserCategory } from "@/types/Apps";
// components
import CustomBadge from "@/components/CustomBadge";
import CustomButton from "@/components/CustomButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
// hooks
import { useLocalizedName } from "@/hooks";
// others
import { cn } from "@/libs/utils";

const CHIP_CLASS = "max-w-[12rem] truncate font-medium";

// The card or row around the chips usually opens the app on click; the "+N"
// trigger must not (DR-20).
const stop = (event: SyntheticEvent) => event.stopPropagation();
const stopActivationKeys = (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " ") event.stopPropagation();
};

/**
 * Every category when the container has room (wrapping to at most two lines),
 * otherwise the primary one plus a "+N" that lists the rest. The switch is a
 * container query, so the same card collapses in a narrow grid column too.
 *
 * `interactive={false}` is for chips inside an element that is itself a
 * button or option — a nested button is invalid there, so "+N" is plain text
 * and the full list goes into the label instead.
 */
const CategoryChips = ({
  categories,
  interactive = true,
  className
}: {
  categories: UserCategory[];
  interactive?: boolean;
  className?: string;
}) => {
  const t = useTranslations("common.categoryChips");
  const localize = useLocalizedName();
  const [open, setOpen] = useState(false);

  if (categories.length === 0) return null;

  const names = categories.map((category) => localize(category.name));
  const [primary, ...rest] = names;
  const allLabel = t("all", { names: names.join(", ") });

  const chip = (name: string, key: string) => (
    <CustomBadge
      key={key}
      variant="secondary"
      className={CHIP_CLASS}
      title={name}
    >
      {name}
    </CustomBadge>
  );

  const more =
    rest.length === 0 ? null : interactive ? (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <CustomButton
            type="button"
            variant="outline"
            size="sm"
            aria-label={t("more", { count: rest.length })}
            onClick={stop}
            onPointerDown={stop}
            onKeyDown={stopActivationKeys}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            // A chip-height trigger; the ::after pad keeps the hit area at 44px.
            className="relative h-6 rounded-md px-2 text-xs after:absolute after:-inset-2.5"
          >
            +{rest.length}
          </CustomButton>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-64 p-2"
          onClick={stop}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-muted-foreground px-1 pb-1.5 text-xs font-medium">
            {t("title")}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {names.map((name, index) => (
              <li key={categories[index]._id}>{chip(name, name)}</li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    ) : (
      <CustomBadge variant="outline" title={allLabel}>
        +{rest.length}
      </CustomBadge>
    );

  return (
    <div className={cn("@container min-w-0", className)}>
      <ul
        aria-label={t("title")}
        className="hidden max-h-[3.25rem] flex-wrap gap-1.5 overflow-hidden @[14rem]:flex"
      >
        {categories.map((category, index) => (
          <li key={category._id}>{chip(names[index], category._id)}</li>
        ))}
      </ul>
      <div
        className="flex min-w-0 items-center gap-1.5 @[14rem]:hidden"
        aria-label={interactive ? undefined : allLabel}
      >
        {chip(primary, categories[0]._id)}
        {more}
      </div>
    </div>
  );
};

export default CategoryChips;
