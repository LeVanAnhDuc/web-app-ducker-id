// types
import type { PaginatedResult } from "@/common/pagination";
import type { NotificationListQueryDto } from "./dtos/requests";
import type { NotificationRepository } from "./repository/notification.repository";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { NotFoundError } from "@/exceptions";
// dtos
import { NotificationItemDto } from "./dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { buildNotificationFilter } from "./helpers";
import { ERROR_CODES } from "@/constants/error-code";

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async list(
    query: NotificationListQueryDto
  ): Promise<PaginatedResult<NotificationItemDto>> {
    const userId = RequestContext.requireUserId();
    const { page, limit, skip, sort } = resolvePaging(query);

    const filter = buildNotificationFilter(query, userId);
    const { data, total } = await this.repo.findByUser(filter, {
      skip,
      limit,
      sort
    });

    return {
      items: toDto(NotificationItemDto, data),
      meta: toPageMeta(total, page, limit)
    };
  }

  async unreadCount(): Promise<{ count: number }> {
    const userId = RequestContext.requireUserId();
    return { count: await this.repo.countUnread(userId) };
  }

  async markRead(id: string): Promise<NotificationItemDto> {
    const userId = RequestContext.requireUserId();
    const doc = await this.repo.markRead(id, userId);
    if (!doc) {
      throw new NotFoundError({
        key: "notification:errors.notFound",
        code: ERROR_CODES.NOTIFICATION_NOT_FOUND
      });
    }
    return toDto(NotificationItemDto, doc);
  }

  async markAllRead(): Promise<{ updated: number }> {
    const userId = RequestContext.requireUserId();
    return { updated: await this.repo.markAllRead(userId) };
  }
}
