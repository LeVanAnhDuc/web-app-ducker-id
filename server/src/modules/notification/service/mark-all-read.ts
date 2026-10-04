// types
import type { NotificationRepository } from "../repository/notification.repository";
// others
import { RequestContext } from "@/utils/request-context";

export const markAllRead = async (
  repo: NotificationRepository
): Promise<{ updated: number }> => {
  const userId = RequestContext.requireUserId();
  return { updated: await repo.markAllRead(userId) };
};
