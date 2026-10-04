// types
import type {
  NotificationListQuery,
  PaginatedResult
} from "@/modules/notification/types";
import type { NotificationItemDto } from "../dtos";
import type { NotificationRepository } from "../repository/notification.repository";
// others
import { list } from "./list";
import { markAllRead } from "./mark-all-read";
import { markRead } from "./mark-read";
import { unreadCount } from "./unread-count";

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  list(
    query: NotificationListQuery
  ): Promise<PaginatedResult<NotificationItemDto>> {
    return list(this.repo, query);
  }

  unreadCount(): Promise<{ count: number }> {
    return unreadCount(this.repo);
  }

  markRead(id: string): Promise<NotificationItemDto> {
    return markRead(this.repo, id);
  }

  markAllRead(): Promise<{ updated: number }> {
    return markAllRead(this.repo);
  }
}
