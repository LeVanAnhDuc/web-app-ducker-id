// types
import type {
  NotificationDocument,
  NotificationFilter
} from "@/modules/notification/types";
import type { PaginationOptions } from "@/types/common";

export interface NotificationRepository {
  findByUser(
    filter: NotificationFilter,
    options: PaginationOptions
  ): Promise<{ data: NotificationDocument[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<NotificationDocument | null>;
  markAllRead(userId: string): Promise<number>;
}
