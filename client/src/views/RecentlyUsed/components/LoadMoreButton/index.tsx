"use client";
// libs
import { useTranslations } from "next-intl";
// types
import type { RefObject } from "react";
// components
import CustomButton from "@/components/CustomButton";

const LoadMoreButton = ({
  buttonRef,
  loading,
  onClick
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  loading: boolean;
  onClick: () => void;
}) => {
  const t = useTranslations("recentlyUsed");
  return (
    <div className="flex justify-center">
      <CustomButton
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={onClick}
        loading={loading}
      >
        {t("loadMore")}
      </CustomButton>
    </div>
  );
};

export default LoadMoreButton;
