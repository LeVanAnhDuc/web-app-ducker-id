// types
import type { RedisClientType } from "redis";
import type { UserService } from "@/modules/user/services";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
import type { SessionService } from "@/modules/session/services";
// repositories
import { RedisOtpLoginRepository } from "./repositories/impl/redis-otp-login.repository";
import { RedisMagicLinkLoginRepository } from "./repositories/impl/redis-magic-link-login.repository";
import { RedisFailedAttemptsRepository } from "./repositories/impl/redis-failed-attempts.repository";
// others
import { LoginService } from "./services/login";
import { LoginAuditService } from "./services/login-audit";
import { LoginCompletionService } from "./services/login-completion";
import {
  AccountExistsGuard,
  AccountActiveGuard,
  EmailVerifiedGuard,
  PasswordLockoutGuard,
  OtpLockoutGuard,
  OtpCooldownGuard,
  MagicLinkCooldownGuard
} from "./guards";
import { PasswordLoginStrategy } from "./strategies/password-login";
import { OtpLoginStrategy } from "./strategies/otp-login";
import { MagicLinkLoginStrategy } from "./strategies/magic-link-login";
import { LoginController } from "./login.controller";
import { createLoginRoutes } from "./login.routes";

export const createLoginModule = (
  redisClient: RedisClientType,
  userService: UserService,
  loginHistorySvc: LoginHistoryService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware,
  sessionService: SessionService
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
  const otpStrategy = new OtpLoginStrategy({
    accountExistsGuard,
    accountActiveGuard,
    emailVerifiedGuard,
    otpLockoutGuard,
    otpCooldownGuard,
    otpLoginRepo,
    emailDispatcher,
    audit: auditService,
    completion: completionService
  });
  const magicLinkStrategy = new MagicLinkLoginStrategy({
    accountExistsGuard,
    accountActiveGuard,
    emailVerifiedGuard,
    magicLinkCooldownGuard,
    magicLinkLoginRepo,
    emailDispatcher,
    audit: auditService,
    completion: completionService
  });

  // facade + controller + routes
  const loginService = new LoginService(
    passwordStrategy,
    otpStrategy,
    magicLinkStrategy,
    failedAttemptsRepo
  );
  const loginController = new LoginController(loginService, sessionService);

  return {
    loginRouter: createLoginRoutes(loginController, rateLimiter),
    loginService
  };
};
