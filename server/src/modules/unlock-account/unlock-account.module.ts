// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { LoginService } from "@/modules/login/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
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
import { createUnlockAccountRoutes } from "./unlock-account.routes";

export const createUnlockAccountModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService,
  loginHistorySvc: LoginHistoryService,
  loginService: LoginService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  const unlockAccountRepo = new RedisUnlockAccountRepository(redisClient);

  const cooldownGuard = new CooldownGuard(unlockAccountRepo);
  const rateLimitGuard = new RateLimitGuard(unlockAccountRepo);
  const authExistsGuard = new AuthExistsGuard(userService);
  const tempPasswordValidGuard = new TempPasswordValidGuard(unlockAccountRepo);

  const unlockAccountService = new UnlockAccountService({
    authService,
    loginHistoryService: loginHistorySvc,
    loginService,
    unlockAccountRepo,
    emailDispatcher,
    cooldownGuard,
    rateLimitGuard,
    authExistsGuard,
    tempPasswordValidGuard
  });
  const unlockAccountController = new UnlockAccountController(
    unlockAccountService
  );

  return {
    unlockAccountRouter: createUnlockAccountRoutes(
      unlockAccountController,
      rateLimiter
    ),
    unlockAccountService
  };
};
