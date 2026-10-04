// types
import type { NotificationRepository } from "../repository/notification.repository";
// others
import { RequestContext } from "@/utils/request-context";

export const unreadCount = async (
  repo: NotificationRepository
): Promise<{ count: number }> => {
  const userId = RequestContext.requireUserId();
  return { count: await repo.countUnread(userId) };
};
