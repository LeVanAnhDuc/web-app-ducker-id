// libs
import { DelayedError } from "bullmq";
// types
import type { Job } from "bullmq";
import type { SendEmailService } from "@/services/email/email.service";
import type { EmailJobData } from "@/types/services/queue";
// others
import { Logger } from "@/libs/logger";
import { isCircuitOpenError } from "@/utils/resilience/circuit-breaker";

export const createEmailProcessor =
  (emailService: SendEmailService) =>
  async (job: Job<EmailJobData>, token?: string): Promise<void> => {
    const { type, email, data, locale } = job.data;

    Logger.debug(`Processing email job: ${job.name}`, {
      jobId: job.id,
      type,
      email
    });

    try {
      await emailService.executeSend(type, { email, data, locale });
    } catch (error) {
      if (!isCircuitOpenError(error)) throw error;

      // While the circuit is open every attempt fails at once, and BullMQ's
      // backoff (2 s, 4 s) would spend all attempts inside the open window and
      // drop the email. Park the job until the breaker probes again instead;
      // DelayedError tells BullMQ this is not a failed attempt.
      const retryAt = Date.now() + emailService.circuitResetTimeoutMs;
      Logger.warn(`Email circuit open, delaying job: ${job.name}`, {
        jobId: job.id,
        retryAt: new Date(retryAt).toISOString()
      });
      await job.moveToDelayed(retryAt, token);
      throw new DelayedError();
    }
  };
