// types
import type { RecentAppsStatsDto } from "../dtos";
import type { RecentAppsStatsQuery } from "../types";
import type { RecentAppServiceDeps } from "./deps";
// dtos
import { toRecentAppsStatsDto } from "../dtos";
// constants
import { RECENT_APP_STATS } from "../constants";
// others
import { RequestContext } from "@/utils/request-context";

/**
 * Resolved against the catalog first, exactly as `list` does: an app the user
 * can no longer see must not appear in the ranking, and must not be counted in
 * the totals either, or the number on the card and the rows behind it disagree.
 */
export const stats = async (
  deps: RecentAppServiceDeps,
  query: RecentAppsStatsQuery = {}
): Promise<RecentAppsStatsDto> => {
  const userId = RequestContext.requireUserId();
  const role = RequestContext.getUser()?.roles;
  const limit = query.limit ?? RECENT_APP_STATS.TOP_APPS_DEFAULT_LIMIT;

  const usedIds = await deps.recentAppRepo.findVisibleWebAppIds(userId);
  const access = await deps.accessPolicy.resolveScope(userId, role);
  const apps = usedIds.length
    ? await deps.webAppRepo.findActiveByIds(usedIds, { access })
    : [];

  const usages = await deps.recentAppRepo.findUsages(
    userId,
    apps.map((app) => app._id.toString())
  );

  return toRecentAppsStatsDto(apps, usages, limit);
};
