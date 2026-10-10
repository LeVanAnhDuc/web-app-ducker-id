// libs
import type { LucideIcon } from "lucide-react";
// others
import type NOTIF_GROUP from "@/constants/notifGroup";
import type NOTIFICATION from "@/constants/notification";

type ValueOf<T> = T[keyof T];

export type ApiNotificationType = ValueOf<typeof NOTIFICATION.TYPE>;

export type NotificationCategory = ValueOf<typeof NOTIFICATION.CATEGORY>;

export type NotificationStatusTab = ValueOf<typeof NOTIFICATION.STATUS_TAB>;

export type NotificationCategoryFilter =
  | NotificationCategory
  | typeof NOTIFICATION.CATEGORY_FILTER_ALL;

export type NotificationPanelTab = Exclude<NotificationStatusTab, "read">;

export type NotifGroup = (typeof NOTIF_GROUP)[keyof typeof NOTIF_GROUP];

export type NotificationParams = Record<string, string | number>;

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  category: NotificationCategory;
  params: NotificationParams;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export type NotificationListResponse = Paginated<ApiNotification>;

export interface NotificationListParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  category?: NotificationCategory;
}

export interface NotificationVisual {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export interface NotificationCategoryOption {
  value: NotificationCategoryFilter;
  labelKey: "all" | NotificationCategory;
}
