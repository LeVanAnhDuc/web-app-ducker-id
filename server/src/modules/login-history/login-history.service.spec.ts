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
