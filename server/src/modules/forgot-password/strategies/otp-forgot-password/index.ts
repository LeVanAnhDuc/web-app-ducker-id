// types
import type { OtpSendBodyDto, OtpVerifyBodyDto } from "../../dtos/requests";
import type { SendOtpResponseDto, VerifyOtpResponseDto } from "../../dtos";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { OtpForgotPasswordRepository } from "../../repositories/otp-forgot-password.repository";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type {
  OtpCooldownGuard,
  OtpResendLimitGuard,
  OtpLockoutGuard,
  AuthExistsGuard
} from "../../guards";
import type { ForgotPasswordAuditService } from "../../services/forgot-password-audit";
// others
import { LogMethod } from "@/libs/logger";
import { sendCode } from "./send-code";
import { verifyCode } from "./verify-code";

export class OtpForgotPasswordStrategy {
  constructor(
    private readonly otpRepo: OtpForgotPasswordRepository,
    private readonly resetTokenRepo: ResetTokenRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly cooldownGuard: OtpCooldownGuard,
    private readonly resendLimitGuard: OtpResendLimitGuard,
    private readonly lockoutGuard: OtpLockoutGuard,
    private readonly authExistsGuard: AuthExistsGuard,
    private readonly audit: ForgotPasswordAuditService
  ) {}

  @LogMethod({ name: "Forgot password OTP send" })
  sendCode(body: OtpSendBodyDto): Promise<SendOtpResponseDto> {
    return sendCode(
      {
        otpRepo: this.otpRepo,
        emailDispatcher: this.emailDispatcher,
        cooldownGuard: this.cooldownGuard,
        resendLimitGuard: this.resendLimitGuard,
        authExistsGuard: this.authExistsGuard
      },
      body
    );
  }

  @LogMethod({ name: "Forgot password OTP verification" })
  verifyCode(body: OtpVerifyBodyDto): Promise<VerifyOtpResponseDto> {
    return verifyCode(
      {
        otpRepo: this.otpRepo,
        resetTokenRepo: this.resetTokenRepo,
        lockoutGuard: this.lockoutGuard,
        authExistsGuard: this.authExistsGuard,
        audit: this.audit
      },
      body
    );
  }
}
