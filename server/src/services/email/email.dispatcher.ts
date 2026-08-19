// types
import type { QueueService } from "@/services/queue/queue.service";
import type { EmailJobData } from "@/types/services/queue";
import type {
  EmailType,
  Mailer,
  SendEmailOptions
} from "@/types/services/email";

export class EmailDispatcher {
  constructor(
    private readonly emailService: Mailer,
    private readonly emailQueue: QueueService<EmailJobData> | null
  ) {}

  send<T extends EmailType>(type: T, options: SendEmailOptions<T>): void {
    if (this.emailQueue) {
      const jobData: EmailJobData = {
        type,
        email: options.email,
        data: options.data as unknown as Record<string, unknown>,
        locale: options.locale
      };
      this.emailQueue.addJob(type, jobData);
    } else {
      this.emailService.send(type, options);
    }
  }
}
