// types
import type { RecentAppServiceDeps } from "./deps";
// others
import { RequestContext } from "@/utils/request-context";

export const restore = (
  deps: RecentAppServiceDeps,
  appId: string
): Promise<void> =>
  deps.recentAppRepo.restore(RequestContext.requireUserId(), appId);
