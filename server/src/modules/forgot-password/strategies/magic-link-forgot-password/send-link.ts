// types
import type { FPMagicLinkSendRequest } from "../../types";
import type { SendMagicLinkResponseDto } from "../../dtos";
import type { MagicLinkForgotPasswordStrategyDeps } from "./deps";
// dtos
import { toSendMagicLinkResponseDto } from "../../dtos";
// others
import ENV from "@/constants/env";
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { FORGOT_PASSWORD_MAGIC_LINK_CONFIG } from "../../constants";

/** Pure-ish wrapper quanh dispatcher; chỉ `sendLink` dùng. */
const sendMagicLinkEmail = (
  deps: MagicLinkForgotPasswordStrategyDeps,
  email: string,
  token: string,
  language: string
): void => {
  const magicLinkUrl = `${ENV.CLIENT_URL}/reset-password?email=${encodeURIComponent(email)}&token=${token}&method=magic-link`;
  deps.emailDispatcher.send(EmailType.MAGIC_LINK, {
    email,
    data: {
      magicLinkUrl,
      expiryMinutes: FORGOT_PASSWORD_MAGIC_LINK_CONFIG.EXPIRY_MINUTES
    },
    locale: language as I18n.Locale
  });
};

export const sendLink = async (
  deps: MagicLinkForgotPasswordStrategyDeps,
  req: FPMagicLinkSendRequest
): Promise<SendMagicLinkResponseDto> => {
  const { email } = req.body;
  const { language } = req;

  await deps.cooldownGuard.assert(email);
  await deps.resendLimitGuard.assert(email);

  const result = await deps.authExistsGuard.tryFind(email);

  if (!result || !result.auth.isActive) {
    Logger.info(
      "Forgot password magic link - email not found or inactive (fake success)",
      { email }
    );
    return toSendMagicLinkResponseDto(
      deps.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
      deps.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
    );
  }

  const token = await deps.magicLinkRepo.createAndStoreToken(email);

  withRetry(() => deps.magicLinkRepo.setRateLimits(email), {
    operationName: "setForgotPasswordMagicLinkRateLimits",
    context: { email }
  });

  sendMagicLinkEmail(deps, email, token, language);

  Logger.info("Forgot-password magic link sent", {
    email,
    expiresIn: deps.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
    cooldown: deps.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
  });

  return toSendMagicLinkResponseDto(
    deps.magicLinkRepo.MAGIC_LINK_EXPIRY_SECONDS,
    deps.magicLinkRepo.MAGIC_LINK_COOLDOWN_SECONDS
  );
};
