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
  if (query.category !== undefined) filter.category = query.category;
  return filter;
};

/**
 * Link của notification chỉ được là đường dẫn trong chính client: bắt đầu bằng
 * một `/`, không phải `//` (protocol-relative sẽ thoát sang origin khác) và
 * không có `\` (trình duyệt coi `/\evil.com` như `//evil.com`).
 */
export const isInternalLink = (link: string): boolean =>
  link.startsWith("/") && !link.startsWith("//") && !link.includes("\\");
