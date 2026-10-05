// types
import type { RecentAppServiceDeps } from "./deps";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { isAppVisibleTo } from "@/modules/web-app/helpers";
// constants
import { RECENT_APP_CONFIG } from "../constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

/** The launcher reports that the current user opened an app. */
export const recordLaunch = async (
  deps: RecentAppServiceDeps,
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
      i18nMessage: (t) => t("recentApp:errors.appNotFound"),
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
