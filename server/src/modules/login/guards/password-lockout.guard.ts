// types
import type { FailedAttemptsRepository } from "../repositories/failed-attempts.repository";
// common
import { TooManyRequestsError } from "@/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class PasswordLockoutGuard {
  constructor(private readonly failedAttemptsRepo: FailedAttemptsRepository) {}

  async assert(email: string): Promise<void> {
    const { isLocked, remainingSeconds } =
      await this.failedAttemptsRepo.checkLockout(email);

    if (!isLocked) return;

    const attemptCount = await this.failedAttemptsRepo.getCount(email);

    Logger.warn("Login blocked - account locked", {
      email,
      attemptCount,
      remainingSeconds
    });

    throw new TooManyRequestsError({
      key: "login:errors.accountLocked",
      params: {
        attempts: attemptCount,
        seconds: remainingSeconds
      },
      code: ERROR_CODES.LOGIN_ACCOUNT_LOCKED
    });
  }
}
