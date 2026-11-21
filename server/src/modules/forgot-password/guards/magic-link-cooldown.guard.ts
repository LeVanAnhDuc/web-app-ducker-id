// types
import type { MagicLinkForgotPasswordRepository } from "../repositories/magic-link-forgot-password.repository";
// common
import { BadRequestError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class MagicLinkCooldownGuard {
  constructor(
    private readonly magicLinkRepo: MagicLinkForgotPasswordRepository
  ) {}

  async assert(email: string): Promise<void> {
    const remaining = await this.magicLinkRepo.getCooldownRemaining(email);

    if (!remaining) return;

    Logger.warn("Forgot password magic link cooldown not expired", {
      email,
      remaining
    });
    throw new BadRequestError({
      key: "forgotPassword:errors.magicLinkCooldown",
      params: { seconds: remaining },
      code: ERROR_CODES.FORGOT_PASSWORD_MAGIC_LINK_COOLDOWN
    });
  }
}
