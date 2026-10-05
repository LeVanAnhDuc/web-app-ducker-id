"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { ApiNotification } from "@/types/Notification";
// components
import NotificationItem from "@/components/NotificationItem";
import NotificationListSkeleton from "@/components/NotificationListSkeleton";
import NotificationEmptyState from "@/components/NotificationEmptyState";
import NotificationErrorState from "@/components/NotificationErrorState";
// hooks
import { useAnnounce } from "@/hooks";
import useOpenNotification from "@/views/Notifications/hooks/useOpenNotification";
import useMarkNotificationRead from "@/views/Notifications/hooks/useMarkNotificationRead";

const NotificationPanelContent = ({
  items,
  isLoading,
  isError,
  onRetry,
  onNavigate
}: {
  items: ApiNotification[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate?: () => void;
}) => {
  const t = useTranslations("notifications.announce");
  const { announce } = useAnnounce();
  const open = useOpenNotification(onNavigate);
  const markRead = useMarkNotificationRead();
  const handleMarkRead = (id: string) =>
    markRead.mutate(id, { onSuccess: () => announce(t("markedRead")) });
  if (isLoading) return <NotificationListSkeleton rows={3} />;
  if (isError) return <NotificationErrorState onRetry={onRetry} />;
  if (items.length === 0) return <NotificationEmptyState />;
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id}>
          <NotificationItem
            notification={item}
            onOpen={open}
            onMarkRead={handleMarkRead}
            isMarking={markRead.isPending}
          />
        </li>
      ))}
    </ul>
  );
};

export default NotificationPanelContent;
