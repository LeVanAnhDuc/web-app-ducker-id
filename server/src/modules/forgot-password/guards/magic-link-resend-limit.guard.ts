// types
import type { MagicLinkForgotPasswordRepository } from "../repositories";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class MagicLinkResendLimitGuard {
  constructor(
    private readonly magicLinkRepo: MagicLinkForgotPasswordRepository
  ) {}

  async assert(email: string): Promise<void> {
    const exceeded = await this.magicLinkRepo.hasExceededResendLimit(email);
    if (!exceeded) return;

    Logger.warn("Forgot password magic link resend limit exceeded", { email });
    throw new BadRequestError({
      i18nMessage: (t) =>
        t("forgotPassword:errors.magicLinkResendLimitExceeded"),
      code: ERROR_CODES.FORGOT_PASSWORD_MAGIC_LINK_RESEND_LIMIT
    });
  }
}
