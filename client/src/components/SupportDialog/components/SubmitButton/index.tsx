"use client";

// libs
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";

const SubmitButton = ({ isSubmitting }: { isSubmitting: boolean }) => {
  const t = useTranslations("support.form.button");
  return (
    <CustomButton type="submit" loading={isSubmitting} fullWidth>
      {isSubmitting ? t("submitting") : t("submit")}
    </CustomButton>
  );
};

export default SubmitButton;
