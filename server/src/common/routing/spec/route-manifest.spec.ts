// types
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
// modules
import { createFavoriteModule } from "@/modules/favorite/favorite.module";
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
    const { favoriteController } = createFavoriteModule({} as AccessPolicy);
    const rows = describeRoutes([favoriteController], rl).map(
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
