// types
import type { FPOtpSendRequest } from "../../types";
import type { SendOtpResponseDto } from "../../dtos";
import type { OtpForgotPasswordStrategyDeps } from "./deps";
// dtos
import { toSendOtpResponseDto } from "../../dtos";
// others
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { FORGOT_PASSWORD_OTP_CONFIG } from "../../constants";

export const sendCode = async (
  deps: OtpForgotPasswordStrategyDeps,
  req: FPOtpSendRequest
): Promise<SendOtpResponseDto> => {
  const { email } = req.body;
  const { language } = req;

  await deps.cooldownGuard.assert(email);
  await deps.resendLimitGuard.assert(email);

  const result = await deps.authExistsGuard.tryFind(email);

  if (!result || !result.auth.isActive) {
    Logger.info(
      "Forgot password OTP - email not found or inactive (fake success)",
      { email }
    );
    return toSendOtpResponseDto(
      deps.otpRepo.OTP_EXPIRY_SECONDS,
      deps.otpRepo.OTP_COOLDOWN_SECONDS
    );
  }

  const otp = await deps.otpRepo.createAndStoreOtp(email);

  withRetry(() => deps.otpRepo.setRateLimits(email), {
    operationName: "setForgotPasswordOtpRateLimits",
    context: { email }
  });

  deps.emailDispatcher.send(EmailType.FORGOT_PASSWORD_OTP, {
    email,
    data: { otp, expiryMinutes: FORGOT_PASSWORD_OTP_CONFIG.EXPIRY_MINUTES },
    locale: language as I18n.Locale
  });

  Logger.info("Forgot-password OTP sent", {
    email,
    expiresIn: deps.otpRepo.OTP_EXPIRY_SECONDS,
    cooldown: deps.otpRepo.OTP_COOLDOWN_SECONDS
  });

  return toSendOtpResponseDto(
    deps.otpRepo.OTP_EXPIRY_SECONDS,
    deps.otpRepo.OTP_COOLDOWN_SECONDS
  );
};
