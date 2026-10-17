import type { APIResponse } from "@playwright/test";
import type { BaseClient } from "./base.client";

// /notifications/* — server/src/modules/notification. Every endpoint is behind
// authGuard: reach them as api.as(session).notifications; api.notifications
// sends no Bearer header, for the "not signed in" case.

/** One row as the API returns it: type + params + link, never text. */
export interface NotificationItem {
  id: string;
  type: string;
  category: string;
  params: Record<string, string | number>;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  meta: Record<string, number>;
}

/**
 * Query of GET /notifications: page, limit, isRead, category, sortOrder.
 * Values are passed through untouched, so a spec can send invalid ones.
 */
export type NotificationListQuery = Record<string, string | number | boolean>;

export function createNotificationsClient(base: BaseClient) {
  return {
    list(query: NotificationListQuery = {}): Promise<APIResponse> {
      return base.call("get", "/notifications", { params: query });
    },
    unreadCount(): Promise<APIResponse> {
      return base.call("get", "/notifications/unread-count");
    },
    /** PATCH /notifications/:id/read — `id` is sent as given. */
    markRead(id: string): Promise<APIResponse> {
      return base.call("patch", `/notifications/${id}/read`);
    },
    markAllRead(): Promise<APIResponse> {
      return base.call("patch", "/notifications/read-all");
    }
  };
}

export type NotificationsClient = ReturnType<typeof createNotificationsClient>;
