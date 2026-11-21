// types
import type {
  LoginHistoryAdminQueryDto,
  LoginHistoryQueryDto
} from "../dtos/requests";
import type { LoginHistoryServiceDeps } from "./deps";
import type { PaginatedResult } from "@/common/pagination";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { MyHistoryItemDto } from "../dtos";
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
    items: toDto(MyHistoryItemDto, data),
    meta: toPageMeta(total, page, limit)
  };
};
