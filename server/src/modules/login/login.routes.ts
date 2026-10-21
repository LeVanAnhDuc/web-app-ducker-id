// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { LoginController } from "./login.controller";
// common
import { handle } from "@/common/responses";
// validators
import {
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  magicLinkSendSchema,
  magicLinkVerifySchema
} from "@/validators/schemas/login";
// others
import { bodyPipe } from "@/middlewares";

export const createLoginRoutes = (
  controller: LoginController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const login = Router();

  login.post(
    "/",
    rl.loginByIp,
    bodyPipe(loginSchema),
    handle(controller.login, { message: "login:success.loginSuccessful" })
  );

  login.post(
    "/otp/send",
    rl.loginOtpByIp,
    rl.loginOtpByEmail,
    bodyPipe(otpSendSchema),
    handle(controller.sendOtp, { message: "login:success.otpSent" })
  );

  login.post(
    "/otp/verify",
    rl.loginByIp,
    bodyPipe(otpVerifySchema),
    handle(controller.verifyOtp, { message: "login:success.loginSuccessful" })
  );

  login.post(
    "/magic-link/send",
    rl.magicLinkByIp,
    rl.magicLinkByEmail,
    bodyPipe(magicLinkSendSchema),
    handle(controller.sendMagicLink, { message: "login:success.magicLinkSent" })
  );

  login.post(
    "/magic-link/verify",
    rl.loginByIp,
    bodyPipe(magicLinkVerifySchema),
    handle(controller.verifyMagicLink, {
      message: "login:success.loginSuccessful"
    })
  );

  router.use("/auth/login", login);
  return router;
};
