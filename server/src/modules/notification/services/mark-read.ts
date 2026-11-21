// types
import type { NotificationRepository } from "../repository/notification.repository";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { NotificationItemDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { ERROR_CODES } from "@/constants/error-code";

export const markRead = async (
  repo: NotificationRepository,
  id: string
): Promise<NotificationItemDto> => {
  const userId = RequestContext.requireUserId();
  const doc = await repo.markRead(id, userId);
  if (!doc) {
    throw new NotFoundError({
      key: "notification:errors.notFound",
      code: ERROR_CODES.NOTIFICATION_NOT_FOUND
    });
  }
  return toDto(NotificationItemDto, doc);
};
