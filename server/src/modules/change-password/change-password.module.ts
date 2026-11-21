// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { UserService } from "@/modules/user/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// guards
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
// others
import { ChangePasswordService } from "./services";
import { ChangePasswordController } from "./change-password.controller";

export const createChangePasswordModule = (
  authService: AuthenticationService,
  userService: UserService,
  emailDispatcher: EmailDispatcher,
  notificationDispatcher: NotificationDispatcher
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
  return {
    changePasswordController: new ChangePasswordController(
      changePasswordService
    )
  };
};
