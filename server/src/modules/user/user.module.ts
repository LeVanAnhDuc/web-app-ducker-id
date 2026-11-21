// types
import type { AuthenticationService } from "@/modules/authentication/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// others
import { MongoUserRepository } from "./repository/impl/mongo-user.repository";
import { UserService } from "./services";
import { UserAdminController } from "./user-admin.controller";
import { UserController } from "./user.controller";

export const createUserModule = (
  authService: AuthenticationService,
  emailDispatcher: EmailDispatcher,
  notificationDispatcher: NotificationDispatcher
) => {
  const userService = new UserService({
    userRepo: new MongoUserRepository(),
    authService,
    emailDispatcher,
    notificationDispatcher
  });

  return {
    userService,
    userController: new UserController(userService),
    userAdminController: new UserAdminController(userService)
  };
};
