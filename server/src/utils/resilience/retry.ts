// libs
import { ExponentialBackoff, handleAll, handleWhen, retry } from "cockatiel";
// others
import { Logger } from "@/libs/logger";

interface RetryOptions {
  /** Total runs, the first one included. */
  maxAttempts?: number;
  initialDelayMs?: number;
  operationName?: string;
  context?: Record<string, unknown>;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULTS = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 30_000,
  OPERATION_NAME: "operation"
} as const;

/**
 * Best-effort retry for a side effect the caller does not wait on (Redis
 * cleanup after the request already succeeded): it returns nothing, never
 * throws, and logs how it ended. Backoff is exponential with decorrelated
 * jitter, so instances retrying the same failure do not line up.
 */
export const withRetry = (
  fn: () => Promise<unknown>,
  options: RetryOptions = {}
): void => {
  const maxAttempts = options.maxAttempts ?? DEFAULTS.MAX_ATTEMPTS;
  const operationName = options.operationName ?? DEFAULTS.OPERATION_NAME;
  const context = options.context ?? {};
  const { shouldRetry } = options;

  const policy = retry(
    shouldRetry ? handleWhen((error) => shouldRetry(error)) : handleAll,
    {
      // cockatiel counts retries, not runs.
      maxAttempts: maxAttempts - 1,
      backoff: new ExponentialBackoff({
        initialDelay: options.initialDelayMs ?? DEFAULTS.INITIAL_DELAY_MS,
        maxDelay: DEFAULTS.MAX_DELAY_MS
      })
    }
  );

  policy.onRetry(({ delay, attempt }) => {
    Logger.warn(`${operationName} failed, retrying...`, {
      ...context,
      attempt,
      maxAttempts,
      nextRetryMs: Math.round(delay)
    });
  });

  policy
    .execute(() => fn())
    .catch((error: unknown) => {
      if (shouldRetry && !shouldRetry(error)) {
        Logger.warn(`${operationName} failed with non-retryable error`, {
          ...context,
          error
        });
        return;
      }
      Logger.error(`${operationName} failed after ${maxAttempts} attempts`, {
        ...context,
        error
      });
    });
};
