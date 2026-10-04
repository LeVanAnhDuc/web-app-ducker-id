// types
import type { LoginHistoryAdminQuery, PaginatedResult } from "../types";
import type { AllHistoryItemDto } from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// common
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// dtos
import { toAllHistoryItemDto } from "../dtos";
// others
import { buildLoginHistoryFilter } from "../helpers";

export const getAllLoginHistory = async (
  loginHistoryRepo: LoginHistoryRepository,
  query: LoginHistoryAdminQuery
): Promise<PaginatedResult<AllHistoryItemDto>> => {
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

  const filter = buildLoginHistoryFilter(query);
  const { data, total } = await loginHistoryRepo.findAll(filter, {
    skip,
    limit,
    sort: { [sortBy]: sortOrder }
  });

  return {
    items: data.map(toAllHistoryItemDto),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};
