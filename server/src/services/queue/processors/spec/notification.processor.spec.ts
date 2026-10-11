// types
import type { Job } from "bullmq";
import type { NotificationDeliveryService } from "@/services/notification/notification.service";
import type { NotificationJobData } from "@/types/services/notification";
// others
import { createNotificationProcessor } from "../notification.processor";

describe("createNotificationProcessor", () => {
  const job = {
    id: "1",
    name: "PASSWORD_CHANGED",
    data: {
      kind: "user",
      userId: "507f1f77bcf86cd799439011",
      type: "PASSWORD_CHANGED"
    }
  } as Job<NotificationJobData>;

  it("hands the job data to the delivery service", async () => {
    const deliver = jest.fn().mockResolvedValue(undefined);
    const processor = createNotificationProcessor({
      deliver
    } as unknown as NotificationDeliveryService);

    await processor(job);

    expect(deliver).toHaveBeenCalledWith(job.data);
  });

  it("rejects when delivery fails so BullMQ retries the job", async () => {
    const processor = createNotificationProcessor({
      deliver: jest.fn().mockRejectedValue(new Error("mongo down"))
    } as unknown as NotificationDeliveryService);

    await expect(processor(job)).rejects.toThrow("mongo down");
  });
});
