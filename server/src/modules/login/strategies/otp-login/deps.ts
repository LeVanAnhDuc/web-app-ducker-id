// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { OtpLoginRepository } from "../../repositories/otp-login.repository";
import type {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  OtpLockoutGuard,
  OtpCooldownGuard
} from "../../guards";
import type { LoginAuditService } from "../../services/login-audit";
import type { LoginCompletionService } from "../../services/login-completion";

export interface OtpLoginStrategyDeps {
  accountExistsGuard: AccountExistsGuard;
  accountActiveGuard: AccountActiveGuard;
  emailVerifiedGuard: EmailVerifiedGuard;
  otpLockoutGuard: OtpLockoutGuard;
  otpCooldownGuard: OtpCooldownGuard;
  otpLoginRepo: OtpLoginRepository;
  emailDispatcher: EmailDispatcher;
  audit: LoginAuditService;
  completion: LoginCompletionService;
}
