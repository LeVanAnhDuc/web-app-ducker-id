// types
import type { ForgotPasswordOtpVerifyBodyDto } from "../../dtos/requests";
import type { VerifyOtpResponseDto } from "../../dtos";
import type { OtpForgotPasswordRepository } from "../../repositories/otp-forgot-password.repository";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type { OtpLockoutGuard, AuthExistsGuard } from "../../guards";
import type { ForgotPasswordAuditService } from "../../services/forgot-password-audit";
// common
import { BadRequestError, UnauthorizedError } from "@/exceptions";
// dtos
import { toVerifyOtpResponseDto } from "../../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { FORGOT_PASSWORD_OTP_CONFIG } from "../../constants";

/** Chạm Redis nên không phải helper; chỉ `verifyCode` dùng tới. */
const handleInvalidOtp = async (
  deps: {
    otpRepo: OtpForgotPasswordRepository;
    audit: ForgotPasswordAuditService;
  },
  email: string,
  auth: Awaited<ReturnType<AuthExistsGuard["assert"]>>["auth"]
): Promise<never> => {
  const attempts = await deps.otpRepo.incrementFailedAttempts(email);
  deps.audit.recordInvalidOtp({ email, auth, attempts });

  const remaining = FORGOT_PASSWORD_OTP_CONFIG.MAX_FAILED_ATTEMPTS - attempts;

  if (remaining <= 0) {
    throw new BadRequestError({
      key: "forgotPassword:errors.otpLocked",
      params: {
        minutes: FORGOT_PASSWORD_OTP_CONFIG.LOCKOUT_DURATION_MINUTES
      },
      code: ERROR_CODES.FORGOT_PASSWORD_OTP_LOCKED
    });
  }

  throw new UnauthorizedError({
    key: "forgotPassword:errors.invalidOtpWithRemaining",
    params: { remaining },
    code: ERROR_CODES.FORGOT_PASSWORD_OTP_INVALID
  });
};

export const verifyCode = async (
  deps: {
    otpRepo: OtpForgotPasswordRepository;
    resetTokenRepo: ResetTokenRepository;
    lockoutGuard: OtpLockoutGuard;
    authExistsGuard: AuthExistsGuard;
    audit: ForgotPasswordAuditService;
  },
  body: ForgotPasswordOtpVerifyBodyDto
): Promise<VerifyOtpResponseDto> => {
  const { email, otp } = body;

  await deps.lockoutGuard.assert(email);

  const { auth } = await deps.authExistsGuard.assert(email);

  const isValid = await deps.otpRepo.verify(email, otp);
  if (!isValid)
    await handleInvalidOtp(
      { otpRepo: deps.otpRepo, audit: deps.audit },
      email,
      auth
    );

  const resetToken = await deps.resetTokenRepo.createAndStore(email);

  withRetry(() => deps.otpRepo.cleanupAll(email), {
    operationName: "cleanupForgotPasswordOtpData",
    context: { email }
  });

  Logger.info("Forgot-password OTP verified", { email });

  return toVerifyOtpResponseDto(resetToken);
};
