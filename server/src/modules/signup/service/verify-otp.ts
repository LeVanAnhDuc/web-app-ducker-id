// types
import type { VerifyOtpBody } from "../types";
import type { VerifyOtpDto } from "../dtos";
import type { SignupServiceDeps } from "./deps";
// common
import { BadRequestError } from "@/common/exceptions";
// dtos
import { toVerifyOtpDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import {
  LOCKOUT_DURATION_MINUTES,
  MAX_FAILED_ATTEMPTS,
  SESSION_EXPIRY_SECONDS
} from "../constants";

/**
 * Không phải helper: hàm này chạm Redis. Nó sống ở đây vì chỉ `verifyOtp`
 * dùng tới — trước kia là private method của `SignupService`.
 */
const verifyOtpOrFail = async (
  deps: SignupServiceDeps,
  email: string,
  otp: string
): Promise<void> => {
  const isValid = await deps.otpSignupRepo.verify(email, otp);

  if (isValid) return;

  const failedCount = await deps.otpSignupRepo.incrementFailedAttempts(
    email,
    LOCKOUT_DURATION_MINUTES
  );

  Logger.warn("Invalid OTP attempt", {
    email,
    failedCount,
    lockoutDurationMinutes: LOCKOUT_DURATION_MINUTES
  });

  const remaining = MAX_FAILED_ATTEMPTS - failedCount;

  if (remaining > 0) {
    throw new BadRequestError({
      i18nMessage: (t) =>
        t("signup:errors.invalidOtpWithRemaining", { remaining }),
      code: ERROR_CODES.SIGNUP_OTP_INVALID
    });
  }

  throw new BadRequestError({
    i18nMessage: (t) => t("signup:errors.otpAttemptsExceeded"),
    code: ERROR_CODES.SIGNUP_OTP_LOCKED
  });
};

export const verifyOtp = async (
  deps: SignupServiceDeps,
  body: VerifyOtpBody
): Promise<VerifyOtpDto> => {
  const { email, otp } = body;

  const isLocked = await deps.otpSignupRepo.isLocked(
    email,
    MAX_FAILED_ATTEMPTS
  );

  if (isLocked) {
    Logger.warn("OTP account locked", {
      email,
      maxAttempts: MAX_FAILED_ATTEMPTS
    });
    throw new BadRequestError({
      i18nMessage: (t) => t("signup:errors.otpAttemptsExceeded"),
      code: ERROR_CODES.SIGNUP_OTP_LOCKED
    });
  }

  await verifyOtpOrFail(deps, email, otp);

  const sessionToken = await deps.sessionSignupRepo.createAndStore(
    email,
    SESSION_EXPIRY_SECONDS
  );

  await deps.otpSignupRepo.cleanupOtpData(email);

  Logger.info("Signup session issued", {
    email,
    sessionExpiresIn: SESSION_EXPIRY_SECONDS
  });

  return toVerifyOtpDto(sessionToken, SESSION_EXPIRY_SECONDS);
};
