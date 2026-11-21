// libs
import { Router } from "express";
// types
import type { RateLimiters } from "@/middlewares";
import type { ChangePasswordController } from "./change-password.controller";
// common
import { handle } from "@/common/responses";
// modules
import { ChangePasswordBodyDto } from "@/modules/change-password/dtos/requests";
// middlewares
import { passwordChangeAuthGuard, bodyPipe } from "@/middlewares";
// others

export const createChangePasswordRoutes = (
  controller: ChangePasswordController,
  rl: RateLimiters
): Router => {
  const router = Router();

  router.patch(
    "/auth/change-password",
    // The one way out of a temporary-password session — it must accept one.
    passwordChangeAuthGuard,
    rl.changePasswordByIpAndUser,
    bodyPipe(ChangePasswordBodyDto),
    handle(controller.changePassword, {
      message: "changePassword:success.passwordChanged"
    })
  );

  return router;
};
