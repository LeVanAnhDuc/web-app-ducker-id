// types
import type { Schema } from "mongoose";
import type {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES
} from "@/modules/notification/constants";

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

/**
 * Giá trị để client ghép vào câu đã dịch (`notifications.types.<TYPE>`).
 * Chỉ chuỗi/số do server dựng — không bao giờ là HTML.
 */
export type NotificationParams = Record<string, string | number>;

export interface NotificationDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;
  params: NotificationParams;
  link: string | null;
  dedupeKey: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  params: NotificationParams;
  link: string | null;
  dedupeKey?: string | null;
}

export interface NotificationFilter {
  userId: string;
  isRead?: boolean;
  category?: NotificationCategory;
}
