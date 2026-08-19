// types
import type { ResetTokenRepository } from "../repositories";
// common
import { UnauthorizedError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class ResetTokenValidGuard {
  constructor(private readonly resetTokenRepo: ResetTokenRepository) {}

  async assert(email: string, resetToken: string): Promise<void> {
    const isValid = await this.resetTokenRepo.verify(email, resetToken);
    if (isValid) return;

    Logger.warn("Forgot password reset - invalid or expired reset token", {
      email
    });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("forgotPassword:errors.invalidResetToken"),
      code: ERROR_CODES.FORGOT_PASSWORD_INVALID_RESET_TOKEN
    });
  }
}
