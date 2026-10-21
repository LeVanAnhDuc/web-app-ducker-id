// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ForgotPasswordController } from "./forgot-password.controller";
// common
import { handle } from "@/common/responses";
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
    handle(controller.sendOtp, { message: "forgotPassword:success.otpSent" })
  );

  forgotPassword.post(
    "/otp/verify",
    rl.forgotPasswordOtpByIp,
    bodyPipe(fpOtpVerifySchema),
    handle(controller.verifyOtp, {
      message: "forgotPassword:success.otpVerified"
    })
  );

  forgotPassword.post(
    "/magic-link/send",
    rl.forgotPasswordMagicLinkByIp,
    rl.forgotPasswordMagicLinkByEmail,
    bodyPipe(fpMagicLinkSendSchema),
    handle(controller.sendMagicLink, {
      message: "forgotPassword:success.magicLinkSent"
    })
  );

  forgotPassword.post(
    "/magic-link/verify",
    rl.forgotPasswordMagicLinkByIp,
    bodyPipe(fpMagicLinkVerifySchema),
    handle(controller.verifyMagicLink, {
      message: "forgotPassword:success.magicLinkVerified"
    })
  );

  forgotPassword.post(
    "/reset",
    rl.forgotPasswordResetByIp,
    bodyPipe(fpResetPasswordSchema),
    handle(controller.resetPassword, {
      message: "forgotPassword:success.passwordReset"
    })
  );

  router.use("/auth/forgot-password", forgotPassword);
  return router;
};
