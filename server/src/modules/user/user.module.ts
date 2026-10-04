// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { AuthenticationService } from "@/modules/authentication/service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// others
import { MongoUserRepository } from "./repository/impl/mongo-user.repository";
import { UserService } from "./service";
import { UserController } from "./user.controller";
import { createUserRoutes, createUserAdminRoutes } from "./user.routes";

export const createUserModule = (
  rateLimiter: RateLimiterMiddleware,
  authService: AuthenticationService,
  emailDispatcher: EmailDispatcher
) => {
  const userRepo = new MongoUserRepository();
  const userService = new UserService({
    userRepo,
    authService,
    emailDispatcher
  });
  const userController = new UserController(userService);

  return {
    userRouter: createUserRoutes(userController, rateLimiter),
    userAdminRouter: createUserAdminRoutes(userController, rateLimiter),
    userService
  };
};
