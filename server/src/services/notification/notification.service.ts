// types
import type {
  CreateNotificationData,
  NotificationParams,
  NotificationType
} from "@/modules/notification/types";
import type {
  NotificationJobData,
  NotificationWriter
} from "@/types/services/notification";
// modules
import {
  NOTIFICATION_CATEGORY_BY_TYPE,
  NOTIFICATION_CONFIG
} from "@/modules/notification/constants";
// others
import { Logger } from "@/libs/logger";

const toCreateData = (
  userId: string,
  type: NotificationType,
  params: NotificationParams | undefined,
  link: string | null | undefined,
  dedupeKey: string | null
): CreateNotificationData => ({
  userId,
  type,
  category: NOTIFICATION_CATEGORY_BY_TYPE[type],
  params: params ?? {},
  link: link ?? null,
  dedupeKey
});

/**
 * Executes a notification job — the queue worker's processor and the
 * dispatcher's no-queue fallback both land here. Throws on a failed write so
 * BullMQ can retry; the dispatcher is what keeps business flows safe.
 */
export class NotificationDeliveryService {
  constructor(
    private readonly writer: NotificationWriter,
    private readonly batchSize: number = NOTIFICATION_CONFIG.BROADCAST_BATCH_SIZE
  ) {}

  async deliver(job: NotificationJobData): Promise<void> {
    if (job.kind === "user") {
      await this.writer.insertOne(
        toCreateData(job.userId, job.type, job.params, job.link, null)
      );
      return;
    }

    if (job.kind === "auth") {
      const userId = await this.writer.findUserIdByAuthId(job.authId);
      if (!userId) {
        Logger.warn("Notification skipped: no user for authentication", {
          authId: job.authId,
          type: job.type
        });
        return;
      }
      await this.writer.insertOne(
        toCreateData(userId, job.type, job.params, job.link, null)
      );
      return;
    }

    let cursor: string | null = null;
    let delivered = 0;

    do {
      const page = await this.writer.findRecipients(
        job.roles,
        cursor,
        this.batchSize
      );

      if (page.userIds.length > 0) {
        await this.writer.insertMany(
          page.userIds.map((userId) =>
            toCreateData(userId, job.type, job.params, job.link, job.dedupeKey)
          )
        );
        delivered += page.userIds.length;
      }

      cursor = page.lastAuthId;
    } while (cursor !== null);

    Logger.info("Notification broadcast delivered", {
      type: job.type,
      dedupeKey: job.dedupeKey,
      recipients: delivered
    });
  }
}
