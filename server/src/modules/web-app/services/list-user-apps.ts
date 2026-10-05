// types
import type { UserAppsQuery } from "../types";
import type { PaginatedResult } from "@/common/pagination";
import type { UserAppDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// dtos
import { toUserAppDto } from "../dtos";
// others
import { buildWebAppFilter } from "../helpers";
import { WEB_APP_STATUS_PUBLIC } from "../constants";
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { buildAccessFilter } from "@/modules/entitlement/entitlement.helper";
import { RequestContext } from "@/utils/request-context";

export const listUserApps = async (
  deps: WebAppServiceDeps,
  query: UserAppsQuery,
  role?: string
): Promise<PaginatedResult<UserAppDto>> => {
  // Không dùng `sort` của resolvePaging: findActivePaginated chỉ nhận
  // skip/limit, thứ tự do pipeline aggregate của repository quyết định.
  const { page, limit, skip } = resolvePaging(query);
  const filter = buildWebAppFilter({
    search: query.search,
    status: WEB_APP_STATUS_PUBLIC.ACTIVE,
    categoryId: query.categoryId
  });

  // Access = role default + the user's overrides. The clauses go into `$and`
  // because `buildWebAppFilter` already put the search into `$or`.
  const userId = RequestContext.getUserId();
  const scope = await deps.accessPolicy.resolveScope(userId, role);
  const accessClauses = buildAccessFilter(scope);
  if (accessClauses.length > 0) filter.$and = accessClauses;

  const [docs, total] = await Promise.all([
    deps.webAppRepo.findActivePaginated(filter, { skip, limit }),
    deps.webAppRepo.countActive(filter)
  ]);

  const favoriteIds = userId
    ? await deps.favoriteRepo.findFavoritedAppIds(
        userId,
        docs.map((d) => d._id.toString())
      )
    : new Set<string>();

  return {
    items: docs.map((d) => toUserAppDto(d, favoriteIds.has(d._id.toString()))),
    meta: toPageMeta(total, page, limit)
  };
};
