// types
import type { LoginHistoryAdminQuery } from "../types";
import type { AllHistoryItemDto } from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toAllHistoryItemDto } from "../dtos";
// others
import { buildLoginHistoryFilter } from "../helpers";

export const getAllLoginHistory = async (
  loginHistoryRepo: LoginHistoryRepository,
  query: LoginHistoryAdminQuery
): Promise<PaginatedResult<AllHistoryItemDto>> => {
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildLoginHistoryFilter(query);
  const { data, total } = await loginHistoryRepo.findAll(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: data.map(toAllHistoryItemDto),
    meta: toPageMeta(total, page, limit)
  };
};
