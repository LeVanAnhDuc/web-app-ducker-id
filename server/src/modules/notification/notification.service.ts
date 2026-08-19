// types
import type { NotificationRepository } from "./notification.repository";
import type {
  NotificationListQuery,
  PaginatedResult
} from "@/modules/notification/types";
import type { NotificationItemDto } from "./dtos";
// common
import { NotFoundError } from "@/common/exceptions";
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// dtos
import { toNotificationItemDto } from "./dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { ERROR_CODES } from "@/constants/error-code";
// helpers
import { buildNotificationFilter } from "./helpers";

const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;

export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async list(
    query: NotificationListQuery
  ): Promise<PaginatedResult<NotificationItemDto>> {
    const userId = RequestContext.requireUserId();
    const page = query.page ?? DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortOrder = resolveSortDirection(query.sortOrder);

    const filter = buildNotificationFilter(query, userId);
    const { data, total } = await this.repo.findByUser(filter, {
      skip,
      limit,
      sort: { createdAt: sortOrder }
    });

    return {
      items: data.map(toNotificationItemDto),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
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
        i18nMessage: (t) => t("notification:errors.notFound"),
        code: ERROR_CODES.NOTIFICATION_NOT_FOUND
      });
    }
    return toNotificationItemDto(doc);
  }

  async markAllRead(): Promise<{ updated: number }> {
    const userId = RequestContext.requireUserId();
    return { updated: await this.repo.markAllRead(userId) };
  }
}
