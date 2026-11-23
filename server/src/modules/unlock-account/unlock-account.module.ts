// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { LoginService } from "@/modules/login/services/login";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// others
import { RedisUnlockAccountRepository } from "./repository/impl/redis-unlock-account.repository";
// guards
import {
  CooldownGuard,
  RateLimitGuard,
  AuthExistsGuard,
  TempPasswordValidGuard
} from "./guards";
// others
import { UnlockAccountService } from "./services";
import { UnlockAccountController } from "./unlock-account.controller";

export const createUnlockAccountModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService,
  loginHistorySvc: LoginHistoryService,
  loginService: LoginService,
  emailDispatcher: EmailDispatcher
) => {
  const unlockAccountRepo = new RedisUnlockAccountRepository(redisClient);

  const cooldownGuard = new CooldownGuard(unlockAccountRepo);
  const rateLimitGuard = new RateLimitGuard(unlockAccountRepo);
  const authExistsGuard = new AuthExistsGuard(userService);
  const tempPasswordValidGuard = new TempPasswordValidGuard(unlockAccountRepo);

  const unlockAccountService = new UnlockAccountService(
    authService,
    loginHistorySvc,
    loginService,
    unlockAccountRepo,
    emailDispatcher,
    cooldownGuard,
    rateLimitGuard,
    authExistsGuard,
    tempPasswordValidGuard
  );

  return {
    unlockAccountController: new UnlockAccountController(unlockAccountService),
    unlockAccountService
  };
};
