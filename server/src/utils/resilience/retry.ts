/**
 * Retry utility with exponential backoff
 * Use for fire-and-forget operations that need resilience
 */

// others
import { Logger } from "@/libs/logger";

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  operationName?: string;
  context?: Record<string, unknown>;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "context" | "shouldRetry">> =
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    operationName: "operation"
  };

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = (
  fn: () => Promise<unknown>,
  options: RetryOptions = {}
): void => {
  const { maxAttempts, initialDelayMs, operationName } = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const context = options.context ?? {};
  const shouldRetry = options.shouldRetry;

  const execute = async (attempt: number): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      if (shouldRetry && !shouldRetry(error)) {
        Logger.warn(`${operationName} failed with non-retryable error`, {
          ...context,
          attempt,
          error
        });
        return;
      }

      if (attempt >= maxAttempts) {
        Logger.error(`${operationName} failed after ${maxAttempts} attempts`, {
          ...context,
          error
        });
        return;
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);

      Logger.warn(`${operationName} failed, retrying...`, {
        ...context,
        attempt,
        maxAttempts,
        nextRetryMs: delayMs
      });

      await delay(delayMs);
      await execute(attempt + 1);
    }
  };

  execute(1).catch((error) => {
    Logger.error(`${operationName} unexpected error`, { ...context, error });
  });
};
