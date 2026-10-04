// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { Request } from "express";
import type { OtpVerifyBody } from "../../types";
import type { LoginResponseDto } from "../../dtos";
import type { OtpLoginStrategyDeps } from "./deps";
// common
import { TooManyRequestsError, UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { LOGIN_OTP_CONFIG } from "../../constants";

/** Chạm Redis nên không phải helper; chỉ `verifyCode` dùng tới. */
const handleInvalidOtp = async (
  deps: OtpLoginStrategyDeps,
  auth: AuthenticationDocument,
  email: string,
  req: Request
): Promise<void> => {
  const attempts = await deps.otpLoginRepo.incrementFailedAttempts(email);
  deps.audit.recordInvalidOtp({ auth, email, attempts, req });

  const remaining = LOGIN_OTP_CONFIG.MAX_FAILED_ATTEMPTS - attempts;

  if (remaining <= 0) {
    throw new TooManyRequestsError({
      i18nMessage: (t) =>
        t("login:errors.otpLocked", {
          minutes: LOGIN_OTP_CONFIG.LOCKOUT_DURATION_MINUTES
        }),
      code: ERROR_CODES.LOGIN_OTP_LOCKED
    });
  }

  throw new UnauthorizedError({
    i18nMessage: (t) =>
      t("login:errors.invalidOtpWithRemaining", { remaining }),
    code: ERROR_CODES.LOGIN_OTP_INVALID
  });
};

export const verifyCode = async (
  deps: OtpLoginStrategyDeps,
  body: OtpVerifyBody,
  req: Request
): Promise<LoginResponseDto> => {
  const { email, otp } = body;

  await deps.otpLockoutGuard.assert(email);

  const { auth, user } = await deps.accountExistsGuard.assert(email);

  deps.accountActiveGuard.assertWithAudit(auth, email, LOGIN_METHODS.OTP, req);
  deps.emailVerifiedGuard.assertWithAudit(auth, email, LOGIN_METHODS.OTP, req);

  const isValid = await deps.otpLoginRepo.verify(email, otp);
  if (!isValid) await handleInvalidOtp(deps, auth, email, req);

  withRetry(() => deps.otpLoginRepo.cleanupAll(email), {
    operationName: "cleanupLoginOtpData",
    context: { email }
  });

  Logger.info("Login OTP verified", { email });

  return deps.completion.complete({
    auth,
    user,
    method: LOGIN_METHODS.OTP,
    req
  });
};
