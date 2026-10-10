// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { MagicLinkForgotPasswordRepository } from "../../repositories/magic-link-forgot-password.repository";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type {
  MagicLinkCooldownGuard,
  MagicLinkResendLimitGuard,
  AuthExistsGuard
} from "../../guards";
import type { ForgotPasswordAuditService } from "../../services/forgot-password-audit";

export interface MagicLinkForgotPasswordStrategyDeps {
  magicLinkRepo: MagicLinkForgotPasswordRepository;
  resetTokenRepo: ResetTokenRepository;
  emailDispatcher: EmailDispatcher;
  cooldownGuard: MagicLinkCooldownGuard;
  resendLimitGuard: MagicLinkResendLimitGuard;
  authExistsGuard: AuthExistsGuard;
  audit: ForgotPasswordAuditService;
}
