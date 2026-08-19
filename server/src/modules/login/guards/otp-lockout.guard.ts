// types
import type { OtpLoginRepository } from "../repositories";
// common
import { TooManyRequestsError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { LOGIN_OTP_CONFIG } from "../constants";

export class OtpLockoutGuard {
  constructor(private readonly otpLoginRepo: OtpLoginRepository) {}

  async assert(email: string): Promise<void> {
    const isLocked = await this.otpLoginRepo.isLocked(email);

    if (!isLocked) return;

    const attempts = await this.otpLoginRepo.getFailedAttemptCount(email);
    Logger.warn("Login OTP verification locked", { email, attempts });

    throw new TooManyRequestsError({
      i18nMessage: (t) =>
        t("login:errors.otpLocked", {
          minutes: LOGIN_OTP_CONFIG.LOCKOUT_DURATION_MINUTES
        }),
      code: ERROR_CODES.LOGIN_OTP_LOCKED
    });
  }
}
