// types
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { LoginService } from "@/modules/login/services/login";
import type { UnlockAccountRepository } from "../repository/unlock-account.repository";
import type {
  CooldownGuard,
  RateLimitGuard,
  AuthExistsGuard,
  TempPasswordValidGuard
} from "../guards";

export interface UnlockAccountServiceDeps {
  authService: AuthenticationService;
  loginHistoryService: LoginHistoryService;
  loginService: LoginService;
  unlockAccountRepo: UnlockAccountRepository;
  emailDispatcher: EmailDispatcher;
  cooldownGuard: CooldownGuard;
  rateLimitGuard: RateLimitGuard;
  authExistsGuard: AuthExistsGuard;
  tempPasswordValidGuard: TempPasswordValidGuard;
}
