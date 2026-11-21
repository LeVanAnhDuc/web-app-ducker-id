// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ForgotPasswordController } from "./forgot-password.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  OtpSendBodyDto,
  OtpVerifyBodyDto,
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  ResetPasswordBodyDto
} from "@/modules/forgot-password/dtos/requests";
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
    bodyPipe(OtpSendBodyDto),
    handle(controller.sendOtp, { message: "forgotPassword:success.otpSent" })
  );

  forgotPassword.post(
    "/otp/verify",
    rl.forgotPasswordOtpByIp,
    bodyPipe(OtpVerifyBodyDto),
    handle(controller.verifyOtp, {
      message: "forgotPassword:success.otpVerified"
    })
  );

  forgotPassword.post(
    "/magic-link/send",
    rl.forgotPasswordMagicLinkByIp,
    rl.forgotPasswordMagicLinkByEmail,
    bodyPipe(MagicLinkSendBodyDto),
    handle(controller.sendMagicLink, {
      message: "forgotPassword:success.magicLinkSent"
    })
  );

  forgotPassword.post(
    "/magic-link/verify",
    rl.forgotPasswordMagicLinkByIp,
    bodyPipe(MagicLinkVerifyBodyDto),
    handle(controller.verifyMagicLink, {
      message: "forgotPassword:success.magicLinkVerified"
    })
  );

  forgotPassword.post(
    "/reset",
    rl.forgotPasswordResetByIp,
    bodyPipe(ResetPasswordBodyDto),
    handle(controller.resetPassword, {
      message: "forgotPassword:success.passwordReset"
    })
  );

  router.use("/auth/forgot-password", forgotPassword);
  return router;
};
