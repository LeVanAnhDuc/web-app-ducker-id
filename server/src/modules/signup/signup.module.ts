// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// repositories
import {
  RedisOtpSignupRepository,
  RedisSessionSignupRepository
} from "./repositories";
// guards
import { EmailAvailableGuard, CooldownGuard } from "./guards";
// others
import { SignupService } from "./signup.service";
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

  const signupService = new SignupService(
    authService,
    userService,
    otpSignupRepo,
    sessionSignupRepo,
    emailDispatcher,
    emailAvailableGuard,
    cooldownGuard
  );
  const signupController = new SignupController(signupService);

  return {
    signupRouter: createSignupRoutes(signupController, rateLimiter),
    signupService
  };
};
