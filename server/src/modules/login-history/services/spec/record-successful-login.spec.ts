// types
import type { Request } from "express";
import type { LoginHistoryRepository } from "../../repository/login-history.repository";
import type { SignInTraits } from "@/modules/login-history/types";
// module under test
import { LoginHistoryService } from "../";
import { createNotificationDispatcherMock } from "@test/mocks/notification-dispatcher.mock";

jest.mock("geoip-lite", () => ({ lookup: jest.fn() }));
import geoip from "geoip-lite";

const AUTH_ID = "64b7f0c2f1a2b3c4d5e6f7b9";
const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const req = (ip: string) =>
  ({
    headers: { "user-agent": CHROME_WINDOWS },
    ip,
    socket: { remoteAddress: ip }
  }) as unknown as Request;

const traits = (over: Partial<SignInTraits> = {}): SignInTraits => ({
  hasHistory: true,
  devices: ["Chrome 120.0.0.0|Windows 10|DESKTOP"],
  countries: ["VN"],
  ...over
});

const setup = (history: SignInTraits) => {
  const repo = {
    create: jest.fn().mockResolvedValue({}),
    findSignInTraits: jest.fn().mockResolvedValue(history)
  } as unknown as jest.Mocked<LoginHistoryRepository>;
  const notificationDispatcher = createNotificationDispatcherMock();
  const service = new LoginHistoryService({
    loginHistoryRepo: repo,
    notificationDispatcher
  });
  return { repo, notificationDispatcher, service };
};

const signIn = async (service: LoginHistoryService, ip = "8.8.8.8") => {
  service.recordSuccessfulLogin({
    userId: AUTH_ID,
    usernameAttempted: "user@test.com",
    loginMethod: "password",
    req: req(ip)
  });
  await new Promise(setImmediate);
};

describe("LoginHistoryService.recordSuccessfulLogin — anomaly", () => {
  beforeEach(() => {
    (geoip.lookup as jest.Mock).mockReturnValue({
      country: "VN",
      city: "Hanoi"
    });
  });

  it("reads the history before writing the new row", async () => {
    const { repo, service } = setup(traits());
    await signIn(service);

    expect(repo.findSignInTraits).toHaveBeenCalledWith(
      AUTH_ID,
      expect.any(Date)
    );
    expect(repo.findSignInTraits.mock.invocationCallOrder[0]).toBeLessThan(
      repo.create.mock.invocationCallOrder[0]
    );
  });

  it("records a known device and country as normal, without a notification", async () => {
    const { repo, notificationDispatcher, service } = setup(traits());
    await signIn(service);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isAnomaly: false, anomalyReasons: [] })
    );
    expect(notificationDispatcher.notifyByAuthId).not.toHaveBeenCalled();
  });

  it("never flags the first sign-in of an account", async () => {
    const { repo, notificationDispatcher, service } = setup(
      traits({ hasHistory: false, devices: [], countries: [] })
    );
    await signIn(service);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isAnomaly: false })
    );
    expect(notificationDispatcher.notifyByAuthId).not.toHaveBeenCalled();
  });

  it("flags a new device and notifies the owner by auth id", async () => {
    const { repo, notificationDispatcher, service } = setup(
      traits({ devices: ["Firefox|Linux|DESKTOP"] })
    );
    await signIn(service);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isAnomaly: true,
        anomalyReasons: ["new_device"]
      })
    );
    expect(notificationDispatcher.notifyByAuthId).toHaveBeenCalledWith({
      authId: AUTH_ID,
      type: "LOGIN_ANOMALY",
      params: {
        reason: "device",
        browser: "Chrome",
        os: "Windows",
        country: "VN"
      },
      link: "/login-history"
    });
  });

  it("reports both reasons when device and country are new", async () => {
    const { notificationDispatcher, service } = setup(
      traits({ devices: [], countries: ["US"] })
    );
    await signIn(service);

    expect(notificationDispatcher.notifyByAuthId).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ reason: "both" })
      })
    );
  });

  it("ignores the country of a local IP", async () => {
    const { repo, notificationDispatcher, service } = setup(
      traits({ countries: ["US"] })
    );
    await signIn(service, "127.0.0.1");

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ country: "LOCAL", isAnomaly: false })
    );
    expect(notificationDispatcher.notifyByAuthId).not.toHaveBeenCalled();
  });

  it("swallows a repository failure so the login still succeeds", async () => {
    const { repo, notificationDispatcher, service } = setup(traits());
    repo.findSignInTraits.mockRejectedValue(new Error("mongo down"));

    await expect(signIn(service)).resolves.toBeUndefined();
    expect(repo.create).not.toHaveBeenCalled();
    expect(notificationDispatcher.notifyByAuthId).not.toHaveBeenCalled();
  });
});
