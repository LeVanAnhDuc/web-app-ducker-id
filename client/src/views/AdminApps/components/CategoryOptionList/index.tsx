"use client";

// libs
import { useTranslations } from "next-intl";
import { Check, Info, Plus } from "lucide-react";
// types
import type { AdminCategory } from "@/types/AdminCategories";
// components
import CustomButton from "@/components/CustomButton";
// hooks
import { useLocalizedName } from "@/hooks";
// others
import { cn } from "@/libs/utils";
import { foldForSearch } from "@/utils";

/**
 * Options filtered by an accent- and case-insensitive match on either
 * language. The create entry follows DR-17: plain "Create category" for an
 * empty search, "Create category "<q>"" when nothing matches the search
 * exactly, nothing when it does.
 */
const CategoryOptionList = ({
  categories,
  selectedIds,
  query,
  atLimit,
  onToggle,
  onCreate
}: {
  categories: AdminCategory[];
  selectedIds: string[];
  query: string;
  atLimit: boolean;
  onToggle: (id: string) => void;
  onCreate: (name: string) => void;
}) => {
  const t = useTranslations("adminApps.form.fields.categoryIds");
  const localize = useLocalizedName();
  const needle = foldForSearch(query);

  const visible = categories.filter(
    (c) =>
      !needle ||
      foldForSearch(c.name.en).includes(needle) ||
      foldForSearch(c.name.vi).includes(needle)
  );
  const exactMatch = categories.some(
    (c) =>
      foldForSearch(c.name.en) === needle || foldForSearch(c.name.vi) === needle
  );
  const trimmed = query.trim();

  return (
    <div className="flex flex-col gap-1">
      {atLimit && (
        <p className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-xs">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          {t("maxReached")}
        </p>
      )}
      <div
        role="listbox"
        aria-multiselectable="true"
        aria-label={t("label")}
        className="max-h-60 overflow-y-auto"
      >
        {visible.length === 0 && (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            {t("noMatch", { query: trimmed })}
          </p>
        )}
        {visible.map((category) => {
          const position = selectedIds.indexOf(category._id);
          const selected = position !== -1;
          const disabled = !selected && atLimit;
          return (
            <button
              key={category._id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => onToggle(category._id)}
              className={cn(
                "hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  selected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground"
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="truncate">{localize(category.name)}</span>
              {position === 0 && (
                <span className="text-muted-foreground ml-auto text-xs">
                  {t("primary")}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!exactMatch && (
        <div className="border-border border-t pt-1">
          <CustomButton
            type="button"
            variant="ghost"
            fullWidth
            disabled={atLimit}
            onClick={() => onCreate(trimmed)}
            iconLeft={<Plus className="size-4" aria-hidden="true" />}
            className="justify-start"
          >
            {trimmed ? t("createNamed", { name: trimmed }) : t("create")}
          </CustomButton>
        </div>
      )}
    </div>
  );
};

export default CategoryOptionList;
