// libs
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { SignupController } from "./signup.controller";
// common
import { handle } from "@/common/responses";
// modules
import {
  SendOtpBodyDto,
  ResendOtpBodyDto,
  VerifyOtpBodyDto,
  CompleteSignupBodyDto,
  CheckEmailParamsDto
} from "@/modules/signup/dtos/requests";
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
    bodyPipe(SendOtpBodyDto),
    handle(controller.sendOtp, { message: "signup:success.otpSent" })
  );

  signup.post(
    "/verify-otp",
    bodyPipe(VerifyOtpBodyDto),
    handle(controller.verifyOtp, { message: "signup:success.otpVerified" })
  );

  signup.post(
    "/resend-otp",
    rl.signupOtpByIp,
    rl.signupOtpByEmail,
    bodyPipe(ResendOtpBodyDto),
    handle(controller.resendOtp, { message: "signup:success.otpResent" })
  );

  signup.post(
    "/complete",
    bodyPipe(CompleteSignupBodyDto),
    handle(controller.completeSignup, {
      status: StatusCodes.CREATED,
      message: "signup:success.signupCompleted"
    })
  );

  signup.get(
    "/check-email/:email",
    rl.checkEmailByIp,
    paramsPipe(CheckEmailParamsDto),
    handle(controller.checkEmail)
  );

  router.use("/auth/signup", signup);
  return router;
};
