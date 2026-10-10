// types
import type { NotificationListQuery } from "@/modules/notification/types";
import type { NotificationItemDto } from "../dtos";
import type { NotificationRepository } from "../repository/notification.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toNotificationItemDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { buildNotificationFilter } from "../helpers";

export const list = async (
  repo: NotificationRepository,
  query: NotificationListQuery
): Promise<PaginatedResult<NotificationItemDto>> => {
  const userId = RequestContext.requireUserId();
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildNotificationFilter(query, userId);
  const { data, total } = await repo.findByUser(filter, { skip, limit, sort });

  return {
    items: data.map(toNotificationItemDto),
    meta: toPageMeta(total, page, limit)
  };
};
