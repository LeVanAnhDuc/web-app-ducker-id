// types
import type {
  NotificationListQuery,
  PaginatedResult
} from "@/modules/notification/types";
import type { NotificationItemDto } from "../dtos";
import type { NotificationRepository } from "../repository/notification.repository";
// common
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// dtos
import { toNotificationItemDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { buildNotificationFilter } from "../helpers";

const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;

export const list = async (
  repo: NotificationRepository,
  query: NotificationListQuery
): Promise<PaginatedResult<NotificationItemDto>> => {
  const userId = RequestContext.requireUserId();
  const page = query.page ?? DEFAULT_PAGE;
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const sortOrder = resolveSortDirection(query.sortOrder);

  const filter = buildNotificationFilter(query, userId);
  const { data, total } = await repo.findByUser(filter, {
    skip,
    limit,
    sort: { createdAt: sortOrder }
  });

  return {
    items: data.map(toNotificationItemDto),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
};
