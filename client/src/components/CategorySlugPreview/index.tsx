"use client";

// libs
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useWatch } from "react-hook-form";
// types
import type { AdminCategoryFormValues } from "@/types/AdminCategories";
// others
import CONSTANTS from "@/constants";
import { slugifyCategoryName } from "@/utils";

const { NAME_EN } = CONSTANTS.FIELD_NAMES.ADMIN_CATEGORY_FIELD_NAMES;

/**
 * Live preview of the slug the server will derive from name.en. When editing,
 * a changed slug shows as `old → new`. A `-2` suffix for a taken slug is only
 * known after saving — the server is the source of truth.
 */
const CategorySlugPreview = ({ currentSlug }: { currentSlug?: string }) => {
  const t = useTranslations("adminCategories.form.fields.slug");
  const nameEn = useWatch<AdminCategoryFormValues>({ name: NAME_EN });
  const preview = slugifyCategoryName(String(nameEn ?? ""));
  const changed =
    currentSlug !== undefined && preview && preview !== currentSlug;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" id="category-slug-label">
        {t("label")}
      </span>
      <div
        aria-labelledby="category-slug-label"
        aria-live="polite"
        className="border-border bg-muted text-muted-foreground flex h-10 items-center gap-2 overflow-hidden rounded-lg border border-dashed px-3 font-mono text-sm"
      >
        {changed ? (
          <>
            <span className="truncate line-through">{currentSlug}</span>
            <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="text-foreground truncate">{preview}</span>
          </>
        ) : (
          <span className="truncate">
            {preview || currentSlug || t("empty")}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {currentSlug === undefined ? t("hintCreate") : t("hintEdit")}
      </p>
    </div>
  );
};

export default CategorySlugPreview;
