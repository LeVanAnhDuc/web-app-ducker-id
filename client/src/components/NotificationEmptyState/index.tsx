// libs
import { BellOff } from "lucide-react";
import { useTranslations } from "next-intl";

const NotificationEmptyState = () => {
  const t = useTranslations("notifications.states");
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <BellOff className="text-muted-foreground size-8" aria-hidden="true" />
      <p className="font-display text-foreground text-base font-bold">
        {t("emptyTitle")}
      </p>
      <p className="text-muted-foreground text-sm">{t("empty")}</p>
    </div>
  );
};

export default NotificationEmptyState;
