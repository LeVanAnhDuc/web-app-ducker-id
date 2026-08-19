// types
import type { OtpSignupRepository } from "../repositories";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class CooldownGuard {
  constructor(private readonly otpRepo: OtpSignupRepository) {}

  async assert(email: string): Promise<void> {
    const remaining = await this.otpRepo.getCooldownRemaining(email);

    if (!remaining) return;

    Logger.warn("OTP cooldown not expired", { email, remaining });
    throw new BadRequestError({
      i18nMessage: (t) =>
        t("signup:errors.resendCoolDown", { seconds: remaining }),
      code: ERROR_CODES.SIGNUP_OTP_COOLDOWN
    });
  }
}
