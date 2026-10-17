"use client";

// libs
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

const UnlockRequestStep = ({
  isRequesting,
  onRequest
}: {
  isRequesting: boolean;
  onRequest: () => void;
}) => {
  const t = useTranslations("login.unlock");

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-center text-sm">
        {t("description")}
      </p>
      <CustomButton
        type="button"
        loading={isRequesting}
        fullWidth
        onClick={onRequest}
      >
        {t("button.request")}
      </CustomButton>
      <div className="text-center">
        <Link
          href={LOGIN}
          className="text-primary text-sm transition-colors duration-200 hover:underline"
        >
          {t("button.backToLogin")}
        </Link>
      </div>
    </div>
  );
};

export default UnlockRequestStep;
