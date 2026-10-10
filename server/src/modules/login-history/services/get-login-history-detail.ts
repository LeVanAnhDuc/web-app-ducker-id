// types
import type { HistoryDetailItemDto } from "../dtos";
import type { LoginHistoryServiceDeps } from "./deps";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toHistoryDetailItemDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getLoginHistoryDetail = async (
  deps: LoginHistoryServiceDeps,
  id: string
): Promise<HistoryDetailItemDto> => {
  const doc = await deps.loginHistoryRepo.findById(id);

  if (!doc) {
    throw new NotFoundError({
      i18nMessage: (t) => t("loginHistory:errors.notFound"),
      code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND
    });
  }

  return toHistoryDetailItemDto(doc);
};
