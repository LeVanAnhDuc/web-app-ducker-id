// types
import type { LoginHistoryQuery, LoginHistoryAdminQuery } from "../types";
import type { MyHistoryItemDto } from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
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
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildLoginHistoryFilter(
    query as LoginHistoryAdminQuery,
    userId
  );
  const { data, total } = await loginHistoryRepo.findByUser(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: data.map(toMyHistoryItemDto),
    meta: toPageMeta(total, page, limit)
  };
};
