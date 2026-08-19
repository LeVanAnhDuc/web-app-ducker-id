// types
import type {
  NotificationFilter,
  NotificationListQuery
} from "@/modules/notification/types";

export const buildNotificationFilter = (
  query: NotificationListQuery,
  userId: string
): NotificationFilter => {
  const filter: NotificationFilter = { userId };
  if (query.isRead !== undefined) filter.isRead = query.isRead;
  return filter;
};
