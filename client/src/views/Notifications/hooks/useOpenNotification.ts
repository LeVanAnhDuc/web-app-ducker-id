// types
import type { ApiNotification } from "@/types/Notification";
// others
import useMarkNotificationRead from "./useMarkNotificationRead";

/**
 * Opening a notification reads it. Navigation itself is the item's `Link`, so
 * this only fires the mark-read and whatever the caller adds (closing the
 * header panel).
 */
const useOpenNotification = (onOpened?: () => void) => {
  const markRead = useMarkNotificationRead();

  return (notification: ApiNotification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    onOpened?.();
  };
};

export default useOpenNotification;
