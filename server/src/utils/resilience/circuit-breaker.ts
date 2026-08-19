// others
import { Logger } from "@/libs/logger";

/**
 * State machine 3 trang thai:
 *
 *   CLOSED ──fail N lan──> OPEN ──cho M giay──> HALF_OPEN
 *                            ^                      |
 *                            | fail                 | success
 *                            +----------            +---------> CLOSED
 *
 * - CLOSED:    Binh thuong — moi request deu di qua service.
 * - OPEN:      "Ngat mach" — reject ngay lap tuc, khong goi service.
 * - HALF_OPEN: Thu do — cho 1 request di qua de kiem tra service da hoi phuc chua.
 */
enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN"
}

interface CircuitBreakerOptions {
  /** Ten circuit, dung cho log (vd: "email-smtp") */
  name: string;
  /** Fail bao nhieu lan lien tiep thi chuyen sang OPEN (default: 5) */
  failureThreshold?: number;
  /** Thoi gian cho (ms) o trang thai OPEN truoc khi chuyen sang HALF_OPEN (default: 30000) */
  resetTimeoutMs?: number;
  /** So request thu trong HALF_OPEN truoc khi reject (default: 1) */
  halfOpenMaxAttempts?: number;
}

const DEFAULTS = {
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT_MS: 30000,
  HALF_OPEN_MAX_ATTEMPTS: 1
} as const;

/**
 * Circuit Breaker pattern — bao ve he thong khoi viec lien tuc goi mot service dang loi.
 *
 * Khi service loi nhieu lan lien tiep, circuit "ngat mach" (OPEN) de:
 * - Fail-fast: tra loi ngay thay vi cho timeout.
 * - Giam tai cho service dang loi, cho no thoi gian hoi phuc.
 * - Tu dong hoi phuc khi service hoat dong lai (qua trang thai HALF_OPEN).
 *
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({ name: "email-smtp", failureThreshold: 5, resetTimeoutMs: 30000 });
 * const result = await breaker.execute(() => sendEmail(to, subject, body));
 * ```
 */
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

  /**
   * Boc mot async operation trong circuit breaker.
   * - CLOSED: goi fn() binh thuong.
   * - OPEN: reject ngay (CircuitOpenError) neu chua het thoi gian cho.
   * - HALF_OPEN: cho thu 1 request — thanh cong thi dong mach, that bai thi mo lai.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN: kiem tra da het thoi gian cho chua
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    // HALF_OPEN: da het quota thu → reject
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

  /** Kiem tra nhanh circuit co san sang nhan request khong (khong thay doi state) */
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

  /** Thanh cong → reset moi thu ve CLOSED */
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

  /**
   * That bai → xu ly theo trang thai hien tai:
   * - HALF_OPEN: request thu cung fail → quay lai OPEN ngay.
   * - CLOSED: tang failureCount, neu >= threshold → chuyen OPEN.
   */
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
