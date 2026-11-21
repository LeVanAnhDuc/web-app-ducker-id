// types
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
// modules
import { createFavoriteModule } from "@/modules/favorite/favorite.module";
import { createLoginHistoryModule } from "@/modules/login-history/login-history.module";
import { createNotificationModule } from "@/modules/notification/notification.module";
import { createRecentAppModule } from "@/modules/recent-app/recent-app.module";
// others
import { describeRoutes } from "../mount";

type Row = [
  method: string,
  path: string,
  chain: string,
  status: string,
  message: string,
  action: string
];

// Appendix A of docs/specs/routing-controllers/plan.md, migrated modules
// only. Each task that migrates a module adds its rows here.
const EXPECTED: Row[] = [
  [
    "GET",
    "/api/v1/login-history/stats",
    "auth > query:LoginHistoryStatsQueryDto",
    "OK",
    "loginHistory:success.getMyStats",
    "getMyStats"
  ],
  [
    "GET",
    "/api/v1/login-history",
    "auth > query:LoginHistoryQueryDto",
    "OK",
    "loginHistory:success.getMyHistory",
    "getMyHistory"
  ],
  [
    "GET",
    "/api/v1/admin/login-history",
    "auth > admin > query:LoginHistoryAdminQueryDto",
    "OK",
    "loginHistory:success.getAllHistory",
    "getAllHistory"
  ],
  [
    "GET",
    "/api/v1/admin/login-history/:id",
    "auth > admin > params:LoginHistoryIdParamsDto",
    "OK",
    "loginHistory:success.getHistoryDetail",
    "getHistoryDetail"
  ],
  [
    "GET",
    "/api/v1/notifications/unread-count",
    "auth",
    "OK",
    "notification:success.unreadCount",
    "unreadCount"
  ],
  [
    "PATCH",
    "/api/v1/notifications/read-all",
    "auth",
    "OK",
    "notification:success.markAllRead",
    "markAllRead"
  ],
  [
    "GET",
    "/api/v1/notifications",
    "auth > query:NotificationListQueryDto",
    "OK",
    "notification:success.list",
    "list"
  ],
  [
    "PATCH",
    "/api/v1/notifications/:id/read",
    "auth > params:NotificationIdParamsDto",
    "OK",
    "notification:success.markRead",
    "markRead"
  ],
  [
    "GET",
    "/api/v1/users/me/recent-apps",
    "auth > query:ListRecentAppsQueryDto",
    "OK",
    "recentApp:success.list",
    "list"
  ],
  [
    "GET",
    "/api/v1/users/me/recent-apps/stats",
    "auth > query:RecentAppsStatsQueryDto",
    "OK",
    "recentApp:success.stats",
    "stats"
  ],
  [
    "DELETE",
    "/api/v1/users/me/recent-apps",
    "auth",
    "NO_CONTENT",
    "—",
    "clear"
  ],
  [
    "POST",
    "/api/v1/users/me/recent-apps/:appId",
    "auth > rl:recordRecentAppByUser > params:RecentAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "record"
  ],
  [
    "DELETE",
    "/api/v1/users/me/recent-apps/:appId",
    "auth > params:RecentAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "hide"
  ],
  [
    "POST",
    "/api/v1/users/me/recent-apps/:appId/restore",
    "auth > params:RecentAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "restore"
  ],
  [
    "GET",
    "/api/v1/users/me/favorites",
    "auth > query:ListFavoritesQueryDto",
    "OK",
    "favorite:success.list",
    "list"
  ],
  [
    "POST",
    "/api/v1/users/me/favorites/:appId",
    "auth > params:FavoriteAppIdParamsDto",
    "CREATED",
    "favorite:success.add",
    "add"
  ],
  [
    "DELETE",
    "/api/v1/users/me/favorites/:appId",
    "auth > params:FavoriteAppIdParamsDto",
    "NO_CONTENT",
    "—",
    "remove"
  ]
];

// Limiters are only named by the manifest, never called.
const rl = {} as unknown as RateLimiters;

describe("route manifest", () => {
  it("matches Appendix A for the migrated modules", () => {
    const accessPolicy = {} as AccessPolicy;
    const { loginHistoryController, loginHistoryAdminController } =
      createLoginHistoryModule({} as NotificationDispatcher);
    const { notificationController } = createNotificationModule();
    const { favoriteController, favoriteRepository } =
      createFavoriteModule(accessPolicy);
    const { recentAppController } = createRecentAppModule(
      favoriteRepository,
      accessPolicy
    );
    const rows = describeRoutes(
      [
        loginHistoryController,
        loginHistoryAdminController,
        notificationController,
        recentAppController,
        favoriteController
      ],
      rl
    ).map(
      ({ method, path, chain, status, message, action }): Row => [
        method,
        path,
        chain,
        status,
        message,
        action
      ]
    );

    expect(rows).toEqual(EXPECTED);
  });
});
