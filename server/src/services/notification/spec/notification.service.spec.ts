// types
import type { NotificationWriter } from "@/types/services/notification";
// services
import { NotificationDeliveryService } from "../notification.service";

const USER_A = "507f1f77bcf86cd799439011";

const makeWriter = (): jest.Mocked<NotificationWriter> => ({
  insertOne: jest.fn(),
  insertMany: jest.fn(),
  findUserIdByAuthId: jest.fn(),
  findRecipients: jest.fn()
});

describe("NotificationDeliveryService", () => {
  let writer: jest.Mocked<NotificationWriter>;
  let service: NotificationDeliveryService;

  beforeEach(() => {
    writer = makeWriter();
    writer.insertOne.mockResolvedValue(undefined);
    writer.insertMany.mockResolvedValue(undefined);
    service = new NotificationDeliveryService(writer, 2);
  });

  it("writes one notification with its category derived from the type", async () => {
    await service.deliver({
      kind: "user",
      userId: USER_A,
      type: "PASSWORD_CHANGED",
      params: { actor: "self" },
      link: "/profile"
    });

    expect(writer.insertOne).toHaveBeenCalledWith({
      userId: USER_A,
      type: "PASSWORD_CHANGED",
      category: "security",
      params: { actor: "self" },
      link: "/profile",
      dedupeKey: null
    });
  });

  it("defaults params to {} and link to null", async () => {
    await service.deliver({
      kind: "user",
      userId: USER_A,
      type: "ACCOUNT_LOCKED"
    });

    expect(writer.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ params: {}, link: null })
    );
  });

  it("resolves an auth-addressed job to the owning user", async () => {
    writer.findUserIdByAuthId.mockResolvedValue(USER_A);

    await service.deliver({
      kind: "auth",
      authId: "auth-1",
      type: "LOGIN_ANOMALY",
      params: { reason: "device" }
    });

    expect(writer.findUserIdByAuthId).toHaveBeenCalledWith("auth-1");
    expect(writer.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_A, category: "security" })
    );
  });

  it("drops an auth-addressed job whose user no longer exists", async () => {
    writer.findUserIdByAuthId.mockResolvedValue(null);

    await service.deliver({
      kind: "auth",
      authId: "gone",
      type: "LOGIN_ANOMALY"
    });

    expect(writer.insertOne).not.toHaveBeenCalled();
  });

  it("fans an audience job out page by page until the cursor runs out", async () => {
    writer.findRecipients
      .mockResolvedValueOnce({ userIds: ["u1", "u2"], lastAuthId: "a2" })
      .mockResolvedValueOnce({ userIds: ["u3"], lastAuthId: null });

    await service.deliver({
      kind: "audience",
      roles: ["user", "admin"],
      type: "APP_AVAILABLE",
      params: { appName: "Atlas" },
      link: "/apps?search=Atlas",
      dedupeKey: "app:42"
    });

    expect(writer.findRecipients).toHaveBeenNthCalledWith(
      1,
      ["user", "admin"],
      null,
      2
    );
    expect(writer.findRecipients).toHaveBeenNthCalledWith(
      2,
      ["user", "admin"],
      "a2",
      2
    );
    expect(writer.insertMany).toHaveBeenCalledTimes(2);
    expect(writer.insertMany.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        userId: "u1",
        category: "app",
        dedupeKey: "app:42"
      }),
      expect.objectContaining({ userId: "u2" })
    ]);
  });

  it("skips the write for a page that resolved no users", async () => {
    writer.findRecipients
      .mockResolvedValueOnce({ userIds: [], lastAuthId: "a2" })
      .mockResolvedValueOnce({ userIds: [], lastAuthId: null });

    await service.deliver({
      kind: "audience",
      roles: ["user"],
      type: "APP_AVAILABLE",
      dedupeKey: "app:1"
    });

    expect(writer.insertMany).not.toHaveBeenCalled();
  });

  it("propagates a write failure so the queue can retry the job", async () => {
    writer.insertOne.mockRejectedValue(new Error("mongo down"));

    await expect(
      service.deliver({ kind: "user", userId: USER_A, type: "ACCOUNT_LOCKED" })
    ).rejects.toThrow("mongo down");
  });
});
