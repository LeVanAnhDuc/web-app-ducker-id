"use client";

// libs
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";

const DeleteImpactError = ({ onRetry }: { onRetry: () => void }) => {
  const t = useTranslations("adminCategories");

  return (
    <div className="flex flex-col items-start gap-3" role="alert">
      <p>{t("delete.loadError")}</p>
      <CustomButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        iconLeft={<RotateCcw className="size-4" aria-hidden="true" />}
      >
        {t("actions.retry")}
      </CustomButton>
    </div>
  );
};

export default DeleteImpactError;
