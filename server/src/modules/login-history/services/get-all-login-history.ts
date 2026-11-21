// types
import type { LoginHistoryAdminQueryDto } from "../dtos/requests";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
import type { PaginatedResult } from "@/common/pagination";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
// dtos
import { AllHistoryItemDto } from "../dtos";
// others
import { buildLoginHistoryFilter } from "../helpers";

export const getAllLoginHistory = async (
  loginHistoryRepo: LoginHistoryRepository,
  query: LoginHistoryAdminQueryDto
): Promise<PaginatedResult<AllHistoryItemDto>> => {
  const { page, limit, skip, sort } = resolvePaging(query);

  const filter = buildLoginHistoryFilter(query);
  const { data, total } = await loginHistoryRepo.findAll(filter, {
    skip,
    limit,
    sort
  });

  return {
    items: toDto(AllHistoryItemDto, data),
    meta: toPageMeta(total, page, limit)
  };
};
