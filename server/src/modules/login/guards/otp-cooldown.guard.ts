// types
import type { OtpLoginRepository } from "../repositories";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class OtpCooldownGuard {
  constructor(private readonly otpLoginRepo: OtpLoginRepository) {}

  async assert(email: string): Promise<void> {
    const remaining = await this.otpLoginRepo.getCooldownRemaining(email);

    if (!remaining) return;

    Logger.warn("Login OTP cooldown not expired", { email, remaining });
    throw new BadRequestError({
      i18nMessage: (t) => t("login:errors.otpCooldown", { seconds: remaining }),
      code: ERROR_CODES.LOGIN_OTP_COOLDOWN
    });
  }
}
