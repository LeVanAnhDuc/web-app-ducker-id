// types
import type { RedisClientType } from "redis";
import type { UserService } from "@/modules/user/user.service";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// repositories
import {
  RedisOtpLoginRepository,
  RedisMagicLinkLoginRepository,
  RedisFailedAttemptsRepository
} from "./repositories";
// others
import {
  LoginService,
  LoginAuditService,
  LoginCompletionService
} from "./services";
import {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard,
  OtpLockoutGuard,
  OtpCooldownGuard,
  MagicLinkCooldownGuard
} from "./guards";
import {
  PasswordLoginStrategy,
  OtpLoginStrategy,
  MagicLinkLoginStrategy
} from "./strategies";
import { LoginController } from "./login.controller";
import { createLoginRoutes } from "./login.routes";

export const createLoginModule = (
  redisClient: RedisClientType,
  userService: UserService,
  loginHistorySvc: LoginHistoryService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  // repositories
  const otpLoginRepo = new RedisOtpLoginRepository(redisClient);
  const magicLinkLoginRepo = new RedisMagicLinkLoginRepository(redisClient);
  const failedAttemptsRepo = new RedisFailedAttemptsRepository(redisClient);

  // collaborator services
  const auditService = new LoginAuditService(loginHistorySvc);
  const completionService = new LoginCompletionService(auditService);

  // guards
  const accountExistsGuard = new AccountExistsGuard(userService, auditService);
  const accountActiveGuard = new AccountActiveGuard(auditService);
  const emailVerifiedGuard = new EmailVerifiedGuard(auditService);
  const passwordLockoutGuard = new PasswordLockoutGuard(failedAttemptsRepo);
  const otpLockoutGuard = new OtpLockoutGuard(otpLoginRepo);
  const otpCooldownGuard = new OtpCooldownGuard(otpLoginRepo);
  const magicLinkCooldownGuard = new MagicLinkCooldownGuard(magicLinkLoginRepo);

  // strategies
  const passwordStrategy = new PasswordLoginStrategy(
    accountExistsGuard,
    accountActiveGuard,
    emailVerifiedGuard,
    passwordLockoutGuard,
    failedAttemptsRepo,
    auditService,
    completionService
  );
  const otpStrategy = new OtpLoginStrategy(
    accountExistsGuard,
    accountActiveGuard,
    emailVerifiedGuard,
    otpLockoutGuard,
    otpCooldownGuard,
    otpLoginRepo,
    emailDispatcher,
    auditService,
    completionService
  );
  const magicLinkStrategy = new MagicLinkLoginStrategy(
    accountExistsGuard,
    accountActiveGuard,
    emailVerifiedGuard,
    magicLinkCooldownGuard,
    magicLinkLoginRepo,
    emailDispatcher,
    auditService,
    completionService
  );

  // facade + controller + routes
  const loginService = new LoginService(
    passwordStrategy,
    otpStrategy,
    magicLinkStrategy,
    failedAttemptsRepo
  );
  const loginController = new LoginController(loginService);

  return {
    loginRouter: createLoginRoutes(loginController, rateLimiter),
    loginService
  };
};
