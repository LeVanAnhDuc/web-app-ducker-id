// libs
import { Check } from "lucide-react";
// types
import type { ApiNotificationType } from "@/types/Notification";
// components
import CustomButton from "@/components/CustomButton";
// others
import { NOTIFICATION_VISUALS } from "@/dataSources/Notifications";
import { cn } from "@/libs/utils";

const NotificationItem = ({
  type,
  title,
  message,
  timestamp,
  isRead,
  markReadLabel,
  onMarkRead,
  isMarking = false
}: {
  type: ApiNotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  markReadLabel: string;
  onMarkRead: () => void;
  isMarking?: boolean;
}) => {
  const visual = NOTIFICATION_VISUALS[type];
  const Icon = visual.icon;
  return (
    <article
      aria-label={title}
      className={cn(
        "border-border flex items-start gap-3 border-b px-5 py-4",
        !isRead && "bg-info/5"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          visual.iconBg,
          visual.iconColor
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-foreground text-sm font-semibold">{title}</p>
          <span className="text-muted-foreground shrink-0 text-xs">
            {timestamp}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      </div>
      {!isRead ? (
        <CustomButton
          variant="ghost"
          size="icon-sm"
          aria-label={markReadLabel}
          onClick={onMarkRead}
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
