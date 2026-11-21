// types
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { Request } from "express";
import type { OtpVerifyBodyDto } from "../../dtos/requests";
import type { LoginResponseDto } from "../../dtos";
import type { OtpLoginRepository } from "../../repositories/otp-login.repository";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard,
  OtpLockoutGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";
// common
import { TooManyRequestsError, UnauthorizedError } from "@/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { LOGIN_OTP_CONFIG } from "../../constants";

/** Chạm Redis nên không phải helper; chỉ `verifyCode` dùng tới. */
const handleInvalidOtp = async (
  deps: { otpLoginRepo: OtpLoginRepository; audit: LoginAuditService },
  auth: AuthenticationDocument,
  email: string,
  req: Request
): Promise<void> => {
  const attempts = await deps.otpLoginRepo.incrementFailedAttempts(email);
  deps.audit.recordInvalidOtp({ auth, email, attempts, req });

  const remaining = LOGIN_OTP_CONFIG.MAX_FAILED_ATTEMPTS - attempts;

  if (remaining <= 0) {
    throw new TooManyRequestsError({
      key: "login:errors.otpLocked",
      params: {
        minutes: LOGIN_OTP_CONFIG.LOCKOUT_DURATION_MINUTES
      },
      code: ERROR_CODES.LOGIN_OTP_LOCKED
    });
  }

  throw new UnauthorizedError({
    key: "login:errors.invalidOtpWithRemaining",
    params: { remaining },
    code: ERROR_CODES.LOGIN_OTP_INVALID
  });
};

export const verifyCode = async (
  deps: {
    accountExistsGuard: AccountExistsGuard;
    accountActiveGuard: AccountActiveGuard;
    emailVerifiedGuard: EmailVerifiedGuard;
    passwordLockoutGuard: PasswordLockoutGuard;
    otpLockoutGuard: OtpLockoutGuard;
    otpLoginRepo: OtpLoginRepository;
    audit: LoginAuditService;
    completion: LoginCompletionService;
  },
  body: OtpVerifyBodyDto,
  req: Request
): Promise<LoginResponseDto> => {
  const { email, otp } = body;

  await deps.otpLockoutGuard.assert(email);
  // A password lockout locks the ACCOUNT, not only the password method —
  // otherwise a code is a way around it (BUG-AUTH-06).
  await deps.passwordLockoutGuard.assert(email);

  const { auth, user } = await deps.accountExistsGuard.assert(email);

  deps.accountActiveGuard.assertWithAudit(auth, email, LOGIN_METHODS.OTP, req);
  deps.emailVerifiedGuard.assertWithAudit(auth, email, LOGIN_METHODS.OTP, req);

  const isValid = await deps.otpLoginRepo.verify(email, otp);
  if (!isValid)
    await handleInvalidOtp(
      { otpLoginRepo: deps.otpLoginRepo, audit: deps.audit },
      auth,
      email,
      req
    );

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
