// libs
import { Queue, Worker } from "bullmq";
// types
import type { ConnectionOptions, Job, JobsOptions, Processor } from "bullmq";
// others
import { Logger } from "@/libs/logger";
import { redactSensitive } from "@/utils/redact";

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_DELAY_MS = 2000;
const DLQ_MAX_FAILED_JOBS = 100;
const COMPLETED_JOBS_KEEP_COUNT = 50;

interface QueueServiceConfig<TData> {
  name: string;
  connection: ConnectionOptions;
  processor: Processor<TData>;
  onFallback?: (data: TData) => void;
  concurrency?: number;
  defaultJobOptions?: JobsOptions;
}

export class QueueService<TData = unknown> {
  private readonly queue: Queue<TData, void, string, TData, void, string>;
  private readonly worker: Worker<TData, void, string>;
  private readonly fallback?: (data: TData) => void;
  readonly name: string;

  constructor(config: QueueServiceConfig<TData>) {
    this.name = config.name;
    this.fallback = config.onFallback;

    this.queue = new Queue<TData, void, string, TData, void, string>(
      config.name,
      {
        connection: config.connection,
        defaultJobOptions: {
          attempts: DEFAULT_ATTEMPTS,
          backoff: {
            type: "exponential",
            delay: DEFAULT_BACKOFF_DELAY_MS
          },
          removeOnComplete: { count: COMPLETED_JOBS_KEEP_COUNT },
          removeOnFail: { count: DLQ_MAX_FAILED_JOBS },
          ...config.defaultJobOptions
        }
      }
    );

    this.worker = new Worker<TData, void, string>(
      config.name,
      config.processor,
      {
        connection: config.connection,
        concurrency: config.concurrency ?? DEFAULT_CONCURRENCY
      }
    );

    this.setupEventHandlers();
  }

  getQueue(): Queue {
    return this.queue;
  }

  addJob(name: string, data: TData, options?: JobsOptions): void {
    this.queue.add(name, data, options).catch((error: unknown) => {
      Logger.error(`Failed to add job to queue "${this.name}"`, {
        jobName: name,
        error: error instanceof Error ? error.message : error
      });

      if (this.fallback) {
        Logger.warn(`Using fallback for job "${name}" in queue "${this.name}"`);
        this.fallback(data);
      }
    });
  }

  async close(): Promise<void> {
    const results = await Promise.allSettled([
      this.worker.close(),
      this.queue.close()
    ]);

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      Logger.error(`Queue "${this.name}" close had failures`, { failures });
    }

    Logger.info(`Queue "${this.name}" closed`);
  }

  private setupEventHandlers(): void {
    this.worker.on("completed", (job: Job<TData>) => {
      Logger.debug(`Job completed: ${job.name}`, {
        queue: this.name,
        jobId: job.id
      });
    });

    this.worker.on("failed", (job: Job<TData> | undefined, error: Error) => {
      if (!job) return;

      const maxAttempts = job.opts.attempts ?? DEFAULT_ATTEMPTS;

      if (job.attemptsMade >= maxAttempts) {
        Logger.error(`[DLQ] Job permanently failed: ${job.name}`, {
          queue: this.name,
          jobId: job.id,
          data: redactSensitive(job.data),
          attempts: job.attemptsMade,
          error: error.message
        });
      } else {
        Logger.warn(`Job failed, retrying: ${job.name}`, {
          queue: this.name,
          jobId: job.id,
          attempt: job.attemptsMade,
          maxAttempts,
          nextRetryIn: `${DEFAULT_BACKOFF_DELAY_MS * Math.pow(2, job.attemptsMade - 1)}ms`,
          error: error.message
        });
      }
    });

    this.worker.on("error", (error: Error) => {
      Logger.error(`Worker error in queue "${this.name}"`, {
        error: error.message
      });
    });

    Logger.info(`Queue "${this.name}" initialized with worker`);
  }
}
