// types
import type { RecentAppRepository } from "../repository/recent-app.repository";
// others
import { RequestContext } from "@/utils/request-context";

export const hide = (
  recentAppRepo: RecentAppRepository,
  appId: string
): Promise<void> =>
  recentAppRepo.hide(RequestContext.requireUserId(), appId, new Date());
