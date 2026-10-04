// types
import type { FPMagicLinkVerifyRequest } from "../../types";
import type { VerifyMagicLinkResponseDto } from "../../dtos";
import type { MagicLinkForgotPasswordStrategyDeps } from "./deps";
// common
import { UnauthorizedError } from "@/common/exceptions";
// dtos
import { toVerifyMagicLinkResponseDto } from "../../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

export const verifyLink = async (
  deps: MagicLinkForgotPasswordStrategyDeps,
  req: FPMagicLinkVerifyRequest
): Promise<VerifyMagicLinkResponseDto> => {
  const { email, token } = req.body;

  const { auth } = await deps.authExistsGuard.assert(email);

  const isValid = await deps.magicLinkRepo.verifyToken(email, token);
  if (!isValid) {
    deps.audit.recordInvalidMagicLink({ email, auth, req });
    throw new UnauthorizedError({
      i18nMessage: (t) => t("forgotPassword:errors.invalidMagicLink"),
      code: ERROR_CODES.FORGOT_PASSWORD_MAGIC_LINK_INVALID
    });
  }

  const resetToken = await deps.resetTokenRepo.createAndStore(email);

  withRetry(() => deps.magicLinkRepo.cleanupAll(email), {
    operationName: "cleanupForgotPasswordMagicLinkData",
    context: { email }
  });

  Logger.info("Forgot-password magic link verified", { email });

  return toVerifyMagicLinkResponseDto(resetToken);
};
