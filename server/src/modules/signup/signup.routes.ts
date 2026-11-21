// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { SignupController } from "./signup.controller";
// common
import { STATUS_CODES } from "@/common/http";
import { handle } from "@/common/responses";
// validators
import {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  completeSignupSchema,
  checkEmailSchema
} from "@/validators/schemas/signup";
// others
import { bodyPipe, paramsPipe } from "@/middlewares";

export const createSignupRoutes = (
  controller: SignupController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();
  const signup = Router();

  signup.post(
    "/send-otp",
    rl.signupOtpByIp,
    rl.signupOtpByEmail,
    bodyPipe(sendOtpSchema),
    handle(controller.sendOtp, { message: "signup:success.otpSent" })
  );

  signup.post(
    "/verify-otp",
    bodyPipe(verifyOtpSchema),
    handle(controller.verifyOtp, { message: "signup:success.otpVerified" })
  );

  signup.post(
    "/resend-otp",
    rl.signupOtpByIp,
    rl.signupOtpByEmail,
    bodyPipe(resendOtpSchema),
    handle(controller.resendOtp, { message: "signup:success.otpResent" })
  );

  signup.post(
    "/complete",
    bodyPipe(completeSignupSchema),
    handle(controller.completeSignup, {
      status: STATUS_CODES.CREATED,
      message: "signup:success.signupCompleted"
    })
  );

  signup.get(
    "/check-email/:email",
    rl.checkEmailByIp,
    paramsPipe(checkEmailSchema),
    handle(controller.checkEmail)
  );

  router.use("/auth/signup", signup);
  return router;
};
