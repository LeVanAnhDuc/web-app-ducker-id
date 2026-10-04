// libs
import type { LoginHistoryRepository } from "./login-history.repository";
import type { LoginHistoryDocument } from "@/modules/login-history/types";
// module under test
import { LoginHistoryService } from "./login-history.service";
import { NotFoundError } from "@/common/exceptions";

const makeRepo = (
  overrides: Partial<LoginHistoryRepository> = {}
): LoginHistoryRepository => ({
  create: jest.fn(),
  findByUser: jest.fn(),
  findAll: jest.fn(),
  aggregateMyStats: jest.fn(),
  findById: jest.fn(),
  ...overrides
});

const fakeDoc = (): LoginHistoryDocument =>
  ({
    _id: { toString: () => "64b7f0c2f1a2b3c4d5e6f7a8" },
    userId: { toString: () => "64b7f0c2f1a2b3c4d5e6f7b9" },
    usernameAttempted: "user@test.com",
    method: "password",
    status: "success",
    failReason: undefined,
    ip: "1.2.3.4",
    country: "Vietnam",
    city: "Hanoi",
    deviceType: "DESKTOP",
    os: "Windows",
    browser: "Chrome",
    userAgent: "UA-string",
    clientType: "WEB",
    timezoneOffset: "+07:00",
    isAnomaly: false,
    anomalyReasons: [],
    createdAt: new Date("2026-06-09T07:00:00.000Z")
  }) as unknown as LoginHistoryDocument;

describe("LoginHistoryService.getLoginHistoryDetail", () => {
  it("returns the detail DTO when the record exists", async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(fakeDoc())
    });
    const service = new LoginHistoryService(repo);

    const result = await service.getLoginHistoryDetail(
      "64b7f0c2f1a2b3c4d5e6f7a8"
    );

    expect(repo.findById).toHaveBeenCalledWith("64b7f0c2f1a2b3c4d5e6f7a8");
    expect(result._id).toBe("64b7f0c2f1a2b3c4d5e6f7a8");
    expect(result.userId).toBe("64b7f0c2f1a2b3c4d5e6f7b9");
    expect(result.usernameAttempted).toBe("user@test.com");
    expect(result.failReason).toBeNull();
    expect(result.createdAt).toBe("2026-06-09T07:00:00.000Z");
  });

  it("throws NotFoundError when the record is missing", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new LoginHistoryService(repo);

    await expect(
      service.getLoginHistoryDetail("000000000000000000000000")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("LoginHistoryService app sign-in recording", () => {
  const req = {
    headers: { "user-agent": "Mozilla/5.0" },
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" }
  } as never;
  const app = {
    webAppId: "64b7f0c2f1a2b3c4d5e6f7c1",
    clientName: "Match CV",
    interactive: false
  };

  it("writes an OAuth SSO row for recordAppSignIn", () => {
    const repo = makeRepo({ create: jest.fn().mockResolvedValue(fakeDoc()) });
    const service = new LoginHistoryService(repo);

    service.recordAppSignIn({
      userId: "64b7f0c2f1a2b3c4d5e6f7b9",
      usernameAttempted: "user@test.com",
      app,
      req
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "sso",
        status: "success",
        source: "oauth",
        webAppId: app.webAppId,
        clientName: "Match CV",
        interactive: false
      })
    );
  });

  it("writes a failed not_entitled row for recordAppSignInDenied", () => {
    const repo = makeRepo({ create: jest.fn().mockResolvedValue(fakeDoc()) });
    const service = new LoginHistoryService(repo);

    service.recordAppSignInDenied({
      userId: "64b7f0c2f1a2b3c4d5e6f7b9",
      usernameAttempted: "user@test.com",
      app: { ...app, interactive: true },
      req
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "sso",
        status: "failed",
        failReason: "not_entitled",
        source: "oauth"
      })
    );
  });

  it("keeps IdP logins as source=idp with no app", () => {
    const repo = makeRepo({ create: jest.fn().mockResolvedValue(fakeDoc()) });
    const service = new LoginHistoryService(repo);

    service.recordSuccessfulLogin({
      userId: "64b7f0c2f1a2b3c4d5e6f7b9",
      usernameAttempted: "user@test.com",
      loginMethod: "password",
      req
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "idp",
        webAppId: null,
        clientName: null,
        interactive: true
      })
    );
  });
});
