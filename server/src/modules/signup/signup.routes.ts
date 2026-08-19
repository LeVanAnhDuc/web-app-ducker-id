// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { SignupController } from "./signup.controller";
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
import { asyncHandler } from "@/utils/async-handler";

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
    asyncHandler(controller.sendOtp)
  );

  signup.post(
    "/verify-otp",
    bodyPipe(verifyOtpSchema),
    asyncHandler(controller.verifyOtp)
  );

  signup.post(
    "/resend-otp",
    rl.signupOtpByIp,
    rl.signupOtpByEmail,
    bodyPipe(resendOtpSchema),
    asyncHandler(controller.resendOtp)
  );

  signup.post(
    "/complete",
    bodyPipe(completeSignupSchema),
    asyncHandler(controller.completeSignup)
  );

  signup.get(
    "/check-email/:email",
    rl.checkEmailByIp,
    paramsPipe(checkEmailSchema),
    asyncHandler(controller.checkEmail)
  );

  router.use("/auth/signup", signup);
  return router;
};
