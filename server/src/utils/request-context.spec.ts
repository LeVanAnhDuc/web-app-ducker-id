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
