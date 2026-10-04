// types
import type { PaginatedResult, UserAppsQuery } from "../types";
import type { UserAppDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// dtos
import { toUserAppDto } from "../dtos";
// others
import { buildWebAppFilter } from "../helpers";
import { WEB_APP_STATUS_PUBLIC } from "../constants";
import { PAGINATION } from "@/common/pagination";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import { RequestContext } from "@/utils/request-context";

export const listUserApps = async (
  deps: WebAppServiceDeps,
  query: UserAppsQuery,
  role?: string
): Promise<PaginatedResult<UserAppDto>> => {
  const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const filter = buildWebAppFilter({
    search: query.search,
    status: WEB_APP_STATUS_PUBLIC.ACTIVE,
    categoryId: query.categoryId
  });

  // Role-scoped visibility: admins see the full active catalog; everyone else
  // (non-admins, and any unauthenticated edge case) sees only apps whose
  // requiredRoles include the USER role. Matching a scalar against the array
  // field returns documents whose requiredRoles array contains that role.
  if (role !== AUTHENTICATION_ROLES.ADMIN) {
    filter.requiredRoles = AUTHENTICATION_ROLES.USER;
  }

  const [docs, total] = await Promise.all([
    deps.webAppRepo.findActivePaginated(filter, {
      skip: (page - 1) * limit,
      limit
    }),
    deps.webAppRepo.countActive(filter)
  ]);

  const userId = RequestContext.getUserId();
  const favoriteIds = userId
    ? await deps.favoriteRepo.findFavoritedAppIds(
        userId,
        docs.map((d) => d._id.toString())
      )
    : new Set<string>();

  return {
    items: docs.map((d) => toUserAppDto(d, favoriteIds.has(d._id.toString()))),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};
