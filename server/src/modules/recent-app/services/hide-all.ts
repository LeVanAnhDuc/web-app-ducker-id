// types
import type { RecentAppRepository } from "../repository/recent-app.repository";
// others
import { RequestContext } from "@/utils/request-context";

export const hideAll = (recentAppRepo: RecentAppRepository): Promise<void> =>
  recentAppRepo.hideAll(RequestContext.requireUserId(), new Date());
