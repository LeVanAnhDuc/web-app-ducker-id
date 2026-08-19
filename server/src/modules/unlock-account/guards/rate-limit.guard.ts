// types
import type { UnlockAccountRepository } from "../unlock-account.repository";
// common
import { TooManyRequestsError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class RateLimitGuard {
  constructor(private readonly repo: UnlockAccountRepository) {}

  async assert(email: string): Promise<void> {
    const requestCount = await this.repo.incrementRequestCount(email);

    if (this.repo.hasExceededRateLimit(requestCount)) {
      Logger.warn("Unlock request blocked - rate limit exceeded", {
        email,
        requestCount
      });
      throw new TooManyRequestsError({
        i18nMessage: (t) => t("unlockAccount:errors.unlockRateLimit"),
        code: ERROR_CODES.UNLOCK_RATE_LIMIT
      });
    }

    Logger.info("Unlock rate limit check passed", {
      email,
      requestCount,
      limit: this.repo.MAX_REQUESTS_PER_HOUR
    });
  }
}
