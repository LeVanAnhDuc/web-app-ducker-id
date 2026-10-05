"use client";

// types
import type { ApiNotification } from "@/types/Notification";
// components
import NotificationListSkeleton from "@/components/NotificationListSkeleton";
import NotificationEmptyState from "@/components/NotificationEmptyState";
import NotificationErrorState from "@/components/NotificationErrorState";
import NotificationGroups from "../NotificationGroups";

const NotificationListBody = ({
  items,
  isLoading,
  isError,
  onRetry,
  onOpen,
  onMarkRead,
  isMarking
}: {
  items: ApiNotification[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onOpen: (notification: ApiNotification) => void;
  onMarkRead: (id: string) => void;
  isMarking: boolean;
}) => {
  if (isLoading) return <NotificationListSkeleton rows={5} />;
  if (isError) return <NotificationErrorState onRetry={onRetry} />;
  if (items.length === 0) return <NotificationEmptyState />;
  return (
    <NotificationGroups
      items={items}
      onOpen={onOpen}
      onMarkRead={onMarkRead}
      isMarking={isMarking}
    />
  );
};

export default NotificationListBody;
