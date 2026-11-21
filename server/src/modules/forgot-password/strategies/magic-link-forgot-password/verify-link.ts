// types
import type { MagicLinkVerifyBodyDto } from "../../dtos/requests";
import type { VerifyMagicLinkResponseDto } from "../../dtos";
import type { MagicLinkForgotPasswordRepository } from "../../repositories/magic-link-forgot-password.repository";
import type { ResetTokenRepository } from "../../repositories/reset-token.repository";
import type { AuthExistsGuard } from "../../guards";
import type { ForgotPasswordAuditService } from "../../services/forgot-password-audit";
// common
import { UnauthorizedError } from "@/exceptions";
// dtos
import { toVerifyMagicLinkResponseDto } from "../../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

export const verifyLink = async (
  deps: {
    magicLinkRepo: MagicLinkForgotPasswordRepository;
    resetTokenRepo: ResetTokenRepository;
    authExistsGuard: AuthExistsGuard;
    audit: ForgotPasswordAuditService;
  },
  body: MagicLinkVerifyBodyDto
): Promise<VerifyMagicLinkResponseDto> => {
  const { email, token } = body;

  const { auth } = await deps.authExistsGuard.assert(email);

  const isValid = await deps.magicLinkRepo.verifyToken(email, token);
  if (!isValid) {
    deps.audit.recordInvalidMagicLink({ email, auth });
    throw new UnauthorizedError({
      key: "forgotPassword:errors.invalidMagicLink",
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
