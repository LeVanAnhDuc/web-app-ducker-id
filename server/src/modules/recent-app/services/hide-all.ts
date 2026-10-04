// types
import type { RecentAppServiceDeps } from "./deps";
// others
import { RequestContext } from "@/utils/request-context";

export const hideAll = (deps: RecentAppServiceDeps): Promise<void> =>
  deps.recentAppRepo.hideAll(RequestContext.requireUserId(), new Date());
