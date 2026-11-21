// types
import type { Request } from "express";
import type { OtpSendBodyDto, OtpVerifyBodyDto } from "../../dtos/requests";
import type { LoginResponseDto, OtpSendDto } from "../../dtos";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { OtpLoginRepository } from "../../repositories/otp-login.repository";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard,
  OtpLockoutGuard,
  OtpCooldownGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";
// others
import { LogMethod } from "@/libs/logger";
import { sendCode } from "./send-code";
import { verifyCode } from "./verify-code";

export class OtpLoginStrategy {
  constructor(
    private readonly accountExistsGuard: AccountExistsGuard,
    private readonly accountActiveGuard: AccountActiveGuard,
    private readonly emailVerifiedGuard: EmailVerifiedGuard,
    private readonly passwordLockoutGuard: PasswordLockoutGuard,
    private readonly otpLockoutGuard: OtpLockoutGuard,
    private readonly otpCooldownGuard: OtpCooldownGuard,
    private readonly otpLoginRepo: OtpLoginRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly audit: LoginAuditService,
    private readonly completion: LoginCompletionService
  ) {}

  @LogMethod({ name: "Login OTP send" })
  sendCode(body: OtpSendBodyDto, req: Request): Promise<OtpSendDto> {
    return sendCode(
      {
        accountExistsGuard: this.accountExistsGuard,
        otpCooldownGuard: this.otpCooldownGuard,
        otpLoginRepo: this.otpLoginRepo,
        emailDispatcher: this.emailDispatcher
      },
      body,
      req
    );
  }

  @LogMethod({ name: "Login OTP verification" })
  verifyCode(body: OtpVerifyBodyDto, req: Request): Promise<LoginResponseDto> {
    return verifyCode(
      {
        accountExistsGuard: this.accountExistsGuard,
        accountActiveGuard: this.accountActiveGuard,
        emailVerifiedGuard: this.emailVerifiedGuard,
        passwordLockoutGuard: this.passwordLockoutGuard,
        otpLockoutGuard: this.otpLockoutGuard,
        otpLoginRepo: this.otpLoginRepo,
        audit: this.audit,
        completion: this.completion
      },
      body,
      req
    );
  }
}
