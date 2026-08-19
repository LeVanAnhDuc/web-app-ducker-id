"use client";

// libs
import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";

const PageEmptyState = ({
  hasActiveFilters,
  onClearFilters,
  title,
  description,
  icon,
  action
}: {
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) => {
  const t = useTranslations("list");
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        {icon ?? (
          <SearchX
            className="text-muted-foreground size-6"
            aria-hidden="true"
          />
        )}
      </div>
      <h3 className="text-lg font-semibold">
        {title ?? (hasActiveFilters ? t("noResultsTitle") : t("emptyTitle"))}
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm">
        {description ?? t("noResultsDescription")}
      </p>
      {hasActiveFilters && onClearFilters ? (
        <CustomButton type="button" variant="outline" onClick={onClearFilters}>
          {t("clearFilters")}
        </CustomButton>
      ) : (
        action
      )}
    </div>
  );
};

export default PageEmptyState;
