// types
import type { Request } from "express";
import type { UnlockRequestBody } from "../types";
import type { UnlockRequestDto } from "../dtos";
import type { UnlockAccountServiceDeps } from "./deps";
// common
import { BadRequestError } from "@/common/exceptions";
// dtos
import { toUnlockRequestDto } from "../dtos";
// others
import ENV from "@/constants/env";
import { generateTempPassword } from "@/utils/crypto/temp-password";
import { EmailType } from "@/types/services/email";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export const unlockRequest = async (
  deps: UnlockAccountServiceDeps,
  body: UnlockRequestBody,
  req: Request
): Promise<UnlockRequestDto> => {
  const { email } = body;
  const { language } = req;

  Logger.info("Processing unlock request", { email });

  await deps.cooldownGuard.assert(email);
  await deps.rateLimitGuard.assert(email);

  const result = await deps.authExistsGuard.tryFind(email);

  if (!result) {
    Logger.warn("Unlock request for non-existent email", { email });
    await deps.unlockAccountRepo.setCooldown(email);
    return toUnlockRequestDto();
  }

  const { auth } = result;

  if (!auth.isActive) {
    Logger.warn("Unlock request for disabled account", {
      email,
      authId: auth._id
    });
    throw new BadRequestError({
      i18nMessage: (t) => t("unlockAccount:errors.accountDisabled"),
      code: ERROR_CODES.UNLOCK_ACCOUNT_DISABLED
    });
  }

  const isLocked = await deps.loginService.isEmailLocked(email);
  if (!isLocked) {
    Logger.info("Unlock request for non-locked account", {
      email,
      authId: auth._id
    });
    throw new BadRequestError({
      i18nMessage: (t) => t("unlockAccount:errors.accountNotLocked"),
      code: ERROR_CODES.UNLOCK_ACCOUNT_NOT_LOCKED
    });
  }

  const tempPassword = generateTempPassword();

  await deps.unlockAccountRepo.storeTempPassword(email, tempPassword);

  Logger.info("Temporary password generated and saved", {
    email,
    authId: auth._id,
    expiresInSeconds: deps.unlockAccountRepo.TEMP_PASSWORD_EXPIRY_SECONDS
  });

  deps.emailDispatcher.send(EmailType.UNLOCK_TEMP_PASSWORD, {
    email,
    data: {
      tempPassword,
      loginUrl: ENV.CLIENT_URL || "http://localhost:3000/login"
    },
    locale: language as I18n.Locale
  });

  await deps.unlockAccountRepo.setCooldown(email);

  Logger.info("Unlock email sent successfully", { email });

  return toUnlockRequestDto();
};
