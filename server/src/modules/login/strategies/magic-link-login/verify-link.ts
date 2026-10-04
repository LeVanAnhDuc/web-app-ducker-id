// types
import type { Request } from "express";
import type { MagicLinkVerifyBody } from "../../types";
import type { LoginResponseDto } from "../../dtos";
import type { MagicLinkLoginStrategyDeps } from "./deps";
// common
import { UnauthorizedError } from "@/common/exceptions";
// modules
import { LOGIN_METHODS } from "@/modules/login-history/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

export const verifyLink = async (
  deps: MagicLinkLoginStrategyDeps,
  body: MagicLinkVerifyBody,
  req: Request
): Promise<LoginResponseDto> => {
  const { email, token } = body;

  const { auth, user } = await deps.accountExistsGuard.assert(email);

  deps.accountActiveGuard.assertWithAudit(
    auth,
    email,
    LOGIN_METHODS.MAGIC_LINK,
    req
  );
  deps.emailVerifiedGuard.assertWithAudit(
    auth,
    email,
    LOGIN_METHODS.MAGIC_LINK,
    req
  );

  const isValid = await deps.magicLinkLoginRepo.verifyToken(email, token);
  if (!isValid) {
    deps.audit.recordInvalidMagicLink({ auth, email, req });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("login:errors.invalidMagicLink"),
      code: ERROR_CODES.LOGIN_MAGIC_LINK_INVALID
    });
  }

  withRetry(() => deps.magicLinkLoginRepo.cleanupAll(email), {
    operationName: "cleanupMagicLinkData",
    context: { email }
  });

  Logger.info("Magic link verified", { email });

  return deps.completion.complete({
    auth,
    user,
    method: LOGIN_METHODS.MAGIC_LINK,
    req
  });
};
