// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { UserController } from "./user.controller";
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
import { asyncHandler } from "@/utils/async-handler";

export const createUserRoutes = (
  controller: UserController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const users = Router();

  users.get("/me", authGuard, asyncHandler(controller.getMyProfile));

  users.patch(
    "/me",
    rl.updateProfileByIp,
    authGuard,
    bodyPipe(updateProfileSchema),
    asyncHandler(controller.updateMyProfile)
  );

  users.get(
    "/:id",
    paramsPipe(getPublicProfileSchema),
    asyncHandler(controller.getPublicProfile)
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
    asyncHandler(controller.getAdminUsers)
  );

  adminUsers.patch(
    "/:id/lock",
    rl.adminUserMutationByIpAndUser,
    paramsPipe(adminUserIdParamsSchema),
    asyncHandler(controller.lockUser)
  );
  adminUsers.patch(
    "/:id/unlock",
    rl.adminUserMutationByIpAndUser,
    paramsPipe(adminUserIdParamsSchema),
    asyncHandler(controller.unlockUser)
  );
  adminUsers.post(
    "/:id/reset-password",
    rl.adminUserMutationByIpAndUser,
    paramsPipe(adminUserIdParamsSchema),
    asyncHandler(controller.resetUserPassword)
  );

  router.use("/admin/users", adminUsers);
  return router;
};
