// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// guards
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
// others
import { ChangePasswordService } from "./services";
import { ChangePasswordController } from "./change-password.controller";
import { createChangePasswordRoutes } from "./change-password.routes";

export const createChangePasswordModule = (
  authService: AuthenticationService,
  userService: UserService,
  emailDispatcher: EmailDispatcher,
  notificationDispatcher: NotificationDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  const wrongCurrentPasswordGuard = new WrongCurrentPasswordGuard();
  const samePasswordGuard = new SamePasswordGuard();

  const changePasswordService = new ChangePasswordService(
    authService,
    userService,
    emailDispatcher,
    notificationDispatcher,
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
