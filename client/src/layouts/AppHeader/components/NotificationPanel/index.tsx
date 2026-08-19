"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { NotificationPanelTab } from "@/types/Notification";
// components
import CustomButton from "@/components/CustomButton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// hooks
import { useAnnounce, useFormatTime } from "@/hooks";
import useNotifications from "@/views/Notifications/hooks/useNotifications";
import useUnreadCount from "@/views/Notifications/hooks/useUnreadCount";
import useMarkAllRead from "@/views/Notifications/hooks/useMarkAllRead";
// others
import { NOTIFICATION_VISUALS } from "@/dataSources/Notifications";
import { cn } from "@/libs/utils";
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const NotificationPanel = ({ onNavigate }: { onNavigate?: () => void }) => {
  const router = useRouter();
  const t = useTranslations("dashboard.notifications");
  const { announce } = useAnnounce();
  const ft = useFormatTime();
  const [activeTab, setActiveTab] = useState<NotificationPanelTab>("all");

  const { data } = useNotifications(activeTab === "unread" ? false : undefined);
  const { data: unread } = useUnreadCount();
  const markAllRead = useMarkAllRead();

  const items = data?.pages[0]?.items ?? [];
  const unreadCount = unread?.count ?? 0;

  const handleMarkAllRead = () => {
    markAllRead.mutate();
    announce(t("markAllRead"));
  };

  const handleViewAll = () => {
    announce(t("viewAllAnnounce"));
    onNavigate?.();
    router.push(CONSTANTS.ROUTES.NOTIFICATIONS);
  };

  return (
    <div className="bg-card border-border flex w-[380px] flex-col overflow-hidden rounded-xl border shadow-lg">
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-base font-semibold">
            {t("title")}
          </span>
          <Badge className="flex h-5 items-center justify-center rounded-full px-2 text-xs">
            {unreadCount}
          </Badge>
          <div className="flex-1" />
          <CustomButton
            variant="link"
            size="sm"
            className="text-muted-foreground h-auto p-0"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
          >
            {t("markAllRead")}
          </CustomButton>
        </div>
        <div className="flex">
          {(["all", "unread"] as const).map((tab) => (
            <CustomButton
              key={tab}
              variant="ghost"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-auto rounded-none px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "text-foreground border-foreground border-b-2"
                  : "text-muted-foreground"
              )}
            >
              {t(tab)}
            </CustomButton>
          ))}
        </div>
      </div>
      <div className="max-h-[360px] overflow-y-auto px-2 py-1">
        {items.map((item) => {
          const visual = NOTIFICATION_VISUALS[item.type];
          const Icon = visual.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "hover:bg-muted/50 relative flex cursor-pointer items-start gap-3 rounded-lg px-2 py-3 transition-colors",
                item.isRead && "opacity-50"
              )}
            >
              {!item.isRead && (
                <span className="bg-info absolute top-1/2 left-1 size-2 -translate-y-1/2 rounded-full" />
              )}
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  visual.iconBg,
                  visual.iconColor
                )}
                aria-hidden="true"
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground truncate text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {ft("relative", item.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm leading-snug">
                  {item.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <Separator />
      <div className="flex justify-center px-4 py-3">
        <CustomButton
          variant="ghost"
          size="sm"
          className="text-sm font-medium"
          onClick={handleViewAll}
        >
          {t("viewAll")}
        </CustomButton>
      </div>
    </div>
  );
};

export default NotificationPanel;
