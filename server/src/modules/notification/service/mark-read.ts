// types
import type { NotificationItemDto } from "../dtos";
import type { NotificationRepository } from "../repository/notification.repository";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toNotificationItemDto } from "../dtos";
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
      i18nMessage: (t) => t("notification:errors.notFound"),
      code: ERROR_CODES.NOTIFICATION_NOT_FOUND
    });
  }
  return toNotificationItemDto(doc);
};
