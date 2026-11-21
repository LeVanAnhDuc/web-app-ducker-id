// libs
import { Router } from "express";
// types
import type { RateLimiters } from "@/middlewares";
import type { UnlockAccountController } from "./unlock-account.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  UnlockRequestBodyDto,
  UnlockVerifyBodyDto
} from "@/modules/unlock-account/dtos/requests";
// others
import { bodyPipe } from "@/middlewares";

export const createUnlockAccountRoutes = (
  controller: UnlockAccountController,
  rl: RateLimiters
): Router => {
  const router = Router();
  const unlock = Router();

  unlock.post(
    "/request",
    bodyPipe(UnlockRequestBodyDto),
    handle(controller.unlockRequest, {
      message: "unlockAccount:success.unlockEmailSent"
    })
  );

  unlock.post(
    "/verify",
    rl.loginByIp,
    bodyPipe(UnlockVerifyBodyDto),
    handle(controller.unlockVerify, {
      message: "unlockAccount:success.accountUnlocked"
    })
  );

  router.use("/auth/unlock", unlock);
  return router;
};
