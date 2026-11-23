// types
import type { PaginatedResult } from "@/common/pagination";
import type { RecentAppDto } from "./types";
import type {
  ListRecentAppsQueryDto,
  RecentAppsStatsQueryDto
} from "./dtos/requests";
import type { RecentAppsStatsDto } from "./dtos";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { RecentAppRepository } from "./repository/recent-app.repository";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { NotFoundError } from "@/exceptions";
// dtos
import { toRecentAppDto, toRecentAppsStatsDto } from "./dtos";
// constants
import { RECENT_APP_CONFIG, RECENT_APP_STATS } from "./constants";
// modules
import { isAppVisibleTo } from "@/modules/web-app/helpers";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export class RecentAppService {
  constructor(
    private readonly recentAppRepo: RecentAppRepository,
    private readonly webAppRepo: WebAppRepository,
    private readonly favoriteRepo: FavoriteRepository,
    private readonly accessPolicy: AccessPolicy
  ) {}

  /**
   * Visibility and search are resolved against the catalog first, so the page
   * query and its total only count rows that will render: a page never comes
   * back short because an app was deactivated or did not match the search.
   */
  async list(
    query: ListRecentAppsQueryDto
  ): Promise<PaginatedResult<RecentAppDto>> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;
    const { page, limit, skip, sort } = resolvePaging(
      query,
      RECENT_APP_CONFIG.SORT_FIELD
    );

    const usedIds = await this.recentAppRepo.findVisibleWebAppIds(userId);
    const access = await this.accessPolicy.resolveScope(userId, role);
    const apps = usedIds.length
      ? await this.webAppRepo.findActiveByIds(usedIds, {
          access,
          search: query.search
        })
      : [];
    const appById = new Map(apps.map((app) => [app._id.toString(), app]));

    const { data, total } = await this.recentAppRepo.findPage(
      userId,
      [...appById.keys()],
      { skip, limit, sort }
    );

    const favoriteIds = await this.favoriteRepo.findFavoritedAppIds(
      userId,
      data.map((row) => row.webAppId)
    );

    const items = data.flatMap((row) => {
      const app = appById.get(row.webAppId);
      return app
        ? [toRecentAppDto(app, row, favoriteIds.has(row.webAppId))]
        : [];
    });

    return { items, meta: toPageMeta(total, page, limit) };
  }

  /**
   * Resolved against the catalog first, exactly as `list` does: an app the user
   * can no longer see must not appear in the ranking, and must not be counted in
   * the totals either, or the number on the card and the rows behind it disagree.
   */
  async stats(
    query: RecentAppsStatsQueryDto = {}
  ): Promise<RecentAppsStatsDto> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;
    const limit = query.limit ?? RECENT_APP_STATS.TOP_APPS_DEFAULT_LIMIT;

    const usedIds = await this.recentAppRepo.findVisibleWebAppIds(userId);
    const access = await this.accessPolicy.resolveScope(userId, role);
    const apps = usedIds.length
      ? await this.webAppRepo.findActiveByIds(usedIds, { access })
      : [];

    const usages = await this.recentAppRepo.findUsages(
      userId,
      apps.map((app) => app._id.toString())
    );

    return toRecentAppsStatsDto(apps, usages, limit);
  }

  async recordLaunch(appId: string): Promise<void> {
    const userId = RequestContext.requireUserId();
    const role = RequestContext.getUser()?.roles;

    const [app, scope] = await Promise.all([
      this.webAppRepo.findById(appId),
      this.accessPolicy.resolveScope(userId, role)
    ]);
    if (!isAppVisibleTo(app, scope)) {
      throw new NotFoundError({
        key: "recentApp:errors.appNotFound",
        code: ERROR_CODES.RECENT_APP_NOT_FOUND
      });
    }

    await this.recentAppRepo.record(
      userId,
      appId,
      new Date(),
      RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
    );
  }

  /**
   * Server-side write for a user already authorised for the app (the OIDC
   * authorize step), so there is no visibility check here.
   */
  record(userId: string, webAppId: string): Promise<void> {
    return this.recentAppRepo.record(
      userId,
      webAppId,
      new Date(),
      RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
    );
  }

  hide(appId: string): Promise<void> {
    return this.recentAppRepo.hide(
      RequestContext.requireUserId(),
      appId,
      new Date()
    );
  }

  hideAll(): Promise<void> {
    return this.recentAppRepo.hideAll(
      RequestContext.requireUserId(),
      new Date()
    );
  }

  restore(appId: string): Promise<void> {
    return this.recentAppRepo.restore(RequestContext.requireUserId(), appId);
  }
}
