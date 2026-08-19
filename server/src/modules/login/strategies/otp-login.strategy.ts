// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { Request } from "express";
import type { OtpSendBody, OtpVerifyBody } from "../types";
import type { OtpLoginRepository } from "../repositories";
import type { LoginResponseDto, OtpSendDto } from "../dtos";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  OtpLockoutGuard,
  OtpCooldownGuard
} from "../guards";
import type { LoginAuditService } from "../services/login-audit.service";
import type { LoginCompletionService } from "../services/login-completion.service";
// common
import {
  BadRequestError,
  TooManyRequestsError,
  UnauthorizedError
} from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// dtos
import { toOtpSendDto } from "../dtos";
// others
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger, LogMethod } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { LOGIN_OTP_CONFIG } from "../constants";

export class OtpLoginStrategy {
  constructor(
    private readonly accountExistsGuard: AccountExistsGuard,
    private readonly accountActiveGuard: AccountActiveGuard,
    private readonly emailVerifiedGuard: EmailVerifiedGuard,
    private readonly otpLockoutGuard: OtpLockoutGuard,
    private readonly otpCooldownGuard: OtpCooldownGuard,
    private readonly otpLoginRepo: OtpLoginRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly audit: LoginAuditService,
    private readonly completion: LoginCompletionService
  ) {}

  @LogMethod({ name: "Login OTP send" })
  async sendCode(body: OtpSendBody, req: Request): Promise<OtpSendDto> {
    const { email } = body;
    const { language } = req;

    await this.otpCooldownGuard.assert(email);

    const result = await this.accountExistsGuard.tryFind(email);
    const isEligible = this.accountExistsGuard.isLoginEligible(result);

    if (!isEligible) {
      Logger.debug("Login OTP send skipped — account not eligible", { email });
      withRetry(() => this.otpLoginRepo.setRateLimits(email), {
        operationName: "setOtpRateLimits",
        context: { email }
      });
      return toOtpSendDto(
        this.otpLoginRepo.OTP_EXPIRY_SECONDS,
        this.otpLoginRepo.OTP_COOLDOWN_SECONDS
      );
    }

    const exceeded = await this.otpLoginRepo.hasExceededResendLimit(email);
    if (exceeded) {
      Logger.warn("Login OTP resend limit exceeded", { email });
      throw new BadRequestError({
        i18nMessage: (t) => t("login:errors.otpResendLimitExceeded"),
        code: ERROR_CODES.LOGIN_OTP_RESEND_LIMIT
      });
    }

    const otp = await this.otpLoginRepo.createAndStoreOtp(email);

    this.otpLoginRepo.setRateLimits(email);

    this.emailDispatcher.send(EmailType.LOGIN_OTP, {
      email,
      data: { otp, expiryMinutes: LOGIN_OTP_CONFIG.EXPIRY_MINUTES },
      locale: language as I18n.Locale
    });

    Logger.info("Login OTP sent", {
      email,
      expiresIn: this.otpLoginRepo.OTP_EXPIRY_SECONDS,
      cooldown: this.otpLoginRepo.OTP_COOLDOWN_SECONDS
    });

    return toOtpSendDto(
      this.otpLoginRepo.OTP_EXPIRY_SECONDS,
      this.otpLoginRepo.OTP_COOLDOWN_SECONDS
    );
  }

  @LogMethod({ name: "Login OTP verification" })
  async verifyCode(
    body: OtpVerifyBody,
    req: Request
  ): Promise<LoginResponseDto> {
    const { email, otp } = body;

    await this.otpLockoutGuard.assert(email);

    const { auth, user } = await this.accountExistsGuard.assert(email);

    this.accountActiveGuard.assertWithAudit(
      auth,
      email,
      LOGIN_METHODS.OTP,
      req
    );
    this.emailVerifiedGuard.assertWithAudit(
      auth,
      email,
      LOGIN_METHODS.OTP,
      req
    );

    const isValid = await this.otpLoginRepo.verify(email, otp);
    if (!isValid) await this.handleInvalidOtp(auth, email, req);

    withRetry(() => this.otpLoginRepo.cleanupAll(email), {
      operationName: "cleanupLoginOtpData",
      context: { email }
    });

    Logger.info("Login OTP verified", { email });

    return this.completion.complete({
      auth,
      user,
      method: LOGIN_METHODS.OTP,
      req
    });
  }

  private async handleInvalidOtp(
    auth: AuthenticationDocument,
    email: string,
    req: Request
  ): Promise<void> {
    const attempts = await this.otpLoginRepo.incrementFailedAttempts(email);
    this.audit.recordInvalidOtp({ auth, email, attempts, req });

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
  }
}
