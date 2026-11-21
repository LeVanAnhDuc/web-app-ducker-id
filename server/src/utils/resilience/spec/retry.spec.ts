// others
import { Logger } from "@/libs/logger";
import { withRetry } from "../retry";

// withRetry is fire-and-forget: it returns nothing to await, so the tests poll
// for the outcome. Delays are 1 ms to keep them fast.
const eventually = async (assertion: () => void, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
};

const failingTimes = (failures: number, error = new Error("redis down")) => {
  let calls = 0;
  return jest.fn(async () => {
    calls += 1;
    if (calls <= failures) throw error;
  });
};

describe("withRetry", () => {
  it("runs the operation once when it succeeds", async () => {
    const fn = failingTimes(0);

    withRetry(fn, { initialDelayMs: 1 });

    await eventually(() => expect(fn).toHaveBeenCalledTimes(1));
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it("retries a failing operation until it succeeds", async () => {
    const fn = failingTimes(2);

    withRetry(fn, { maxAttempts: 3, initialDelayMs: 1, operationName: "op" });

    await eventually(() => expect(fn).toHaveBeenCalledTimes(3));
    expect(Logger.warn).toHaveBeenCalledWith(
      "op failed, retrying...",
      expect.objectContaining({ attempt: 1, maxAttempts: 3 })
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it("gives up after maxAttempts and logs one error", async () => {
    const fn = failingTimes(Infinity);

    withRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 1,
      operationName: "op",
      context: { email: "a@b.co" }
    });

    await eventually(() => expect(Logger.error).toHaveBeenCalledTimes(1));
    expect(fn).toHaveBeenCalledTimes(3);
    expect(Logger.error).toHaveBeenCalledWith(
      "op failed after 3 attempts",
      expect.objectContaining({ email: "a@b.co" })
    );
  });

  it("stops at once on an error shouldRetry rejects", async () => {
    const fn = failingTimes(Infinity, new Error("fatal"));

    withRetry(fn, {
      initialDelayMs: 1,
      operationName: "op",
      shouldRetry: (error) => (error as Error).message !== "fatal"
    });

    await eventually(() =>
      expect(Logger.warn).toHaveBeenCalledWith(
        "op failed with non-retryable error",
        expect.anything()
      )
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
