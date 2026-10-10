// types
import type { Response } from "express";
import type { SessionRecord } from "../../types";
import type { SessionRepository } from "../../repository/session.repository";
// others
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../../constants";
import { makeMockRequest } from "@test/helpers/request.helper";
import { SessionService } from "../";

const SID = "sid-abc";
const AUTH_ID = "507f1f77bcf86cd799439011";
const USER_ID = "507f1f77bcf86cd799439012";

const record = (over: Partial<SessionRecord> = {}): SessionRecord =>
  ({
    sid: SID,
    authId: AUTH_ID,
    userId: USER_ID,
    roles: "user",
    authTime: 1_700_000_000,
    ip: "127.0.0.1",
    userAgent: "jest-test-agent/1.0",
    clients: [],
    ...over
  }) as SessionRecord;

const setup = () => {
  const repo = {
    create: jest.fn().mockResolvedValue(record()),
    findBySid: jest.fn().mockResolvedValue(record()),
    addClient: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined)
  } as unknown as jest.Mocked<SessionRepository>;

  return { repo, service: new SessionService(repo) };
};

const makeRes = () =>
  ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as jest.Mocked<
    Pick<Response, "cookie" | "clearCookie">
  > &
    Response;

const reqWithSid = (sid?: string) =>
  makeMockRequest({ ...(sid ? { headers: {} } : {}) }) as ReturnType<
    typeof makeMockRequest
  > & { cookies?: Record<string, string> };

const withCookies = (cookies: Record<string, string> | undefined) => {
  const req = reqWithSid();
  (req as { cookies?: Record<string, string> }).cookies = cookies;
  return req;
};

describe("SessionService.start", () => {
  it("records the session and sets the sid cookie", async () => {
    const { repo, service } = setup();
    const res = makeRes();
    const req = makeMockRequest({ ip: "10.0.0.9", userAgent: "ua/2" });

    const result = await service.start({
      authId: AUTH_ID,
      userId: USER_ID,
      roles: "user",
      req,
      res
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authId: AUTH_ID,
        userId: USER_ID,
        roles: "user",
        ip: "10.0.0.9",
        userAgent: "ua/2"
      })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      SID,
      SESSION_COOKIE_OPTIONS
    );
    expect(result.sid).toBe(SID);
  });

  it("stamps authTime in seconds, not milliseconds", async () => {
    const { repo, service } = setup();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    await service.start({
      authId: AUTH_ID,
      userId: USER_ID,
      roles: "user",
      req: makeMockRequest(),
      res: makeRes()
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ authTime: 1_700_000_123 })
    );
    jest.restoreAllMocks();
  });

  it("falls back to empty strings when ip and user-agent are absent", async () => {
    const { repo, service } = setup();
    const req = makeMockRequest();
    (req as { ip?: string }).ip = undefined;
    (req as unknown as { get: () => undefined }).get = () => undefined;

    await service.start({
      authId: AUTH_ID,
      userId: USER_ID,
      roles: "user",
      req,
      res: makeRes()
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "", userAgent: "" })
    );
  });
});

describe("SessionService.readSid", () => {
  it("reads the sid cookie", () => {
    const { service } = setup();
    expect(service.readSid(withCookies({ [SESSION_COOKIE]: SID }))).toBe(SID);
  });

  it("treats an empty cookie as no session", () => {
    const { service } = setup();
    expect(service.readSid(withCookies({ [SESSION_COOKIE]: "" }))).toBeNull();
  });

  it("returns null when the request carries no cookies at all", () => {
    const { service } = setup();
    expect(service.readSid(withCookies(undefined))).toBeNull();
  });
});

describe("SessionService.resolve", () => {
  it("returns the stored record for a request carrying a sid", async () => {
    const { repo, service } = setup();

    const result = await service.resolve(
      withCookies({ [SESSION_COOKIE]: SID })
    );

    expect(repo.findBySid).toHaveBeenCalledWith(SID);
    expect(result?.sid).toBe(SID);
  });

  it("does not hit the store when there is no sid", async () => {
    const { repo, service } = setup();

    const result = await service.resolve(withCookies(undefined));

    expect(result).toBeNull();
    expect(repo.findBySid).not.toHaveBeenCalled();
  });

  it("returns null when the sid points at nothing", async () => {
    const { repo, service } = setup();
    repo.findBySid.mockResolvedValue(null);

    const result = await service.resolve(
      withCookies({ [SESSION_COOKIE]: SID })
    );

    expect(result).toBeNull();
  });
});

describe("SessionService.registerClient", () => {
  it("attaches the client to the session", async () => {
    const { repo, service } = setup();

    await service.registerClient(SID, "client-1");

    expect(repo.addClient).toHaveBeenCalledWith(SID, "client-1");
  });
});

describe("SessionService.end", () => {
  it("destroys the session and clears the cookie", async () => {
    const { repo, service } = setup();
    const res = makeRes();

    await service.end(withCookies({ [SESSION_COOKIE]: SID }), res);

    expect(repo.destroy).toHaveBeenCalledWith(SID);
    expect(res.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      SESSION_COOKIE_OPTIONS
    );
  });

  it("still clears the cookie when there was no session to destroy", async () => {
    const { repo, service } = setup();
    const res = makeRes();

    await service.end(withCookies(undefined), res);

    expect(repo.destroy).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      SESSION_COOKIE_OPTIONS
    );
  });
});
