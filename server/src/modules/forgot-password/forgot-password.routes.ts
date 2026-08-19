// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ForgotPasswordController } from "./forgot-password.controller";
// validators
import {
  fpOtpSendSchema,
  fpOtpVerifySchema,
  fpMagicLinkSendSchema,
  fpMagicLinkVerifySchema,
  fpResetPasswordSchema
} from "@/validators/schemas/forgot-password";
// others
import { bodyPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createForgotPasswordRoutes = (
  controller: ForgotPasswordController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const forgotPassword = Router();

  forgotPassword.post(
    "/otp/send",
    rl.forgotPasswordOtpByIp,
    rl.forgotPasswordOtpByEmail,
    bodyPipe(fpOtpSendSchema),
    asyncHandler(controller.sendOtp)
  );

  forgotPassword.post(
    "/otp/verify",
    rl.forgotPasswordOtpByIp,
    bodyPipe(fpOtpVerifySchema),
    asyncHandler(controller.verifyOtp)
  );

  forgotPassword.post(
    "/magic-link/send",
    rl.forgotPasswordMagicLinkByIp,
    rl.forgotPasswordMagicLinkByEmail,
    bodyPipe(fpMagicLinkSendSchema),
    asyncHandler(controller.sendMagicLink)
  );

  forgotPassword.post(
    "/magic-link/verify",
    rl.forgotPasswordMagicLinkByIp,
    bodyPipe(fpMagicLinkVerifySchema),
    asyncHandler(controller.verifyMagicLink)
  );

  forgotPassword.post(
    "/reset",
    rl.forgotPasswordResetByIp,
    bodyPipe(fpResetPasswordSchema),
    asyncHandler(controller.resetPassword)
  );

  router.use("/auth/forgot-password", forgotPassword);
  return router;
};
