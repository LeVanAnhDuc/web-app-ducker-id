// types
import type { NotificationListQueryDto } from "../dtos/requests";
import type { NotificationRepository } from "../repository/notification.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { NotificationItemDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { buildNotificationFilter } from "../helpers";

export const list = async (
  repo: NotificationRepository,
  query: NotificationListQueryDto
): Promise<PaginatedResult<NotificationItemDto>> => {
  const userId = RequestContext.requireUserId();
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildNotificationFilter(query, userId);
  const { data, total } = await repo.findByUser(filter, { skip, limit, sort });

  return {
    items: toDto(NotificationItemDto, data),
    meta: toPageMeta(total, page, limit)
  };
};
