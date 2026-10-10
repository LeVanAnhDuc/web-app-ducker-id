export interface FailedAttemptsRepository {
  readonly MAX_REQUESTS_PER_HOUR?: number;
  getCount(email: string): Promise<number>;
  trackAttempt(
    email: string
  ): Promise<{ attemptCount: number; lockoutSeconds: number }>;
  resetAll(email: string): Promise<void>;
  checkLockout(
    email: string
  ): Promise<{ isLocked: boolean; remainingSeconds: number }>;
}
