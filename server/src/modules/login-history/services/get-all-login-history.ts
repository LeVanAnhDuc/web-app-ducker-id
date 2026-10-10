// types
import type { LoginHistoryAdminQuery } from "../types";
import type { AllHistoryItemDto } from "../dtos";
import type { LoginHistoryServiceDeps } from "./deps";
import type { PaginatedResult } from "@/common/pagination";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toAllHistoryItemDto } from "../dtos";
// others
import { buildLoginHistoryFilter } from "../helpers";

export const getAllLoginHistory = async (
  deps: LoginHistoryServiceDeps,
  query: LoginHistoryAdminQuery
): Promise<PaginatedResult<AllHistoryItemDto>> => {
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildLoginHistoryFilter(query);
  const { data, total } = await deps.loginHistoryRepo.findAll(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: data.map(toAllHistoryItemDto),
    meta: toPageMeta(total, page, limit)
  };
};
