// types
import type { OtpSendBodyDto } from "../../dtos/requests";
import type { OtpSendDto } from "../../dtos";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { OtpLoginRepository } from "../../repositories/otp-login.repository";
import type { AccountExistsGuard, OtpCooldownGuard } from "../../guards";
// common
import { BadRequestError } from "@/exceptions";
// dtos
import { toOtpSendDto } from "../../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { LOGIN_OTP_CONFIG } from "../../constants";

export const sendCode = async (
  deps: {
    accountExistsGuard: AccountExistsGuard;
    otpCooldownGuard: OtpCooldownGuard;
    otpLoginRepo: OtpLoginRepository;
    emailDispatcher: EmailDispatcher;
  },
  body: OtpSendBodyDto
): Promise<OtpSendDto> => {
  const { email } = body;
  const { language } = RequestContext.getClient();

  await deps.otpCooldownGuard.assert(email);

  // The cap is checked BEFORE the eligibility branch: the ineligible path
  // counts its sends too (setRateLimits), so a 4th send answers 400 for a
  // real account and an unknown address alike — no account enumeration.
  const exceeded = await deps.otpLoginRepo.hasExceededResendLimit(email);
  if (exceeded) {
    Logger.warn("Login OTP resend limit exceeded", { email });
    throw new BadRequestError({
      key: "login:errors.otpResendLimitExceeded",
      code: ERROR_CODES.LOGIN_OTP_RESEND_LIMIT
    });
  }

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
