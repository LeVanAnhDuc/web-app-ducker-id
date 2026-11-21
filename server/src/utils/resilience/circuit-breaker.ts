// others
import { Logger } from "@/libs/logger";

enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN"
}

interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxAttempts?: number;
}

const DEFAULTS = {
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT_MS: 30000,
  HALF_OPEN_MAX_ATTEMPTS: 1
} as const;

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold =
      options.failureThreshold ?? DEFAULTS.FAILURE_THRESHOLD;
    this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULTS.RESET_TIMEOUT_MS;
    this.halfOpenMaxAttempts =
      options.halfOpenMaxAttempts ?? DEFAULTS.HALF_OPEN_MAX_ATTEMPTS;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    if (
      this.state === CircuitState.HALF_OPEN &&
      this.halfOpenAttempts >= this.halfOpenMaxAttempts
    ) {
      throw new CircuitOpenError(this.name);
    }

    try {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenAttempts++;
      }

      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  get isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.OPEN) {
      return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
    }
    return this.halfOpenAttempts < this.halfOpenMaxAttempts;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      Logger.info(`Circuit breaker "${this.name}" recovered`, {
        previousFailures: this.failureCount
      });
    }
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.transitionTo(CircuitState.CLOSED);
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      Logger.warn(`Circuit breaker "${this.name}" probe failed, reopening`, {
        failureCount: this.failureCount
      });
      this.halfOpenAttempts = 0;
      this.transitionTo(CircuitState.OPEN);
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      Logger.warn(`Circuit breaker "${this.name}" opened`, {
        failureCount: this.failureCount,
        resetTimeoutMs: this.resetTimeoutMs
      });
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      Logger.debug(
        `Circuit breaker "${this.name}": ${this.state} → ${newState}`
      );
      this.state = newState;
      if (newState === CircuitState.HALF_OPEN) {
        this.halfOpenAttempts = 0;
      }
    }
  }
}

/**
 * Throw khi circuit dang OPEN — dung de caller phan biet
 * "service that su loi" vs "circuit dang chan, khong nen retry".
 */
export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit breaker "${circuitName}" is open — request rejected`);
    this.name = "CircuitOpenError";
  }
}
