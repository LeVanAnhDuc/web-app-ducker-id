// libs
import type { LucideIcon } from "lucide-react";
// others
import type NOTIF_GROUP from "@/constants/notifGroup";

export type NotificationListTabValue = "unread" | "read";

export type NotificationPanelTab = "all" | "unread";

export type NotifGroup = (typeof NOTIF_GROUP)[keyof typeof NOTIF_GROUP];

export type ApiNotificationType =
  | "LOGIN_ANOMALY"
  | "ACCOUNT_LOCKED"
  | "APP_AVAILABLE"
  | "ENTITLEMENT_GRANTED"
  | "ENTITLEMENT_REVOKED"
  | "PASSWORD_CHANGED"
  | "SYSTEM_ANNOUNCEMENT";

export interface ApiNotification {
  id: string;
  type: ApiNotificationType;
  title: string;
  message: string;
  meta: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export type NotificationListResponse = Paginated<ApiNotification>;

export interface NotificationListParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export interface NotificationVisual {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}
