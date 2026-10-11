import bcrypt from "bcryptjs";
import { createClient } from "redis";
import { REDIS_URL } from "./env";

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
  for await (const key of r.scanIterator({ MATCH: pattern, COUNT: 500 })) {
    keys.push(key);
  }
  return keys;
}

/** Deletes every key matching a glob. Returns how many went. */
export async function deleteKeys(pattern: string): Promise<number> {
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
