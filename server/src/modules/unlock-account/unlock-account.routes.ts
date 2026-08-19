// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { UnlockAccountController } from "./unlock-account.controller";
// validators
import {
  unlockRequestSchema,
  unlockVerifySchema
} from "@/validators/schemas/unlock-account";
// others
import { bodyPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createUnlockAccountRoutes = (
  controller: UnlockAccountController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const unlock = Router();

  unlock.post(
    "/request",
    bodyPipe(unlockRequestSchema),
    asyncHandler(controller.unlockRequest)
  );

  unlock.post(
    "/verify",
    rl.loginByIp,
    bodyPipe(unlockVerifySchema),
    asyncHandler(controller.unlockVerify)
  );

  router.use("/auth/unlock", unlock);
  return router;
};
