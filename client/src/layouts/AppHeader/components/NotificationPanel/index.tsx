"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { NotificationPanelTab } from "@/types/Notification";
// components
import CustomButton from "@/components/CustomButton";
import CustomBadge from "@/components/CustomBadge";
import { Separator } from "@/components/ui/separator";
import NotificationPanelContent from "../NotificationPanelContent";
// hooks
import { useAnnounce } from "@/hooks";
import useNotifications from "@/views/Notifications/hooks/useNotifications";
import useUnreadCount from "@/views/Notifications/hooks/useUnreadCount";
import useMarkAllRead from "@/views/Notifications/hooks/useMarkAllRead";
// others
import CONSTANTS from "@/constants";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/libs/utils";

const { STATUS_TAB, PANEL_LIMIT } = CONSTANTS.NOTIFICATION;

const PANEL_TABS: NotificationPanelTab[] = [STATUS_TAB.ALL, STATUS_TAB.UNREAD];

const NotificationPanel = ({ onNavigate }: { onNavigate?: () => void }) => {
  const router = useRouter();
  const t = useTranslations("dashboard.notifications");
  const tAnnounce = useTranslations("notifications.announce");
  const { announce } = useAnnounce();
  const [activeTab, setActiveTab] = useState<NotificationPanelTab>(
    STATUS_TAB.ALL
  );
  const list = useNotifications({
    isRead: activeTab === STATUS_TAB.UNREAD ? false : undefined,
    limit: PANEL_LIMIT
  });
  const { data: unread } = useUnreadCount();
  const markAllRead = useMarkAllRead();
  const items = list.data?.pages[0]?.items ?? [];
  const unreadCount = unread?.count ?? 0;
  const handleMarkAllRead = () =>
    markAllRead.mutate(undefined, {
      onSuccess: () => announce(tAnnounce("markedAllRead"))
    });
  const handleViewAll = () => {
    announce(t("viewAllAnnounce"));
    onNavigate?.();
    router.push(CONSTANTS.ROUTES.NOTIFICATIONS);
  };
  return (
    <div className="bg-card border-border flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-lg">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="font-display text-foreground text-base font-bold">
          {t("title")}
        </span>
        {unreadCount > 0 ? (
          <CustomBadge className="h-5 rounded-full px-2 text-xs">
            {unreadCount}
          </CustomBadge>
        ) : null}
        <div className="flex-1" />
        <CustomButton
          variant="link"
          size="sm"
          className="text-primary px-0"
          onClick={handleMarkAllRead}
          disabled={markAllRead.isPending || unreadCount === 0}
        >
          {t("markAllRead")}
        </CustomButton>
      </div>
      <div className="border-border flex gap-1 border-b px-4">
        {PANEL_TABS.map((tab) => (
          <CustomButton
            key={tab}
            variant="ghost"
            size="sm"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-none border-b-2 px-3",
              activeTab === tab
                ? "text-foreground border-keyline"
                : "text-muted-foreground border-transparent"
            )}
          >
            {t(tab)}
          </CustomButton>
        ))}
      </div>
      <div className="max-h-[420px] overflow-y-auto overscroll-contain py-1">
        <NotificationPanelContent
          items={items}
          isLoading={list.isLoading}
          isError={list.isError}
          onRetry={() => list.refetch()}
          onNavigate={onNavigate}
        />
      </div>
      <Separator />
      <div className="flex justify-center px-4 py-2">
        <CustomButton variant="ghost" size="sm" onClick={handleViewAll}>
          {t("viewAll")}
        </CustomButton>
      </div>
    </div>
  );
};

export default NotificationPanel;
