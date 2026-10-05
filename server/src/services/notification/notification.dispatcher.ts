// types
import type { QueueService } from "@/services/queue/queue.service";
import type {
  BroadcastInput,
  NotificationJobData,
  NotifyAuthInput,
  NotifyUserInput
} from "@/types/services/notification";
import type { NotificationDeliveryService } from "./notification.service";
// others
import { Logger } from "@/libs/logger";
import { withRetry } from "@/utils/resilience/retry";

/**
 * Entry point for business modules. Fire-and-forget: a notification that
 * cannot be written must never fail a password change or a sign-in, so
 * nothing here throws.
 */
export class NotificationDispatcher {
  constructor(
    private readonly delivery: NotificationDeliveryService,
    private readonly queue: QueueService<NotificationJobData> | null
  ) {}

  notify(input: NotifyUserInput): void {
    this.dispatch({ kind: "user", ...input });
  }

  notifyByAuthId(input: NotifyAuthInput): void {
    this.dispatch({ kind: "auth", ...input });
  }

  broadcast(input: BroadcastInput): void {
    this.dispatch({ kind: "audience", ...input });
  }

  private dispatch(job: NotificationJobData): void {
    try {
      if (this.queue) {
        this.queue.addJob(job.type, job);
        return;
      }

      withRetry(() => this.delivery.deliver(job), {
        operationName: `notification-direct:${job.type}`,
        context: { kind: job.kind, type: job.type }
      });
    } catch (error) {
      Logger.error("Failed to dispatch notification", {
        kind: job.kind,
        type: job.type,
        error: error instanceof Error ? error.message : error
      });
    }
  }
}
