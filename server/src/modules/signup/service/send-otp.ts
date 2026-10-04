// types
import type { Request } from "express";
import type { SendOtpBody } from "../types";
import type { SendOtpDto } from "../dtos";
import type { SignupServiceDeps } from "./deps";
// dtos
import { toSendOtpDto } from "../dtos";
// others
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import {
  OTP_CONFIG,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_SECONDS
} from "../constants";

export const sendOtp = async (
  deps: SignupServiceDeps,
  body: SendOtpBody,
  req: Request
): Promise<SendOtpDto> => {
  const { email } = body;
  const { language } = req;

  await deps.cooldownGuard.assert(email);
  await deps.emailAvailableGuard.assert(email);

  const otp = await deps.otpSignupRepo.createAndStoreOtp(
    email,
    OTP_EXPIRY_SECONDS
  );

  await deps.otpSignupRepo.setCooldown(email, OTP_COOLDOWN_SECONDS);

  deps.emailDispatcher.send(EmailType.SIGNUP_OTP, {
    email,
    data: { otp, expiryMinutes: OTP_CONFIG.EXPIRY_MINUTES },
    locale: language as I18n.Locale
  });

  Logger.info("Signup OTP sent", {
    email,
    expiresIn: OTP_EXPIRY_SECONDS,
    cooldownSeconds: OTP_COOLDOWN_SECONDS
  });

  return toSendOtpDto(OTP_EXPIRY_SECONDS, OTP_COOLDOWN_SECONDS);
};
