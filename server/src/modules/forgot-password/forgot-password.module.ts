// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { LoginHistoryService } from "@/modules/login-history/login-history.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// repositories
import {
  RedisOtpForgotPasswordRepository,
  RedisMagicLinkForgotPasswordRepository,
  RedisResetTokenRepository
} from "./repositories";
// guards
import {
  OtpCooldownGuard,
  OtpResendLimitGuard,
  OtpLockoutGuard,
  MagicLinkCooldownGuard,
  MagicLinkResendLimitGuard,
  AuthExistsGuard,
  ResetTokenValidGuard
} from "./guards";
// others
import { ForgotPasswordService, ForgotPasswordAuditService } from "./services";
import {
  OtpForgotPasswordStrategy,
  MagicLinkForgotPasswordStrategy
} from "./strategies";
import { ForgotPasswordController } from "./forgot-password.controller";
import { createForgotPasswordRoutes } from "./forgot-password.routes";

export const createForgotPasswordModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService,
  loginHistorySvc: LoginHistoryService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  const otpRepo = new RedisOtpForgotPasswordRepository(redisClient);
  const magicLinkRepo = new RedisMagicLinkForgotPasswordRepository(redisClient);
  const resetTokenRepo = new RedisResetTokenRepository(redisClient);

  const auditService = new ForgotPasswordAuditService(loginHistorySvc);

  const otpCooldownGuard = new OtpCooldownGuard(otpRepo);
  const otpResendLimitGuard = new OtpResendLimitGuard(otpRepo);
  const otpLockoutGuard = new OtpLockoutGuard(otpRepo);
  const magicLinkCooldownGuard = new MagicLinkCooldownGuard(magicLinkRepo);
  const magicLinkResendLimitGuard = new MagicLinkResendLimitGuard(
    magicLinkRepo
  );
  const authExistsGuard = new AuthExistsGuard(userService);
  const resetTokenValidGuard = new ResetTokenValidGuard(resetTokenRepo);

  const otpStrategy = new OtpForgotPasswordStrategy(
    otpRepo,
    resetTokenRepo,
    emailDispatcher,
    otpCooldownGuard,
    otpResendLimitGuard,
    otpLockoutGuard,
    authExistsGuard,
    auditService
  );
  const magicLinkStrategy = new MagicLinkForgotPasswordStrategy(
    magicLinkRepo,
    resetTokenRepo,
    emailDispatcher,
    magicLinkCooldownGuard,
    magicLinkResendLimitGuard,
    authExistsGuard,
    auditService
  );

  const forgotPasswordService = new ForgotPasswordService(
    authService,
    resetTokenRepo,
    otpStrategy,
    magicLinkStrategy,
    authExistsGuard,
    resetTokenValidGuard,
    auditService
  );
  const forgotPasswordController = new ForgotPasswordController(
    forgotPasswordService
  );

  return {
    forgotPasswordRouter: createForgotPasswordRoutes(
      forgotPasswordController,
      rateLimiter
    )
  };
};
