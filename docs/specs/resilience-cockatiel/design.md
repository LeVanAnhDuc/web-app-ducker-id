# Resilience on cockatiel — retry, circuit breaker, timeout

Date: 2026-11-21 · Branch: `refactor/resilience-cockatiel`

## Why

`utils/resilience/` held 211 hand-written lines — `withRetry` (71) and a `CircuitBreaker` state
machine (140) — with no tests of their own; every spec that touched them mocked them out. Review
found three problems:

1. **The breaker had no timeout.** An SMTP server that hangs never produces an error, so the
   circuit never opened — the case a breaker exists for.
2. **Open circuit + BullMQ dropped emails.** The email worker calls the breaker; while it is open
   every attempt fails at once with `CircuitOpenError`, and BullMQ retries after 2 s and 4 s — all
   three attempts land inside the 30 s open window and the job goes to the DLQ. A login OTP or
   magic link was lost whenever SMTP had a five-failure streak.
3. Backoff without jitter (minor with one instance).

## Library choice

| | cockatiel | opossum | p-retry | async-retry |
| --- | --- | --- | --- | --- |
| Covers | retry + breaker + timeout + bulkhead + fallback, composable with `wrap` | breaker only (timeout, rolling stats, metrics) | retry only | retry only |
| Latest | 4.0.0 (2026-05) · 3.2.1 (2024-07) | 10.0.0 (2026-06) | 9.0.0 (2026-11) | 1.3.3 (2021) |
| Module | 4.x ESM-only · 3.x CJS + ESM | CJS | ESM-only | CJS |

The server compiles to CommonJS (`"module": "node16"`) and tests with ts-jest; an ESM-only package
fails to type-check from a CJS file (TS1479) and Jest cannot `require` it without experimental
flags. **cockatiel 3.2.1** is one dependency-free, typed library covering both needs and loads as
CJS. Moving to 4.x waits on moving the server to ESM.

## What changes

| Place | After |
| --- | --- |
| `utils/resilience/retry.ts` | `withRetry` keeps its signature and fire-and-forget contract (returns `void`, never throws, logs the outcome) and runs on `retry(handleAll \| handleWhen(shouldRetry))` with `ExponentialBackoff` (decorrelated jitter, max 30 s). `maxAttempts` still counts runs; cockatiel counts retries, so it gets `maxAttempts - 1`. |
| `utils/resilience/circuit-breaker.ts` | `createCircuitBreaker({ name, failureThreshold, resetTimeoutMs, timeoutMs })` = `wrap(circuitBreaker(ConsecutiveBreaker), timeout(Aggressive))`, logging `onBreak` / `onHalfOpen` / `onReset`. `isCircuitOpenError` replaces `instanceof CircuitOpenError`. |
| `services/email/email.service.ts` | breaker with a 15 s timeout; exposes `circuitResetTimeoutMs`. |
| `services/queue/processors/email.processor.ts` | on an open circuit: `job.moveToDelayed(now + resetTimeoutMs, token)` then `throw new DelayedError()` — BullMQ re-queues the job without counting an attempt. Other errors still reject, so BullMQ's normal retry applies. |
| `services/queue/queue.module.ts` | the queue-add fallback no longer retries while the circuit is open. |

## Tests

- `utils/resilience/spec/retry.spec.ts` (new) — success, retry until success, give up after
  `maxAttempts` with one error log, stop on a non-retryable error. Written against the old
  implementation first and green on both — the safety net for the swap.
- `utils/resilience/spec/circuit-breaker.spec.ts` (new) — closed passes through; opens after N
  consecutive failures and stops calling; a success resets the count; one probe after
  `resetTimeoutMs` closes it; **a call that never settles times out and counts as a failure**.
- `services/queue/processors/spec/email.processor.spec.ts` (new) — sends; an SMTP error rejects;
  **an open circuit delays the job by `resetTimeoutMs` and throws `DelayedError`**.
- Jest: 109 suites / 826 tests. No Playwright run: nothing reaches the HTTP surface, and the e2e
  suite does not exercise SMTP failure.
