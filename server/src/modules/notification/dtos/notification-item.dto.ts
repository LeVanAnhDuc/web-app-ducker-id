// types
import type {
  NotificationCategory,
  NotificationDocument,
  NotificationParams,
  NotificationType
} from "@/modules/notification/types";

export interface NotificationItemDto {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  params: NotificationParams;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const toNotificationItemDto = (
  doc: NotificationDocument
): NotificationItemDto => ({
  id: doc._id.toString(),
  type: doc.type,
  category: doc.category,
  params: doc.params ?? {},
  link: doc.link ?? null,
  isRead: doc.isRead,
  readAt: doc.readAt ? doc.readAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString()
});
