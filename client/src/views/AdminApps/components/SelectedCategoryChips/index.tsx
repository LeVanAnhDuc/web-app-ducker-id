"use client";

// libs
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
// types
import type { AdminCategory } from "@/types/AdminCategories";
// components
import CustomBadge from "@/components/CustomBadge";
import CustomButton from "@/components/CustomButton";
// hooks
import { useLocalizedName } from "@/hooks";
// others
import { cn } from "@/libs/utils";

/** Chosen categories in order; the first carries the "Primary" mark and the brass keyline. */
const SelectedCategoryChips = ({
  selected,
  disabled,
  onRemove
}: {
  selected: AdminCategory[];
  disabled: boolean;
  onRemove: (id: string) => void;
}) => {
  const t = useTranslations("adminApps.form.fields.categoryIds");
  const localize = useLocalizedName();

  return (
    <ul aria-label={t("label")} className="flex min-w-0 flex-wrap gap-1.5">
      {selected.map((category, index) => {
        const name = localize(category.name);
        return (
          <li key={category._id}>
            <CustomBadge
              variant="secondary"
              className={cn(
                "max-w-[14rem] gap-1 pr-0.5",
                index === 0 && "border-l-keyline border-l-2"
              )}
            >
              <span className="truncate" title={name}>
                {name}
              </span>
              {index === 0 && (
                <span className="text-muted-foreground text-[0.625rem] font-normal">
                  · {t("primary")}
                </span>
              )}
              <CustomButton
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label={t("remove", { name })}
                onClick={() => onRemove(category._id)}
                // Chip-sized; the ::after pad keeps the hit area at 44px.
                className="relative size-5 rounded-sm after:absolute after:-inset-3"
              >
                <X className="size-3" aria-hidden="true" />
              </CustomButton>
            </CustomBadge>
          </li>
        );
      })}
    </ul>
  );
};

export default SelectedCategoryChips;
