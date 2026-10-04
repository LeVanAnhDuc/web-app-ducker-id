// types
import type { RecentAppServiceDeps } from "./deps";
// others
import { RequestContext } from "@/utils/request-context";

export const hide = (
  deps: RecentAppServiceDeps,
  appId: string
): Promise<void> =>
  deps.recentAppRepo.hide(RequestContext.requireUserId(), appId, new Date());
