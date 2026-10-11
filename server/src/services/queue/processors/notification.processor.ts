// types
import type { Job } from "bullmq";
import type { NotificationDeliveryService } from "@/services/notification/notification.service";
import type { NotificationJobData } from "@/types/services/notification";
// others
import { Logger } from "@/libs/logger";

export const createNotificationProcessor =
  (delivery: NotificationDeliveryService) =>
  async (job: Job<NotificationJobData>): Promise<void> => {
    Logger.debug(`Processing notification job: ${job.name}`, {
      jobId: job.id,
      kind: job.data.kind,
      type: job.data.type
    });

    await delivery.deliver(job.data);
  };
