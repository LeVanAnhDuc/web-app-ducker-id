// types
import type { UnlockAccountRepository } from "../repository/unlock-account.repository";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class TempPasswordValidGuard {
  constructor(private readonly unlockAccountRepo: UnlockAccountRepository) {}

  /**
   * Không thuần kiểm tra: mã đúng thì bị consume luôn trong cùng lời gọi này,
   * nên chỉ gọi một lần cho mỗi request verify.
   *
   * Mã sai và mã hết hạn gộp chung một lỗi — TTL Redis không phân biệt được
   * "hết hạn" với "chưa từng có", và gộp lại thì không lộ ra mã nào từng tồn tại.
   */
  async assert(email: string, tempPassword: string): Promise<void> {
    const isValid = await this.unlockAccountRepo.consumeTempPassword(
      email,
      tempPassword
    );
    if (isValid) return;

    Logger.warn("Unlock verify failed - invalid or expired temp password", {
      email
    });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("unlockAccount:errors.invalidTempPassword"),
      code: ERROR_CODES.UNLOCK_INVALID_TEMP_PASSWORD
    });
  }
}
