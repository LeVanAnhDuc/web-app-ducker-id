// types
import type {
  ForgotPasswordMagicLinkSendBodyDto,
  ForgotPasswordMagicLinkVerifyBodyDto
} from "../../dtos/requests";
import type {
  SendMagicLinkResponseDto,
  VerifyMagicLinkResponseDto
} from "../../dtos";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { MagicLinkForgotPasswordRepository } from "../../repositories/magic-link-forgot-password.repository";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type {
  MagicLinkCooldownGuard,
  MagicLinkResendLimitGuard,
  AuthExistsGuard
} from "../../guards";
import type { ForgotPasswordAuditService } from "../../services/forgot-password-audit";
// others
import { LogMethod } from "@/libs/logger";
import { sendLink } from "./send-link";
import { verifyLink } from "./verify-link";

export class MagicLinkForgotPasswordStrategy {
  constructor(
    private readonly magicLinkRepo: MagicLinkForgotPasswordRepository,
    private readonly resetTokenRepo: ResetTokenRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly cooldownGuard: MagicLinkCooldownGuard,
    private readonly resendLimitGuard: MagicLinkResendLimitGuard,
    private readonly authExistsGuard: AuthExistsGuard,
    private readonly audit: ForgotPasswordAuditService
  ) {}

  @LogMethod({ name: "Forgot password magic link send" })
  sendLink(
    body: ForgotPasswordMagicLinkSendBodyDto
  ): Promise<SendMagicLinkResponseDto> {
    return sendLink(
      {
        magicLinkRepo: this.magicLinkRepo,
        emailDispatcher: this.emailDispatcher,
        cooldownGuard: this.cooldownGuard,
        resendLimitGuard: this.resendLimitGuard,
        authExistsGuard: this.authExistsGuard
      },
      body
    );
  }

  @LogMethod({ name: "Forgot password magic link verification" })
  verifyLink(
    body: ForgotPasswordMagicLinkVerifyBodyDto
  ): Promise<VerifyMagicLinkResponseDto> {
    return verifyLink(
      {
        magicLinkRepo: this.magicLinkRepo,
        resetTokenRepo: this.resetTokenRepo,
        authExistsGuard: this.authExistsGuard,
        audit: this.audit
      },
      body
    );
  }
}
