// libs
import { DelayedError } from "bullmq";
import { BrokenCircuitError } from "cockatiel";
// types
import type { Job } from "bullmq";
import type { SendEmailService } from "@/services/email/email.service";
import type { EmailJobData } from "@/types/services/queue";
// others
import { createEmailProcessor } from "../email.processor";

const RESET_MS = 30_000;

const makeJob = () =>
  ({
    id: "1",
    name: "LOGIN_OTP",
    data: { type: "LOGIN_OTP", email: "a@b.co", data: {}, locale: "en" },
    moveToDelayed: jest.fn().mockResolvedValue(undefined)
  }) as unknown as Job<EmailJobData> & { moveToDelayed: jest.Mock };

const makeService = (executeSend: jest.Mock) =>
  ({
    executeSend,
    circuitResetTimeoutMs: RESET_MS
  }) as unknown as SendEmailService;

describe("createEmailProcessor", () => {
  it("sends the job's email", async () => {
    const executeSend = jest.fn().mockResolvedValue(undefined);
    const job = makeJob();

    await createEmailProcessor(makeService(executeSend))(job, "token");

    expect(executeSend).toHaveBeenCalledWith("LOGIN_OTP", {
      email: "a@b.co",
      data: {},
      locale: "en"
    });
  });

  it("rejects on an SMTP failure so BullMQ retries the job", async () => {
    const job = makeJob();
    const processor = createEmailProcessor(
      makeService(jest.fn().mockRejectedValue(new Error("smtp down")))
    );

    await expect(processor(job, "token")).rejects.toThrow("smtp down");
    expect(job.moveToDelayed).not.toHaveBeenCalled();
  });

  it("delays the job until the circuit can close, without spending an attempt", async () => {
    // While the circuit is open every attempt fails at once; BullMQ's own
    // backoff (2 s, 4 s) would burn all attempts inside the open window and
    // drop the email. The job is parked until the breaker tries again.
    const job = makeJob();
    const processor = createEmailProcessor(
      makeService(jest.fn().mockRejectedValue(new BrokenCircuitError()))
    );
    const before = Date.now();

    await expect(processor(job, "token")).rejects.toBeInstanceOf(DelayedError);

    const [until, token] = job.moveToDelayed.mock.calls[0];
    expect(token).toBe("token");
    expect(until).toBeGreaterThanOrEqual(before + RESET_MS);
  });
});
