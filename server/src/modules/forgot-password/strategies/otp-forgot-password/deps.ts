// types
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

export interface OtpForgotPasswordStrategyDeps {
  otpRepo: OtpForgotPasswordRepository;
  resetTokenRepo: ResetTokenRepository;
  emailDispatcher: EmailDispatcher;
  cooldownGuard: OtpCooldownGuard;
  resendLimitGuard: OtpResendLimitGuard;
  lockoutGuard: OtpLockoutGuard;
  authExistsGuard: AuthExistsGuard;
  audit: ForgotPasswordAuditService;
}
