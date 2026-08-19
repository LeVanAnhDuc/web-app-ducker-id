// types
import type { UnlockAccountRepository } from "../unlock-account.repository";
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class CooldownGuard {
  constructor(private readonly repo: UnlockAccountRepository) {}

  async assert(email: string): Promise<void> {
    const remaining = await this.repo.getCooldownRemaining(email);

    if (!remaining) return;

    Logger.warn("Unlock request blocked - cooldown active", {
      email,
      remainingSeconds: remaining
    });
    throw new BadRequestError({
      i18nMessage: (t) =>
        t("unlockAccount:errors.unlockCooldown", { seconds: remaining }),
      code: ERROR_CODES.UNLOCK_COOLDOWN
    });
  }
}
