// types
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { HistoryDetailItemDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getLoginHistoryDetail = async (
  loginHistoryRepo: LoginHistoryRepository,
  id: string
): Promise<HistoryDetailItemDto> => {
  const doc = await loginHistoryRepo.findById(id);

  if (!doc) {
    throw new NotFoundError({
      key: "loginHistory:errors.notFound",
      code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND
    });
  }

  return toDto(HistoryDetailItemDto, doc);
};
