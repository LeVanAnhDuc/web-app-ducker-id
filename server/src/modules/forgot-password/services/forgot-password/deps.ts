// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type { OtpForgotPasswordStrategy } from "../../strategies/otp-forgot-password";
import type { MagicLinkForgotPasswordStrategy } from "../../strategies/magic-link-forgot-password";
import type { AuthExistsGuard, ResetTokenValidGuard } from "../../guards";
import type { ForgotPasswordAuditService } from "../forgot-password-audit";

export interface ForgotPasswordServiceDeps {
  authService: AuthenticationService;
  resetTokenRepo: ResetTokenRepository;
  otpStrategy: OtpForgotPasswordStrategy;
  magicLinkStrategy: MagicLinkForgotPasswordStrategy;
  authExistsGuard: AuthExistsGuard;
  resetTokenValidGuard: ResetTokenValidGuard;
  audit: ForgotPasswordAuditService;
}
