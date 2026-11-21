// types
import type { RecentAppRepository } from "../repository/recent-app.repository";
// others
import { RequestContext } from "@/utils/request-context";

export const restore = (
  recentAppRepo: RecentAppRepository,
  appId: string
): Promise<void> =>
  recentAppRepo.restore(RequestContext.requireUserId(), appId);
