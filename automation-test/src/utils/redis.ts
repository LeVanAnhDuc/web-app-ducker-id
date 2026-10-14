import bcrypt from "bcryptjs";
import { createClient } from "redis";
import { REDIS_URL } from "@/config/datastores";

// Direct access to the Redis the API server uses.
//
// Every one-time secret the server issues — sign-up OTP, login OTP, magic
// link, forgot-password OTP/link, unlock code — is stored ONLY as a bcrypt
// hash, and the plaintext leaves through the email queue. A test therefore
// cannot read a real code. Instead it asks the server to issue one (so every
// cooldown / resend counter is set exactly as for a real user), then replaces
// the stored hash with the hash of a code it knows. `bcrypt.compareSync` on
// the server accepts the `$2a$`/`$2b$` hashes bcryptjs writes.
//
// Key layout mirrors server/src/constants/redis/store/index.ts and
// server/src/utils/redis/key-builder.ts (`parts.join(":")`). If a test here
// starts failing with "invalid code", check those two files first.

export const OTP_KEYS = {
  signup: "otp-signup",
  login: "otp-login",
  magicLinkLogin: "magic-link-login",
  forgotPasswordOtp: "otp-forgot-pw",
  forgotPasswordMagicLink: "ml-forgot-pw",
  unlock: "login-unlock-token"
} as const;

export type OtpKind = keyof typeof OTP_KEYS;

type Client = ReturnType<typeof createClient>;
let client: Client | null = null;

async function redis(): Promise<Client> {
  if (!REDIS_URL) {
    throw new Error(
      "REDIS_URL is not set — copy automation-test/.env.example to .env and point it at the server's Redis"
    );
  }
  if (!client) {
    client = createClient({ url: REDIS_URL });
    client.on("error", () => {
      /* surfaced by the awaiting call */
    });
    await client.connect();
  }
  return client;
}

/** Closes the shared connection — call from a global teardown. */
export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}

function keyFor(kind: OtpKind, subject: string): string {
  return `${OTP_KEYS[kind]}:${subject}`;
}

/**
 * Replaces the hash the server stored for `subject` (an email for every kind
 * except `unlock`, which is keyed by its own identifier) with the hash of
 * `code`, keeping the original TTL. Throws if the server never issued one —
 * a plant without a prior "send" would test nothing real.
 */
export async function plantCode(
  kind: OtpKind,
  subject: string,
  code: string
): Promise<void> {
  const r = await redis();
  const key = keyFor(kind, subject.toLowerCase());
  const ttl = await r.ttl(key);
  if (ttl <= 0) {
    throw new Error(
      `plantCode: no live "${key}" — call the send endpoint first (ttl=${ttl})`
    );
  }
  await r.setEx(key, ttl, bcrypt.hashSync(code, 10));
}

/** True while the server still holds a code for `subject`. */
export async function hasCode(
  kind: OtpKind,
  subject: string
): Promise<boolean> {
  const r = await redis();
  return (await r.exists(keyFor(kind, subject.toLowerCase()))) === 1;
}

/** Lists keys matching a glob — for tests that must find a server-issued id. */
export async function findKeys(pattern: string): Promise<string[]> {
  const r = await redis();
  const keys: string[] = [];
  // One SCAN page covers the whole keyspace of the shared cloud Redis
  // (thousands of keys, ~250 ms a round trip): at 500 a page, every
  // createAccount / clearRateLimits paid a dozen round trips per pattern.
  for await (const key of r.scanIterator({ MATCH: pattern, COUNT: 50_000 })) {
    keys.push(key);
  }
  return keys;
}

/** The string value of one key, or null — for a counter the server keeps. */
export async function getValue(key: string): Promise<string | null> {
  const r = await redis();
  return r.get(key);
}

/** Remaining TTL of a key in seconds (-1 = no expiry, -2 = key gone). */
export async function keyTtl(key: string): Promise<number> {
  return (await redis()).ttl(key);
}

export async function keyExists(key: string): Promise<boolean> {
  return (await (await redis()).exists(key)) === 1;
}

/**
 * Shortens a key's life to `ms` milliseconds — expires a server-issued value
 * (e.g. an OAuth code) without waiting out its real TTL. Throws when the key
 * does not exist.
 */
export async function expireKeyIn(key: string, ms: number): Promise<void> {
  const ok = await (await redis()).pExpire(key, ms);
  if (!ok) throw new Error(`pexpire ${key}: no such key`);
}

/**
 * Deletes one key the server writes AFTER answering — login OTP / magic link
 * and forgot-password sends set their cooldown fire-and-forget, so deleting
 * it right after the response can run before the write and leave the
 * cooldown in place. Waits (up to `timeoutMs`) for the key, then drops it.
 * Throws when the key never appears.
 */
export async function deleteKeyOnceSet(
  key: string,
  timeoutMs = 10_000
): Promise<void> {
  const r = await redis();
  const deadline = Date.now() + timeoutMs;
  while ((await r.del(key)) === 0) {
    if (Date.now() > deadline) {
      throw new Error(`${key} was never written within ${timeoutMs} ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Deletes every key matching a glob. Returns how many went. */
export async function deleteKeys(pattern: string): Promise<number> {
  // An exact key needs no SCAN: walking the whole keyspace of the cloud Redis
  // (BullMQ keys included) costs a round trip per 500 keys, which turns a
  // loop of "drop the cooldown, send again" into a test timeout.
  if (!/[*?[\\]/.test(pattern)) return (await redis()).del(pattern);
  const keys = await findKeys(pattern);
  if (keys.length === 0) return 0;
  const r = await redis();
  await r.del(keys);
  return keys.length;
}

/**
 * Clears every rate-limit counter. All tests come from one IP, and the
 * per-IP windows (e.g. 30 password logins / 15 min) are smaller than one full
 * run, so without this a late test fails with 429 for reasons unrelated to
 * what it checks. Tests that verify rate limiting opt out via the
 * `keepRateLimits` fixture option.
 */
export async function clearRateLimits(): Promise<number> {
  return deleteKeys("rate-limit:*");
}

/**
 * Clears per-email throttles the server keeps outside `rate-limit:*`
 * (OTP cooldowns, resend counters, failed-attempt counters, lockout) so a
 * throwaway account starts every flow from a clean slate.
 */
export async function clearEmailState(email: string): Promise<void> {
  const e = email.toLowerCase();
  await Promise.all(
    [
      "otp-signup-cooldown",
      "otp-signup-failed-attempts",
      "otp-signup-resend-count",
      "login-failed-attempts",
      "login-lockout",
      "otp-login-cooldown",
      "otp-login-failed-attempts",
      "otp-login-resend-count",
      "magic-link-login-cooldown",
      "unlock-rate",
      "unlock-cooldown",
      "otp-forgot-pw-cd",
      "otp-forgot-pw-fail",
      "otp-forgot-pw-resend",
      "ml-forgot-pw-cd",
      "ml-forgot-pw-resend"
    ].map((prefix) => deleteKeys(`${prefix}:${e}*`))
  );
}
