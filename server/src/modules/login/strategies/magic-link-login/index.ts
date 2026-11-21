// types
import type {
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto
} from "../../dtos/requests";
import type { LoginResponseDto, MagicLinkSendDto } from "../../dtos";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { MagicLinkLoginRepository } from "../../repositories/magic-link-login.repository";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard,
  MagicLinkCooldownGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";
// others
import { LogMethod } from "@/libs/logger";
import { sendLink } from "./send-link";
import { verifyLink } from "./verify-link";

export class MagicLinkLoginStrategy {
  constructor(
    private readonly accountExistsGuard: AccountExistsGuard,
    private readonly accountActiveGuard: AccountActiveGuard,
    private readonly emailVerifiedGuard: EmailVerifiedGuard,
    private readonly passwordLockoutGuard: PasswordLockoutGuard,
    private readonly magicLinkCooldownGuard: MagicLinkCooldownGuard,
    private readonly magicLinkLoginRepo: MagicLinkLoginRepository,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly audit: LoginAuditService,
    private readonly completion: LoginCompletionService
  ) {}

  @LogMethod({ name: "Magic link send" })
  sendLink(body: MagicLinkSendBodyDto): Promise<MagicLinkSendDto> {
    return sendLink(
      {
        accountExistsGuard: this.accountExistsGuard,
        magicLinkCooldownGuard: this.magicLinkCooldownGuard,
        magicLinkLoginRepo: this.magicLinkLoginRepo,
        emailDispatcher: this.emailDispatcher
      },
      body
    );
  }

  @LogMethod({ name: "Magic link verification" })
  verifyLink(body: MagicLinkVerifyBodyDto): Promise<LoginResponseDto> {
    return verifyLink(
      {
        accountExistsGuard: this.accountExistsGuard,
        accountActiveGuard: this.accountActiveGuard,
        emailVerifiedGuard: this.emailVerifiedGuard,
        passwordLockoutGuard: this.passwordLockoutGuard,
        magicLinkLoginRepo: this.magicLinkLoginRepo,
        audit: this.audit,
        completion: this.completion
      },
      body
    );
  }
}
