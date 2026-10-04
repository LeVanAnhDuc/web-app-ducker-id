// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { MagicLinkLoginRepository } from "../../repositories/magic-link-login.repository";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  MagicLinkCooldownGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";

export interface MagicLinkLoginStrategyDeps {
  accountExistsGuard: AccountExistsGuard;
  accountActiveGuard: AccountActiveGuard;
  emailVerifiedGuard: EmailVerifiedGuard;
  magicLinkCooldownGuard: MagicLinkCooldownGuard;
  magicLinkLoginRepo: MagicLinkLoginRepository;
  emailDispatcher: EmailDispatcher;
  audit: LoginAuditService;
  completion: LoginCompletionService;
}
