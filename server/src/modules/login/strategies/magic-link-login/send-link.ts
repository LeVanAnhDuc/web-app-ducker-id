// types
import type { Request } from "express";
import type { MagicLinkSendBody } from "../../types";
import type { MagicLinkSendDto } from "../../dtos";
import type { MagicLinkLoginStrategyDeps } from "./deps";
// dtos
import { toMagicLinkSendDto } from "../../dtos";
// others
import ENV from "@/constants/env";
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";
import { MAGIC_LINK_CONFIG } from "../../constants";

export const sendLink = async (
  deps: MagicLinkLoginStrategyDeps,
  body: MagicLinkSendBody,
  req: Request
): Promise<MagicLinkSendDto> => {
  const { email } = body;
  const { language } = req;

  await deps.magicLinkCooldownGuard.assert(email);

  const result = await deps.accountExistsGuard.tryFind(email);
  const isEligible = deps.accountExistsGuard.isLoginEligible(result);

  if (!isEligible) {
    Logger.debug("Magic link send skipped — account not eligible", {
      email
    });
    withRetry(() => deps.magicLinkLoginRepo.setCooldownAfterSend(email), {
      operationName: "setMagicLinkCooldown",
      context: { email }
    });
    return toMagicLinkSendDto(
      deps.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS,
      deps.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS
    );
  }

  const token = await deps.magicLinkLoginRepo.createAndStoreToken(email);

  withRetry(() => deps.magicLinkLoginRepo.setCooldownAfterSend(email), {
    operationName: "setMagicLinkCooldown",
    context: { email }
  });

  const magicLinkUrl = `${ENV.CLIENT_URL}/login/verify-magic-link?token=${token}&email=${encodeURIComponent(email)}`;
  deps.emailDispatcher.send(EmailType.MAGIC_LINK, {
    email,
    data: { magicLinkUrl, expiryMinutes: MAGIC_LINK_CONFIG.EXPIRY_MINUTES },
    locale: language as I18n.Locale
  });

  Logger.info("Magic link sent", {
    email,
    expiresIn: deps.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS,
    cooldown: deps.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS
  });

  return toMagicLinkSendDto(
    deps.magicLinkLoginRepo.MAGIC_LINK_EXPIRY_SECONDS,
    deps.magicLinkLoginRepo.MAGIC_LINK_COOLDOWN_SECONDS
  );
};
