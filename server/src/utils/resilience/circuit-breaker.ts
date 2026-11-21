// libs
import {
  ConsecutiveBreaker,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  isBrokenCircuitError,
  timeout,
  wrap
} from "cockatiel";
// others
import { Logger } from "@/libs/logger";

interface CircuitBreakerOptions {
  name: string;
  /** Consecutive failures that open the circuit. */
  failureThreshold?: number;
  /** How long the circuit stays open before one probe is let through. */
  resetTimeoutMs?: number;
  /** A call that has not settled by then is abandoned and counts as a failure. */
  timeoutMs?: number;
}

export interface CircuitBreaker {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  readonly resetTimeoutMs: number;
}

const DEFAULTS = {
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT_MS: 30_000,
  TIMEOUT_MS: 10_000
} as const;

/**
 * Timeout inside a consecutive-failure breaker: a dependency that hangs trips
 * the circuit the same way one that errors does. State lives in this process.
 */
export const createCircuitBreaker = (
  options: CircuitBreakerOptions
): CircuitBreaker => {
  const failureThreshold =
    options.failureThreshold ?? DEFAULTS.FAILURE_THRESHOLD;
  const resetTimeoutMs = options.resetTimeoutMs ?? DEFAULTS.RESET_TIMEOUT_MS;
  const { name } = options;

  const breaker = circuitBreaker(handleAll, {
    halfOpenAfter: resetTimeoutMs,
    breaker: new ConsecutiveBreaker(failureThreshold)
  });

  breaker.onBreak(() => {
    Logger.warn(`Circuit breaker "${name}" opened`, {
      failureThreshold,
      resetTimeoutMs
    });
  });
  breaker.onHalfOpen(() => {
    Logger.debug(`Circuit breaker "${name}" half-open, probing`);
  });
  breaker.onReset(() => {
    Logger.info(`Circuit breaker "${name}" recovered`);
  });

  const policy = wrap(
    breaker,
    timeout(
      options.timeoutMs ?? DEFAULTS.TIMEOUT_MS,
      TimeoutStrategy.Aggressive
    )
  );

  return {
    resetTimeoutMs,
    execute: (fn) => policy.execute(() => fn())
  };
};

/** True when a call was refused because the circuit is open. */
export const isCircuitOpenError = isBrokenCircuitError;
