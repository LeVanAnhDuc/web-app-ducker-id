// types
import type { OtpForgotPasswordRepository } from "../repositories";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class OtpCooldownGuard {
  constructor(private readonly otpRepo: OtpForgotPasswordRepository) {}

  async assert(email: string): Promise<void> {
    const remaining = await this.otpRepo.getCooldownRemaining(email);

    if (!remaining) return;

    Logger.warn("Forgot password OTP cooldown not expired", {
      email,
      remaining
    });
    throw new BadRequestError({
      i18nMessage: (t) =>
        t("forgotPassword:errors.otpCooldown", { seconds: remaining }),
      code: ERROR_CODES.FORGOT_PASSWORD_OTP_COOLDOWN
    });
  }
}
