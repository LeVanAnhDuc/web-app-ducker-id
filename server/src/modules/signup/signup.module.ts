// types
import type { RedisClientType } from "redis";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// repositories
import { RedisOtpSignupRepository } from "./repositories/impl/redis-otp-signup.repository";
import { RedisSessionSignupRepository } from "./repositories/impl/redis-session-signup.repository";
// guards
import { EmailAvailableGuard, CooldownGuard } from "./guards";
// others
import { SignupService } from "./services";
import { SignupController } from "./signup.controller";

export const createSignupModule = (
  redisClient: RedisClientType,
  authService: AuthenticationService,
  userService: UserService,
  emailDispatcher: EmailDispatcher
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

  return {
    signupController: new SignupController(signupService),
    signupService
  };
};
