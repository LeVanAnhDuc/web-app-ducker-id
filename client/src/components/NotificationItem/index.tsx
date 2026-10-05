"use client";

// libs
import { useId } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { ApiNotification } from "@/types/Notification";
// components
import CustomButton from "@/components/CustomButton";
import NotificationItemText from "@/components/NotificationItemText";
// hooks
import { useFormatTime, useNotificationText } from "@/hooks";
// dataSources
import { NOTIFICATION_VISUALS } from "@/dataSources/Notifications";
// others
import CONSTANTS from "@/constants";
import { Link } from "@/i18n/navigation";
import { cn } from "@/libs/utils";
import { isInternalLink } from "@/utils/notifications";

const NotificationItem = ({
  notification,
  onOpen,
  onMarkRead,
  isMarking = false
}: {
  notification: ApiNotification;
  onOpen: (notification: ApiNotification) => void;
  onMarkRead: (id: string) => void;
  isMarking?: boolean;
}) => {
  const t = useTranslations("notifications.actions");
  const ft = useFormatTime();
  const renderText = useNotificationText();
  const titleId = useId();
  const { title, body } = renderText(notification);
  const visual =
    NOTIFICATION_VISUALS[notification.type] ??
    NOTIFICATION_VISUALS.SYSTEM_ANNOUNCEMENT;
  const Icon = visual.icon;
  const href = isInternalLink(notification.link) ? notification.link : null;
  const text = (
    <NotificationItemText
      titleId={titleId}
      title={title}
      body={body}
      time={ft("relative", notification.createdAt)}
      isRead={notification.isRead}
    />
  );
  return (
    <article
      aria-labelledby={titleId}
      data-read={notification.isRead}
      className={cn(
        "hover:bg-muted/50 flex items-start gap-3 border-l-2 px-4 py-3 transition-colors duration-150",
        notification.isRead ? "border-l-transparent" : "border-l-keyline"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          visual.iconBg,
          visual.iconColor
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {href ? (
          <Link
            href={href}
            onClick={() => onOpen(notification)}
            className="focus-visible:ring-ring flex cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {text}
          </Link>
        ) : (
          text
        )}
        {notification.type === CONSTANTS.NOTIFICATION.TYPE.LOGIN_ANOMALY ? (
          <Link
            href={CONSTANTS.ROUTES.PROFILE}
            onClick={() => onOpen(notification)}
            className="text-destructive focus-visible:ring-ring w-fit cursor-pointer rounded-sm text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
          >
            {t("notMe")}
          </Link>
        ) : null}
      </div>
      {!notification.isRead ? (
        <CustomButton
          variant="ghost"
          size="icon-sm"
          aria-label={t("markRead")}
          onClick={() => onMarkRead(notification.id)}
          disabled={isMarking}
          className="shrink-0"
        >
          <Check className="size-4" aria-hidden="true" />
        </CustomButton>
      ) : null}
    </article>
  );
};

export default NotificationItem;
