// libs
import { RotateCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";

const NotificationErrorState = ({ onRetry }: { onRetry: () => void }) => {
  const t = useTranslations("notifications");
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 px-4 py-10 text-center"
    >
      <TriangleAlert className="text-destructive size-8" aria-hidden="true" />
      <p className="font-display text-foreground text-base font-bold">
        {t("states.errorTitle")}
      </p>
      <p className="text-muted-foreground text-sm">{t("states.error")}</p>
      <CustomButton
        variant="outline"
        size="sm"
        iconLeft={<RotateCw className="size-3.5" aria-hidden="true" />}
        onClick={onRetry}
      >
        {t("actions.retry")}
      </CustomButton>
    </div>
  );
};

export default NotificationErrorState;
