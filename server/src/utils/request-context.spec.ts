// modules
import { RequestContext } from "./request-context";

describe("RequestContext requestId", () => {
  it("stores and reads requestId within the async context", () => {
    const mw = RequestContext.middleware();
    let seen: string | undefined;
    mw({ requestId: "req-123" } as never, {} as never, () => {
      seen = RequestContext.getRequestId();
    });
    expect(seen).toBe("req-123");
  });

  it("returns undefined outside any request context", () => {
    expect(RequestContext.getRequestId()).toBeUndefined();
  });

  it("setRequestId updates the current store", () => {
    const mw = RequestContext.middleware();
    let seen: string | undefined;
    mw({} as never, {} as never, () => {
      RequestContext.setRequestId("manual-1");
      seen = RequestContext.getRequestId();
    });
    expect(seen).toBe("manual-1");
  });
});

describe("RequestContext client", () => {
  const run = (req: object): ReturnType<typeof RequestContext.getClient> => {
    let seen!: ReturnType<typeof RequestContext.getClient>;
    RequestContext.middleware()(req as never, {} as never, () => {
      seen = RequestContext.getClient();
    });
    return seen;
  };

  it("reads ip, user agent, client type and language from the request", () => {
    expect(
      run({
        ip: "8.8.8.8",
        language: "en",
        headers: { "user-agent": "ua/1", "x-client-type": "ios" }
      })
    ).toEqual({
      ip: "8.8.8.8",
      userAgent: "ua/1",
      clientType: "ios",
      language: "en"
    });
  });

  it("falls back to socket.remoteAddress when req.ip is empty", () => {
    expect(run({ socket: { remoteAddress: "10.0.0.5" } }).ip).toBe("10.0.0.5");
  });

  it("takes the first value of a repeated header", () => {
    expect(run({ headers: { "user-agent": ["a", "b"] } }).userAgent).toBe("a");
  });

  it("defaults to the app locale and blanks when nothing is known", () => {
    expect(run({})).toEqual({
      ip: "",
      userAgent: "",
      clientType: undefined,
      language: "vi"
    });
  });

  it("answers the same defaults outside any request", () => {
    expect(RequestContext.getClient()).toEqual({
      ip: "",
      userAgent: "",
      language: "vi"
    });
  });
});
