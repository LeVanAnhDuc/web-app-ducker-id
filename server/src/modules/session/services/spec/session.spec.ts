// types
import type { Request } from "express";
import type { SessionRecord } from "../../types";
import type { SessionRepository } from "../../repository/session.repository";
// others
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_CLEAR_COOKIE_OPTIONS
} from "../../constants";
import { readSid } from "../../helpers";
import { inRequest } from "@test/helpers/request-context.helper";
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

const START = { authId: AUTH_ID, userId: USER_ID, roles: "user" };

describe("SessionService.start", () => {
  it("records the session with the caller's ip and user agent", async () => {
    const { repo, service } = setup();

    const result = await inRequest({ ip: "10.0.0.9", userAgent: "ua/2" }, () =>
      service.start(START)
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authId: AUTH_ID,
        userId: USER_ID,
        roles: "user",
        ip: "10.0.0.9",
        userAgent: "ua/2"
      })
    );
    expect(result.sid).toBe(SID);
  });

  it("stamps authTime in seconds, not milliseconds", async () => {
    const { repo, service } = setup();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    await service.start(START);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ authTime: 1_700_000_123 })
    );
    jest.restoreAllMocks();
  });

  it("falls back to empty strings outside a request", async () => {
    const { repo, service } = setup();

    await service.start(START);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "", userAgent: "" })
    );
  });
});

describe("readSid", () => {
  const withCookies = (cookies: Record<string, string> | undefined) =>
    ({ cookies }) as unknown as Request;

  it("reads the sid cookie", () => {
    expect(readSid(withCookies({ [SESSION_COOKIE]: SID }))).toBe(SID);
  });

  it("treats an empty sid as no session", () => {
    expect(readSid(withCookies({ [SESSION_COOKIE]: "" }))).toBeNull();
  });

  it("returns null when the request carries no cookies at all", () => {
    expect(readSid(withCookies(undefined))).toBeNull();
  });
});

describe("SessionService.resolve", () => {
  it("returns the stored record for a sid", async () => {
    const { repo, service } = setup();

    const result = await service.resolve(SID);

    expect(repo.findBySid).toHaveBeenCalledWith(SID);
    expect(result?.sid).toBe(SID);
  });

  it("does not hit the store when there is no sid", async () => {
    const { repo, service } = setup();

    const result = await service.resolve(null);

    expect(result).toBeNull();
    expect(repo.findBySid).not.toHaveBeenCalled();
  });

  it("returns null when the sid points at nothing", async () => {
    const { repo, service } = setup();
    repo.findBySid.mockResolvedValue(null);

    expect(await service.resolve(SID)).toBeNull();
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
  it("destroys the session", async () => {
    const { repo, service } = setup();

    await service.end(SID);

    expect(repo.destroy).toHaveBeenCalledWith(SID);
  });

  it("does nothing when there is no session to destroy", async () => {
    const { repo, service } = setup();

    await service.end(null);

    expect(repo.destroy).not.toHaveBeenCalled();
  });
});

describe("session cookie options", () => {
  it("sets the cookie for the session's lifetime", () => {
    expect(SESSION_COOKIE_OPTIONS).toMatchObject({
      httpOnly: true,
      path: "/"
    });
    expect(SESSION_COOKIE_OPTIONS.maxAge).toBeGreaterThan(0);
  });

  // BUG-OIDC-05: a maxAge on clearCookie overrides its own expiry.
  it("clears the cookie without a maxAge, so it expires now", () => {
    expect(SESSION_CLEAR_COOKIE_OPTIONS).not.toHaveProperty("maxAge");
    expect(SESSION_CLEAR_COOKIE_OPTIONS).toMatchObject({
      httpOnly: true,
      path: "/"
    });
  });
});
