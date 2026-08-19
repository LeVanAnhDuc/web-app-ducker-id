// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ChangePasswordController } from "./change-password.controller";
// validators
import { changePasswordSchema } from "@/validators/schemas/change-password";
// middlewares
import { authGuard, bodyPipe } from "@/middlewares";
// others
import { asyncHandler } from "@/utils/async-handler";

export const createChangePasswordRoutes = (
  controller: ChangePasswordController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();

  router.patch(
    "/auth/change-password",
    authGuard,
    rl.changePasswordByIpAndUser,
    bodyPipe(changePasswordSchema),
    asyncHandler(controller.changePassword)
  );

  return router;
};
