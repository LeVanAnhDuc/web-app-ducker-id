// types
import type { OtpForgotPasswordRepository } from "../repositories/otp-forgot-password.repository";
// common
import { BadRequestError } from "@/exceptions";
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
      key: "forgotPassword:errors.otpCooldown",
      params: { seconds: remaining },
      code: ERROR_CODES.FORGOT_PASSWORD_OTP_COOLDOWN
    });
  }
}
