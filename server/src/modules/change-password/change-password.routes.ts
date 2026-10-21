// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ChangePasswordController } from "./change-password.controller";
// common
import { handle } from "@/common/responses";
// validators
import { changePasswordSchema } from "@/validators/schemas/change-password";
// middlewares
import { passwordChangeAuthGuard, bodyPipe } from "@/middlewares";
// others

export const createChangePasswordRoutes = (
  controller: ChangePasswordController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();

  router.patch(
    "/auth/change-password",
    // The one way out of a temporary-password session — it must accept one.
    passwordChangeAuthGuard,
    rl.changePasswordByIpAndUser,
    bodyPipe(changePasswordSchema),
    handle(controller.changePassword, {
      message: "changePassword:success.passwordChanged"
    })
  );

  return router;
};
