// types
import type { SendOtpBodyDto } from "../dtos/requests";
import type { SendOtpDto } from "../dtos";
import type { OtpSignupRepository } from "../repositories/otp-signup.repository";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { EmailAvailableGuard, CooldownGuard } from "../guards";
// dtos
import { toSendOtpDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import {
  OTP_CONFIG,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_SECONDS
} from "../constants";

export const sendOtp = async (
  deps: {
    otpSignupRepo: OtpSignupRepository;
    emailDispatcher: EmailDispatcher;
    emailAvailableGuard: EmailAvailableGuard;
    cooldownGuard: CooldownGuard;
  },
  body: SendOtpBodyDto
): Promise<SendOtpDto> => {
  const { email } = body;
  const { language } = RequestContext.getClient();

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
