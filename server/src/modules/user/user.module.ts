// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { AuthenticationService } from "@/modules/authentication/services";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// others
import { MongoUserRepository } from "./repository/impl/mongo-user.repository";
import { UserService } from "./services";
import { UserController } from "./user.controller";
import { createUserRoutes, createUserAdminRoutes } from "./user.routes";

export const createUserModule = (
  rateLimiter: RateLimiterMiddleware,
  authService: AuthenticationService,
  emailDispatcher: EmailDispatcher,
  notificationDispatcher: NotificationDispatcher
) => {
  const userRepo = new MongoUserRepository();
  const userService = new UserService({
    userRepo,
    authService,
    emailDispatcher,
    notificationDispatcher
  });
  const userController = new UserController(userService);

  return {
    userRouter: createUserRoutes(userController, rateLimiter),
    userAdminRouter: createUserAdminRoutes(userController, rateLimiter),
    userService
  };
};
