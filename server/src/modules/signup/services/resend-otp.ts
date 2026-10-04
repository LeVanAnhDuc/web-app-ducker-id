// types
import type { Request } from "express";
import type { ResendOtpBody } from "../types";
import type { ResendOtpDto } from "../dtos";
import type { SignupServiceDeps } from "./deps";
// common
import { BadRequestError } from "@/common/exceptions";
// dtos
import { toResendOtpDto } from "../dtos";
// others
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import {
  MAX_RESEND_COUNT,
  OTP_CONFIG,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_SECONDS,
  RESEND_WINDOW_SECONDS
} from "../constants";

export const resendOtp = async (
  deps: SignupServiceDeps,
  body: ResendOtpBody,
  req: Request
): Promise<ResendOtpDto> => {
  const { email } = body;
  const { language } = req;

  await deps.cooldownGuard.assert(email);

  const exceeded = await deps.otpSignupRepo.hasExceededResendLimit(
    email,
    MAX_RESEND_COUNT
  );

  if (exceeded) {
    Logger.warn("Resend OTP limit exceeded", {
      email,
      maxResends: MAX_RESEND_COUNT
    });
    throw new BadRequestError({
      i18nMessage: (t) => t("signup:errors.resendLimitExceeded"),
      code: ERROR_CODES.SIGNUP_RESEND_LIMIT
    });
  }

  await deps.emailAvailableGuard.assert(email);

  const otp = await deps.otpSignupRepo.createAndStoreOtp(
    email,
    OTP_EXPIRY_SECONDS
  );

  await deps.otpSignupRepo.setCooldown(email, OTP_COOLDOWN_SECONDS);

  const currentResendCount = await deps.otpSignupRepo.incrementResendCount(
    email,
    RESEND_WINDOW_SECONDS
  );

  Logger.debug("Resend attempt tracked", {
    email,
    currentCount: currentResendCount,
    maxResends: MAX_RESEND_COUNT,
    windowSeconds: RESEND_WINDOW_SECONDS
  });

  deps.emailDispatcher.send(EmailType.SIGNUP_OTP, {
    email,
    data: { otp, expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES },
    locale: language as I18n.Locale
  });

  Logger.info("Signup OTP resent", {
    email,
    resendCount: currentResendCount,
    maxResends: MAX_RESEND_COUNT
  });

  return toResendOtpDto(
    OTP_EXPIRY_SECONDS,
    OTP_COOLDOWN_SECONDS,
    currentResendCount,
    MAX_RESEND_COUNT
  );
};
