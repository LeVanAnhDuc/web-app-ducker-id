// types
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// guards
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
// others
import { ChangePasswordService } from "./change-password.service";
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
