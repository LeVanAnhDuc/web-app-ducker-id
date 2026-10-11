// types
import type { QueueService } from "@/services/queue/queue.service";
import type { NotificationJobData } from "@/types/services/notification";
import type { NotificationDeliveryService } from "../notification.service";
// services
import { NotificationDispatcher } from "../notification.dispatcher";
// others
import { withRetry } from "@/utils/resilience/retry";

jest.mock("@/utils/resilience/retry", () => ({ withRetry: jest.fn() }));

const USER_A = "507f1f77bcf86cd799439011";

describe("NotificationDispatcher", () => {
  let delivery: { deliver: jest.Mock };
  let queue: { addJob: jest.Mock };

  beforeEach(() => {
    delivery = { deliver: jest.fn().mockResolvedValue(undefined) };
    queue = { addJob: jest.fn() };
  });

  const build = (withQueue: boolean) =>
    new NotificationDispatcher(
      delivery as unknown as NotificationDeliveryService,
      withQueue ? (queue as unknown as QueueService<NotificationJobData>) : null
    );

  it("queues a user notification under the type as job name", () => {
    build(true).notify({
      userId: USER_A,
      type: "PASSWORD_CHANGED",
      params: { actor: "admin" },
      link: "/profile"
    });

    expect(queue.addJob).toHaveBeenCalledWith("PASSWORD_CHANGED", {
      kind: "user",
      userId: USER_A,
      type: "PASSWORD_CHANGED",
      params: { actor: "admin" },
      link: "/profile"
    });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("queues a broadcast as an audience job", () => {
    build(true).broadcast({
      roles: ["user", "admin"],
      type: "APP_AVAILABLE",
      dedupeKey: "app:1"
    });

    expect(queue.addJob).toHaveBeenCalledWith(
      "APP_AVAILABLE",
      expect.objectContaining({ kind: "audience", dedupeKey: "app:1" })
    );
  });

  it("delivers directly with retry when the queue is disabled", () => {
    build(false).notify({ userId: USER_A, type: "ACCOUNT_LOCKED" });

    expect(withRetry).toHaveBeenCalledTimes(1);
    const [fn] = (withRetry as jest.Mock).mock.calls[0];
    void fn();
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "user", type: "ACCOUNT_LOCKED" })
    );
  });

  it("never throws into the business flow", () => {
    queue.addJob.mockImplementation(() => {
      throw new Error("redis gone");
    });

    expect(() =>
      build(true).notify({ userId: USER_A, type: "ACCOUNT_LOCKED" })
    ).not.toThrow();
  });
});
