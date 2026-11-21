// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { UserController } from "./user.controller";
// common
import { handle } from "@/common/responses";
// validators
import {
  updateProfileSchema,
  getPublicProfileSchema,
  adminUsersQuerySchema,
  adminUserIdParamsSchema
} from "@/validators/schemas/user";
// others
import {
  adminGuard,
  authGuard,
  bodyPipe,
  paramsPipe,
  queryPipe
} from "@/middlewares";

export const createUserRoutes = (
  controller: UserController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const users = Router();

  users.get(
    "/me",
    authGuard,
    handle(controller.getMyProfile, { message: "user:success.getProfile" })
  );

  users.patch(
    "/me",
    rl.updateProfileByIp,
    authGuard,
    bodyPipe(updateProfileSchema),
    handle(controller.updateMyProfile, {
      message: "user:success.updateProfile"
    })
  );

  users.get(
    "/:id",
    paramsPipe(getPublicProfileSchema),
    handle(controller.getPublicProfile, {
      message: "user:success.getPublicProfile"
    })
  );

  router.use("/users", users);
  return router;
};

export const createUserAdminRoutes = (
  controller: UserController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const adminUsers = Router();

  adminUsers.use(authGuard, adminGuard);

  adminUsers.get(
    "/",
    queryPipe(adminUsersQuerySchema),
    handle(controller.getAdminUsers, { message: "user:success.getAdminUsers" })
  );

  adminUsers.patch(
    "/:id/lock",
    rl.adminUserMutationByIpAndUser,
    paramsPipe(adminUserIdParamsSchema),
    handle(controller.lockUser, { message: "user:success.lockUser" })
  );
  adminUsers.patch(
    "/:id/unlock",
    rl.adminUserMutationByIpAndUser,
    paramsPipe(adminUserIdParamsSchema),
    handle(controller.unlockUser, { message: "user:success.unlockUser" })
  );
  adminUsers.post(
    "/:id/reset-password",
    rl.adminUserMutationByIpAndUser,
    paramsPipe(adminUserIdParamsSchema),
    handle(controller.resetUserPassword, {
      message: "user:success.resetPassword"
    })
  );

  router.use("/admin/users", adminUsers);
  return router;
};
