// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { LoginHistoryService } from "@/modules/login-history/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiters } from "@/middlewares";
// repositories
import { RedisOtpForgotPasswordRepository } from "./repositories/impl/redis-otp-forgot-password.repository";
import { RedisMagicLinkForgotPasswordRepository } from "./repositories/impl/redis-magic-link-forgot-password.repository";
import { RedisResetTokenRepository } from "./repositories/impl/redis-reset-token.repository";
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
import { ForgotPasswordService } from "./services/forgot-password";
import { ForgotPasswordAuditService } from "./services/forgot-password-audit";
import { OtpForgotPasswordStrategy } from "./strategies/otp-forgot-password";
import { MagicLinkForgotPasswordStrategy } from "./strategies/magic-link-forgot-password";
import { ForgotPasswordController } from "./forgot-password.controller";
import { createForgotPasswordRoutes } from "./forgot-password.routes";

export const createForgotPasswordModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService,
  loginHistorySvc: LoginHistoryService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiters
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
