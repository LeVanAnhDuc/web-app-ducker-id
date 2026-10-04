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
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
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

  // Role-scoped visibility: admins see the full active catalog; everyone else
  // (non-admins, and any unauthenticated edge case) sees only apps whose
  // requiredRoles include the USER role. Matching a scalar against the array
  // field returns documents whose requiredRoles array contains that role.
  if (role !== AUTHENTICATION_ROLES.ADMIN) {
    filter.requiredRoles = AUTHENTICATION_ROLES.USER;
  }

  const [docs, total] = await Promise.all([
    deps.webAppRepo.findActivePaginated(filter, { skip, limit }),
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
    // minTotalPages: 1 giữ nguyên hiện trạng của riêng endpoint này — sáu
    // endpoint phân trang khác trả totalPages 0 khi rỗng. Xem toPageMeta.
    meta: toPageMeta(total, page, limit, { minTotalPages: 1 })
  };
};
