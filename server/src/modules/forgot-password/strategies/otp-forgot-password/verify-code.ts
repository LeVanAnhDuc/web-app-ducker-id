// types
import type { FPOtpVerifyRequest } from "../../types";
import type { VerifyOtpResponseDto } from "../../dtos";
import type { AuthExistsGuard } from "../../guards";
import type { OtpForgotPasswordStrategyDeps } from "./deps";
// common
import { BadRequestError, UnauthorizedError } from "@/common/exceptions";
// dtos
import { toVerifyOtpResponseDto } from "../../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { FORGOT_PASSWORD_OTP_CONFIG } from "../../constants";

/** Chạm Redis nên không phải helper; chỉ `verifyCode` dùng tới. */
const handleInvalidOtp = async (
  deps: OtpForgotPasswordStrategyDeps,
  email: string,
  auth: Awaited<ReturnType<AuthExistsGuard["assert"]>>["auth"],
  req: FPOtpVerifyRequest
): Promise<never> => {
  const attempts = await deps.otpRepo.incrementFailedAttempts(email);
  deps.audit.recordInvalidOtp({ email, auth, attempts, req });

  const remaining = FORGOT_PASSWORD_OTP_CONFIG.MAX_FAILED_ATTEMPTS - attempts;

  if (remaining <= 0) {
    throw new BadRequestError({
      i18nMessage: (t) =>
        t("forgotPassword:errors.otpLocked", {
          minutes: FORGOT_PASSWORD_OTP_CONFIG.LOCKOUT_DURATION_MINUTES
        }),
      code: ERROR_CODES.FORGOT_PASSWORD_OTP_LOCKED
    });
  }

  throw new UnauthorizedError({
    i18nMessage: (t) =>
      t("forgotPassword:errors.invalidOtpWithRemaining", { remaining }),
    code: ERROR_CODES.FORGOT_PASSWORD_OTP_INVALID
  });
};

export const verifyCode = async (
  deps: OtpForgotPasswordStrategyDeps,
  req: FPOtpVerifyRequest
): Promise<VerifyOtpResponseDto> => {
  const { email, otp } = req.body;

  await deps.lockoutGuard.assert(email);

  const { auth } = await deps.authExistsGuard.assert(email);

  const isValid = await deps.otpRepo.verify(email, otp);
  if (!isValid) await handleInvalidOtp(deps, email, auth, req);

  const resetToken = await deps.resetTokenRepo.createAndStore(email);

  withRetry(() => deps.otpRepo.cleanupAll(email), {
    operationName: "cleanupForgotPasswordOtpData",
    context: { email }
  });

  Logger.info("Forgot-password OTP verified", { email });

  return toVerifyOtpResponseDto(resetToken);
};
