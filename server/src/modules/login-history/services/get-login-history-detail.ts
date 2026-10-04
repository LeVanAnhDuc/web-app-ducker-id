// types
import type { HistoryDetailItemDto } from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toHistoryDetailItemDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getLoginHistoryDetail = async (
  loginHistoryRepo: LoginHistoryRepository,
  id: string
): Promise<HistoryDetailItemDto> => {
  const doc = await loginHistoryRepo.findById(id);

  if (!doc) {
    throw new NotFoundError({
      i18nMessage: (t) => t("loginHistory:errors.notFound"),
      code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND
    });
  }

  return toHistoryDetailItemDto(doc);
};
