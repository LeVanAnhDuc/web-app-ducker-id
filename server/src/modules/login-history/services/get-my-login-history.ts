// types
import type {
  LoginHistoryQuery,
  LoginHistoryAdminQuery,
  PaginatedResult
} from "../types";
import type { MyHistoryItemDto } from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// common
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// dtos
import { toMyHistoryItemDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { buildLoginHistoryFilter } from "../helpers";

export const getMyLoginHistory = async (
  loginHistoryRepo: LoginHistoryRepository,
  query: LoginHistoryQuery
): Promise<PaginatedResult<MyHistoryItemDto>> => {
  const userId = RequestContext.requireAuthId();
  const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
  const {
    page = DEFAULT_PAGE,
    limit: rawLimit = DEFAULT_LIMIT,
    sortBy = "createdAt",
    sortOrder: rawSortOrder
  } = query;
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const sortOrder = resolveSortDirection(rawSortOrder);

  const filter = buildLoginHistoryFilter(
    query as LoginHistoryAdminQuery,
    userId
  );
  const { data, total } = await loginHistoryRepo.findByUser(filter, {
    skip,
    limit,
    sort: { [sortBy]: sortOrder }
  });

  return {
    items: data.map(toMyHistoryItemDto),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};
