// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES
} from "@/modules/notification/constants";

// common
import type { SortOrder } from "@/common/sort";

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

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  category?: NotificationCategory;
  sortOrder?: SortOrder;
}

export interface NotificationFilter {
  userId: string;
  isRead?: boolean;
  category?: NotificationCategory;
}

export interface NotificationListRequest extends Omit<Request, "query"> {
  query: NotificationListQuery;
}

export interface NotificationIdRequest extends Omit<Request, "params"> {
  params: { id: string };
}
