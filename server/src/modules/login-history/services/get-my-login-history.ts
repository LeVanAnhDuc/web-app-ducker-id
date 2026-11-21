// types
import type {
  LoginHistoryAdminQueryDto,
  LoginHistoryQueryDto
} from "../dtos/requests";
import type { MyHistoryItemDto } from "../dtos";
import type { LoginHistoryServiceDeps } from "./deps";
import type { PaginatedResult } from "@/common/pagination";
// common
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { toMyHistoryItemDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { buildLoginHistoryFilter } from "../helpers";

export const getMyLoginHistory = async (
  deps: LoginHistoryServiceDeps,
  query: LoginHistoryQueryDto
): Promise<PaginatedResult<MyHistoryItemDto>> => {
  const userId = RequestContext.requireAuthId();
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildLoginHistoryFilter(
    query as LoginHistoryAdminQueryDto,
    userId
  );
  const { data, total } = await deps.loginHistoryRepo.findByUser(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: data.map(toMyHistoryItemDto),
    meta: toPageMeta(total, page, limit)
  };
};
