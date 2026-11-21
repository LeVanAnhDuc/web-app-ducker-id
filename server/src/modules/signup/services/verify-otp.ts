// types
import type { VerifyOtpBodyDto } from "../dtos/requests";
import type { VerifyOtpDto } from "../dtos";
import type { OtpSignupRepository } from "../repositories/otp-signup.repository";
import type { SessionSignupRepository } from "../repositories/session-signup.repository";
// common
import { BadRequestError } from "@/exceptions";
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
  otpSignupRepo: OtpSignupRepository,
  email: string,
  otp: string
): Promise<void> => {
  const isValid = await otpSignupRepo.verify(email, otp);

  if (isValid) return;

  const failedCount = await otpSignupRepo.incrementFailedAttempts(
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
      key: "signup:errors.invalidOtpWithRemaining",
      params: { remaining },
      code: ERROR_CODES.SIGNUP_OTP_INVALID
    });
  }

  throw new BadRequestError({
    key: "signup:errors.otpAttemptsExceeded",
    code: ERROR_CODES.SIGNUP_OTP_LOCKED
  });
};

export const verifyOtp = async (
  deps: {
    otpSignupRepo: OtpSignupRepository;
    sessionSignupRepo: SessionSignupRepository;
  },
  body: VerifyOtpBodyDto
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
      key: "signup:errors.otpAttemptsExceeded",
      code: ERROR_CODES.SIGNUP_OTP_LOCKED
    });
  }

  await verifyOtpOrFail(deps.otpSignupRepo, email, otp);

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
