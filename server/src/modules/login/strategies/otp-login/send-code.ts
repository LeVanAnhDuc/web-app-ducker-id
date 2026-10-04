// types
import type { Request } from "express";
import type { OtpSendBody } from "../../types";
import type { OtpSendDto } from "../../dtos";
import type { OtpLoginStrategyDeps } from "./deps";
// common
import { BadRequestError } from "@/common/exceptions";
// dtos
import { toOtpSendDto } from "../../dtos";
// others
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { LOGIN_OTP_CONFIG } from "../../constants";

export const sendCode = async (
  deps: OtpLoginStrategyDeps,
  body: OtpSendBody,
  req: Request
): Promise<OtpSendDto> => {
  const { email } = body;
  const { language } = req;

  await deps.otpCooldownGuard.assert(email);

  const result = await deps.accountExistsGuard.tryFind(email);
  const isEligible = deps.accountExistsGuard.isLoginEligible(result);

  if (!isEligible) {
    Logger.debug("Login OTP send skipped — account not eligible", { email });
    withRetry(() => deps.otpLoginRepo.setRateLimits(email), {
      operationName: "setOtpRateLimits",
      context: { email }
    });
    return toOtpSendDto(
      deps.otpLoginRepo.OTP_EXPIRY_SECONDS,
      deps.otpLoginRepo.OTP_COOLDOWN_SECONDS
    );
  }

  const exceeded = await deps.otpLoginRepo.hasExceededResendLimit(email);
  if (exceeded) {
    Logger.warn("Login OTP resend limit exceeded", { email });
    throw new BadRequestError({
      i18nMessage: (t) => t("login:errors.otpResendLimitExceeded"),
      code: ERROR_CODES.LOGIN_OTP_RESEND_LIMIT
    });
  }

  const otp = await deps.otpLoginRepo.createAndStoreOtp(email);

  deps.otpLoginRepo.setRateLimits(email);

  deps.emailDispatcher.send(EmailType.LOGIN_OTP, {
    email,
    data: { otp, expiryMinutes: LOGIN_OTP_CONFIG.EXPIRY_MINUTES },
    locale: language as I18n.Locale
  });

  Logger.info("Login OTP sent", {
    email,
    expiresIn: deps.otpLoginRepo.OTP_EXPIRY_SECONDS,
    cooldown: deps.otpLoginRepo.OTP_COOLDOWN_SECONDS
  });

  return toOtpSendDto(
    deps.otpLoginRepo.OTP_EXPIRY_SECONDS,
    deps.otpLoginRepo.OTP_COOLDOWN_SECONDS
  );
};
