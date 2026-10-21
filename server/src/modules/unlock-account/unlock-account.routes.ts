// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { UnlockAccountController } from "./unlock-account.controller";
// common
import { handle } from "@/common/responses";
// validators
import {
  unlockRequestSchema,
  unlockVerifySchema
} from "@/validators/schemas/unlock-account";
// others
import { bodyPipe } from "@/middlewares";

export const createUnlockAccountRoutes = (
  controller: UnlockAccountController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const unlock = Router();

  unlock.post(
    "/request",
    bodyPipe(unlockRequestSchema),
    handle(controller.unlockRequest, {
      message: "unlockAccount:success.unlockEmailSent"
    })
  );

  unlock.post(
    "/verify",
    rl.loginByIp,
    bodyPipe(unlockVerifySchema),
    handle(controller.unlockVerify, {
      message: "unlockAccount:success.accountUnlocked"
    })
  );

  router.use("/auth/unlock", unlock);
  return router;
};
