import { createClient } from "redis";
import { REDIS_URL } from "@/config/datastores";

// The emails the server queued — EmailDispatcher pushes every mail onto the
// BullMQ `email` queue (`bull:email:<id>`, job data kept for the last 50
// completed jobs). Reading a job is reading the email the user would receive.
// Use it only for a secret that has no other seam: an admin-reset temp
// password is hashed into Mongo, and the link a magic-link email carries is
// built server-side. One-time codes are planted instead (redis.ts → plantCode).

interface QueuedEmail {
  type: string;
  email: string;
  data: Record<string, unknown>;
  locale?: string;
}

/**
 * Waits for the newest queued email of `type` (`ADMIN_RESET_PASSWORD`,
 * `MAGIC_LINK`, …) addressed to `email` and returns its template data. Opens
 * and closes its own Redis connection so the worker never keeps a handle open.
 */
export async function readQueuedEmail(
  type: string,
  email: string,
  timeoutMs = 10_000
): Promise<Record<string, unknown>> {
  if (!REDIS_URL)
    throw new Error("REDIS_URL is not set (automation-test/.env)");
  const client = createClient({ url: REDIS_URL });
  client.on("error", () => undefined);
  await client.connect();
  const target = email.toLowerCase();
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const ids: number[] = [];
      for await (const key of client.scanIterator({
        MATCH: "bull:email:*",
        COUNT: 1000
      })) {
        const id = Number(key.split(":")[2]);
        if (Number.isInteger(id)) ids.push(id);
      }
      ids.sort((a, b) => b - a);
      for (const id of ids) {
        const raw = await client.hGet(`bull:email:${id}`, "data");
        if (!raw) continue;
        const job = JSON.parse(raw) as QueuedEmail;
        if (job.type === type && job.email?.toLowerCase() === target) {
          return job.data;
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  } finally {
    await client.quit().catch(() => undefined);
  }
  throw new Error(`readQueuedEmail: no ${type} email for ${email}`);
}
