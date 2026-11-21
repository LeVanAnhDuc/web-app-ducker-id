// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { RecentAppRepository } from "../repository/recent-app.repository";
// commons
import { NotFoundError } from "@/exceptions";
// modules
import { isAppVisibleTo } from "@/modules/web-app/helpers";
// constants
import { RECENT_APP_CONFIG } from "../constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export const recordLaunch = async (
  deps: {
    recentAppRepo: RecentAppRepository;
    webAppRepo: WebAppRepository;
    accessPolicy: AccessPolicy;
  },
  appId: string
): Promise<void> => {
  const userId = RequestContext.requireUserId();
  const role = RequestContext.getUser()?.roles;

  const [app, scope] = await Promise.all([
    deps.webAppRepo.findById(appId),
    deps.accessPolicy.resolveScope(userId, role)
  ]);
  if (!isAppVisibleTo(app, scope)) {
    throw new NotFoundError({
      key: "recentApp:errors.appNotFound",
      code: ERROR_CODES.RECENT_APP_NOT_FOUND
    });
  }

  await deps.recentAppRepo.record(
    userId,
    appId,
    new Date(),
    RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
  );
};
