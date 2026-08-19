// types
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// guards
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
// others
import { ChangePasswordService } from "./change-password.service";
import { ChangePasswordController } from "./change-password.controller";
import { createChangePasswordRoutes } from "./change-password.routes";

export const createChangePasswordModule = (
  authService: AuthenticationService,
  userService: UserService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  const wrongCurrentPasswordGuard = new WrongCurrentPasswordGuard();
  const samePasswordGuard = new SamePasswordGuard();

  const changePasswordService = new ChangePasswordService(
    authService,
    userService,
    emailDispatcher,
    wrongCurrentPasswordGuard,
    samePasswordGuard
  );
  const changePasswordController = new ChangePasswordController(
    changePasswordService
  );

  return {
    changePasswordRouter: createChangePasswordRoutes(
      changePasswordController,
      rateLimiter
    )
  };
};
