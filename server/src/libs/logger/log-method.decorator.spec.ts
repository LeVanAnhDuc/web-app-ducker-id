// others
import { Logger } from "./index";
import { LogMethod } from "./log-method.decorator";
import { RequestContext } from "@/utils/request-context";

describe("LogMethod", () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(Logger, "info").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger, "error").mockImplementation(() => undefined);
    jest.spyOn(RequestContext, "getRequestId").mockReturnValue("req-xyz");
    jest.spyOn(RequestContext, "getUserId").mockReturnValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  class Sample {
    @LogMethod({ name: "DoWork" })
    async work(): Promise<string> {
      return "ok";
    }

    @LogMethod({ name: "Boom" })
    async fails(): Promise<void> {
      throw new Error("kaboom");
    }

    @LogMethod()
    async plain(): Promise<number> {
      return 1;
    }
  }

  it("logs initiated + completed with requestId + durationMs; passes result through", async () => {
    const out = await new Sample().work();
    expect(out).toBe("ok");
    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {
      requestId: "req-xyz"
    });
    const [msg, meta] = infoSpy.mock.calls[1];
    expect(msg).toBe("DoWork completed");
    expect(meta).toMatchObject({ requestId: "req-xyz" });
    expect(typeof meta.durationMs).toBe("number");
  });

  it("includes userId when authenticated (present in RequestContext)", async () => {
    jest.spyOn(RequestContext, "getUserId").mockReturnValue("user-1");
    await new Sample().work();
    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {
      requestId: "req-xyz",
      userId: "user-1"
    });
  });

  it("omits correlation keys that are absent from context", async () => {
    jest.spyOn(RequestContext, "getRequestId").mockReturnValue(undefined);
    jest.spyOn(RequestContext, "getUserId").mockReturnValue(undefined);
    await new Sample().work();
    expect(infoSpy).toHaveBeenNthCalledWith(1, "DoWork initiated", {});
  });

  it("does NOT read method arguments (no business fields logged)", async () => {
    class WithSecret {
      @LogMethod({ name: "Sec" })
      async run(_body: { email: string; password: string }): Promise<void> {}
    }
    await new WithSecret().run({ email: "a@b.com", password: "secret" });
    const dump = JSON.stringify(infoSpy.mock.calls);
    expect(dump).not.toContain("secret");
    expect(dump).not.toContain("a@b.com");
  });

  it("logs failed + rethrows original error, does not log completed", async () => {
    await expect(new Sample().fails()).rejects.toThrow("kaboom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [msg, err, meta] = errorSpy.mock.calls[0];
    expect(msg).toBe("Boom failed");
    expect(err).toBeInstanceOf(Error);
    expect(typeof meta.durationMs).toBe("number");
    expect(infoSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("completed"),
      expect.anything()
    );
  });

  it("never breaks the business flow if logging itself throws", async () => {
    infoSpy.mockImplementation(() => {
      throw new Error("logger down");
    });
    const out = await new Sample().work();
    expect(out).toBe("ok");
  });

  it("falls back to ClassName.method label when name omitted", async () => {
    await new Sample().plain();
    expect(infoSpy.mock.calls[0][0]).toBe("Sample.plain initiated");
  });
});
