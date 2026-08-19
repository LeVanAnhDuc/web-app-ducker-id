"use client";

// libs
import { LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";

const EntitlementMatrixEmpty = () => {
  const t = useTranslations("adminEntitlements.matrix.empty");
  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <LayoutGrid
          className="text-muted-foreground size-8"
          aria-hidden="true"
        />
        <p className="text-foreground text-sm font-medium">{t("title")}</p>
        <p className="text-muted-foreground max-w-xs text-xs">
          {t("description")}
        </p>
      </div>
    </div>
  );
};

export default EntitlementMatrixEmpty;
