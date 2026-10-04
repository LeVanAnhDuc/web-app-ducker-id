// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/service";
import type { UserService } from "@/modules/user/service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// repositories
import { RedisOtpSignupRepository } from "./repositories/impl/redis-otp-signup.repository";
import { RedisSessionSignupRepository } from "./repositories/impl/redis-session-signup.repository";
// guards
import { EmailAvailableGuard, CooldownGuard } from "./guards";
// others
import { SignupService } from "./service";
import { SignupController } from "./signup.controller";
import { createSignupRoutes } from "./signup.routes";

export const createSignupModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  const otpSignupRepo = new RedisOtpSignupRepository(redisClient);
  const sessionSignupRepo = new RedisSessionSignupRepository(redisClient);

  const emailAvailableGuard = new EmailAvailableGuard(userService);
  const cooldownGuard = new CooldownGuard(otpSignupRepo);

  const signupService = new SignupService({
    authService,
    userService,
    otpSignupRepo,
    sessionSignupRepo,
    emailDispatcher,
    emailAvailableGuard,
    cooldownGuard
  });
  const signupController = new SignupController(signupService);

  return {
    signupRouter: createSignupRoutes(signupController, rateLimiter),
    signupService
  };
};
