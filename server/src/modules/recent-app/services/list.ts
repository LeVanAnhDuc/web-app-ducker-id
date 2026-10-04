// types
import type { PaginatedResult } from "@/common/pagination";
import type { ListRecentAppsQuery, RecentAppDto } from "../types";
import type { RecentAppServiceDeps } from "./deps";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toRecentAppDto } from "../dtos";
// constants
import { RECENT_APP_CONFIG } from "../constants";
// others
import { RequestContext } from "@/utils/request-context";

/**
 * Visibility and search are resolved against the catalog first, so the page
 * query and its total only count rows that will render: a page never comes
 * back short because an app was deactivated or did not match the search.
 */
export const list = async (
  deps: RecentAppServiceDeps,
  query: ListRecentAppsQuery
): Promise<PaginatedResult<RecentAppDto>> => {
  const userId = RequestContext.requireUserId();
  const role = RequestContext.getUser()?.roles;
  const { page, limit, skip, sort } = resolvePaging(
    query,
    RECENT_APP_CONFIG.SORT_FIELD
  );

  const usedIds = await deps.recentAppRepo.findVisibleWebAppIds(userId);
  const apps = usedIds.length
    ? await deps.webAppRepo.findActiveByIds(usedIds, {
        role,
        search: query.search
      })
    : [];
  const appById = new Map(apps.map((app) => [app._id.toString(), app]));

  const { data, total } = await deps.recentAppRepo.findPage(
    userId,
    [...appById.keys()],
    { skip, limit, sort }
  );

  const favoriteIds = await deps.favoriteRepo.findFavoritedAppIds(
    userId,
    data.map((row) => row.webAppId)
  );

  const items = data.flatMap((row) => {
    const app = appById.get(row.webAppId);
    return app ? [toRecentAppDto(app, row, favoriteIds.has(row.webAppId))] : [];
  });

  return { items, meta: toPageMeta(total, page, limit) };
};
