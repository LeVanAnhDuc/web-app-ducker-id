// types
import type {
  NotificationDocument,
  NotificationType
} from "@/modules/notification/types";

export interface NotificationItemDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const toNotificationItemDto = (
  doc: NotificationDocument
): NotificationItemDto => ({
  id: doc._id.toString(),
  type: doc.type,
  title: doc.title,
  message: doc.message,
  meta: doc.meta,
  isRead: doc.isRead,
  readAt: doc.readAt ? doc.readAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString()
});
