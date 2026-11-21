// others
import { createCircuitBreaker, isCircuitOpenError } from "../circuit-breaker";

const fail = () => Promise.reject(new Error("smtp down"));
const succeed = () => Promise.resolve("sent");
const hang = () => new Promise<string>(() => undefined);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("createCircuitBreaker", () => {
  it("passes results through while the circuit is closed", async () => {
    const breaker = createCircuitBreaker({ name: "t", failureThreshold: 2 });

    await expect(breaker.execute(succeed)).resolves.toBe("sent");
  });

  it("opens after the threshold of consecutive failures and stops calling", async () => {
    const breaker = createCircuitBreaker({ name: "t", failureThreshold: 2 });
    await expect(breaker.execute(fail)).rejects.toThrow("smtp down");
    await expect(breaker.execute(fail)).rejects.toThrow("smtp down");

    const fn = jest.fn(succeed);
    const error = await breaker.execute(fn).catch((e: unknown) => e);

    expect(isCircuitOpenError(error)).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("a success in between resets the failure count", async () => {
    const breaker = createCircuitBreaker({ name: "t", failureThreshold: 2 });
    await breaker.execute(fail).catch(() => undefined);
    await breaker.execute(succeed);
    await breaker.execute(fail).catch(() => undefined);

    await expect(breaker.execute(succeed)).resolves.toBe("sent");
  });

  it("lets one probe through after resetTimeoutMs and closes on success", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      failureThreshold: 1,
      resetTimeoutMs: 30
    });
    await breaker.execute(fail).catch(() => undefined);

    await sleep(40);

    await expect(breaker.execute(succeed)).resolves.toBe("sent");
    await expect(breaker.execute(succeed)).resolves.toBe("sent");
  });

  it("times out a call that never settles and counts it as a failure", async () => {
    const breaker = createCircuitBreaker({
      name: "t",
      failureThreshold: 1,
      timeoutMs: 20
    });

    const first = await breaker.execute(hang).catch((e: unknown) => e);
    expect(first).toBeInstanceOf(Error);
    expect(isCircuitOpenError(first)).toBe(false);

    const second = await breaker.execute(succeed).catch((e: unknown) => e);
    expect(isCircuitOpenError(second)).toBe(true);
  });

  it("exposes how long the circuit stays open", () => {
    expect(
      createCircuitBreaker({ name: "t", resetTimeoutMs: 1234 }).resetTimeoutMs
    ).toBe(1234);
  });
});
