import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import { createApiClient } from "@/api";
import { newContext } from "@/api/base.client";
import type { ErrorBody } from "@/api/response";
import { MONGO_DB_NAME, MONGO_URL } from "@/config/datastores";
import { KNOWN_OTP, THROWAWAY_DOMAIN, WRONG_PASSWORD } from "@/data/test-data";
import { findUserByEmail } from "./accounts";
import { deleteKeys, hasCode, plantCode, type OtpKind } from "./redis";

// Backend state for the AUTH module (tests/e2e/auth, tests/api/auth, and the
// modules that need a locked account). Server facts these rely on (read from
// server/src, not guessed):
//   - LOGIN_LOCKOUT: 10 wrong passwords → locked for 1800 s
//     (modules/login/constants). Wrong passwords for an unknown email are
//     never counted.
//   - Magic-link tokens are stored as a bcrypt hash under
//     `magic-link-login:<email>` (strategies/magic-link-login).
//   - The unlock "code" is a temporary password (≥ 12 chars) stored as a
//     bcrypt hash under `login-unlock-token:<email>`.

// ── One-time codes ─────────────────────────────────────────────────────────

/** Waits until the server has issued a code of `kind` for `email`. */
export async function waitForCode(kind: OtpKind, email: string): Promise<void> {
  await expect
    .poll(() => hasCode(kind, email), {
      message: `server issued a ${kind} code for ${email}`,
      timeout: 10_000
    })
    .toBe(true);
}

/** Waits for the server-issued code, then replaces it with `code`. */
export async function plantWhenIssued(
  kind: OtpKind,
  email: string,
  code: string = KNOWN_OTP
): Promise<void> {
  await waitForCode(kind, email);
  await plantCode(kind, email, code);
}

// ── Rate limits ────────────────────────────────────────────────────────────

/** Deletes the per-IP counters of one rate limiter (`login`, `signup`, …). */
export function clearIpLimit(name: string): Promise<number> {
  return deleteKeys(`rate-limit:${name}:ip:*`);
}

// ── Account status (throwaway accounts only) ───────────────────────────────

/**
 * Sets `isActive` / `verifiedEmail` on a THROWAWAY account's auth record —
 * how a test gets an inactive or unverified account without touching the
 * seeded ones (which other specs may change concurrently). Refuses any
 * address outside the throwaway domain.
 */
export async function setAuthFlags(
  email: string,
  flags: { isActive?: boolean; verifiedEmail?: boolean }
): Promise<void> {
  if (!email.toLowerCase().endsWith(`@${THROWAWAY_DOMAIN}`)) {
    throw new Error(`setAuthFlags: ${email} is not a throwaway account`);
  }
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`setAuthFlags: no user ${email}`);
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const res = await client
      .db(MONGO_DB_NAME)
      .collection("auths")
      .updateOne({ _id: user.authId }, { $set: flags });
    expect(res.matchedCount, `auth record of ${email}`).toBe(1);
  } finally {
    await client.close();
  }
}

// ── Lockout (throwaway accounts only) ──────────────────────────────────────

/** Status and parsed body of a response, safe to read after disposal. */
export interface Answer {
  status: number;
  error: ErrorBody;
}

/**
 * Sends `count` wrong passwords for `email` over the API (own anonymous
 * session, `Accept-Language: en`) and returns the last answer. Every attempt
 * before the 10th is asserted to be a plain 401.
 */
export async function failPasswords(
  email: string,
  count: number
): Promise<Answer> {
  const ctx = await newContext({ "Accept-Language": "en" });
  const api = createApiClient(ctx);
  try {
    let last: Answer | undefined;
    for (let i = 1; i <= count; i += 1) {
      const res = await api.auth.login(email, WRONG_PASSWORD);
      last = { status: res.status(), error: (await res.json()) as ErrorBody };
      if (i < 10) {
        expect(last.status, `wrong password #${i} → ${last.error.code}`).toBe(
          401
        );
      }
    }
    return last!;
  } finally {
    await ctx.dispose();
  }
}

/** Locks an account the way a user would: 10 wrong passwords. */
export async function lockAccount(email: string): Promise<void> {
  const res = await failPasswords(email, 10);
  expect(res.status, `10th wrong password locks → ${res.error.code}`).toBe(429);
}
