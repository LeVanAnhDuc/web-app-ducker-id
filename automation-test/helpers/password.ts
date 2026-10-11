import { expect, request } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { createClient } from "redis";
import { BASE_URL, REDIS_URL } from "./env";
import { findUserByEmail } from "./accounts";

// Helpers for the PWD / PROFILE modules: real sessions for throwaway
// accounts, token inspection, and reading a queued email.
//
// Why a queued email: the admin-reset temp password is generated server-side
// and only ever leaves through the BullMQ `email` queue (EmailDispatcher →
// `bull:email:<id>`, job data kept for the last 50 completed jobs). Reading
// the job is reading the email the user would receive — the one real channel
// that carries the temp password. OTPs and magic links are still planted
// (helpers/redis.ts), because their hashes can be replaced; a temp password is
// hashed into Mongo and has no such seam.

/** 128 lower-case hex chars — the shape `fpMagicLinkVerifySchema` accepts. */
export const KNOWN_MAGIC_TOKEN = "ab".repeat(64);

export interface LoginResult {
  status: number;
  accessToken: string | null;
  idToken: string | null;
  /** Value of the `refreshToken` cookie the login set, if any. */
  refreshToken: string | null;
  body: unknown;
}

/** POST /auth/login in a throwaway request context (no shared state). */
export async function loginOverApi(
  email: string,
  password: string
): Promise<LoginResult> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const res = await ctx.post("/api/v1/auth/login", {
      data: { email, password }
    });
    const body = (await res.json().catch(() => null)) as {
      data?: { accessToken?: string; idToken?: string };
    } | null;
    const cookie = (await ctx.storageState()).cookies.find(
      (c) => c.name === "refreshToken"
    );
    return {
      status: res.status(),
      accessToken: body?.data?.accessToken ?? null,
      idToken: body?.data?.idToken ?? null,
      refreshToken: cookie?.value ?? null,
      body
    };
  } finally {
    await ctx.dispose();
  }
}

/** Bearer-token request context for an access token. Caller disposes. */
export async function bearerContext(
  accessToken: string,
  headers: Record<string, string> = {}
): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}`, ...headers }
  });
}

/** POST /auth/token/refresh with a given refresh cookie; returns the status. */
export async function refreshStatus(refreshToken: string): Promise<number> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const res = await ctx.post("/api/v1/auth/token/refresh", {
      headers: { Cookie: `refreshToken=${refreshToken}` }
    });
    return res.status();
  } finally {
    await ctx.dispose();
  }
}

/**
 * Logs `page`'s context in as an account: the login response sets the
 * refresh cookie on the context, and SessionGate turns it into a session on
 * the next full navigation.
 */
export async function loginInBrowser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const res = await page.request.post("/api/v1/auth/login", {
    data: { email, password }
  });
  expect(res.ok(), `browser login ${email} → ${res.status()}`).toBeTruthy();
}

/** Decodes a JWT payload without verifying it (inspection only). */
export function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

/** The `users._id` of an account, as the admin API addresses it. */
export async function userIdOf(email: string): Promise<string> {
  const user = await findUserByEmail(email);
  expect(user, `no users row for ${email}`).toBeTruthy();
  return String(user!._id);
}

interface QueuedEmail {
  type: string;
  email: string;
  data: Record<string, unknown>;
  locale?: string;
}

/**
 * Waits for the newest queued email of `type` addressed to `email` and returns
 * its template data. Opens and closes its own Redis connection so the worker
 * never keeps a handle open.
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

/** Admin-resets an account's password and returns the emailed temp password. */
export async function adminResetAndReadTempPassword(
  adminApi: APIRequestContext,
  email: string
): Promise<string> {
  const id = await userIdOf(email);
  const res = await adminApi.post(`/api/v1/admin/users/${id}/reset-password`);
  expect(res.status(), `admin reset ${email}`).toBe(200);
  const data = await readQueuedEmail("ADMIN_RESET_PASSWORD", email);
  const temp = data.tempPassword;
  expect(typeof temp, "tempPassword in the queued email").toBe("string");
  return temp as string;
}

/**
 * Records every text the shared `#announcer` live region ever holds. The
 * region is overwritten by whichever screen announces last, so asserting its
 * current text races; this keeps the history. Call before `page.goto`.
 */
export async function recordAnnouncements(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __announcements: string[] };
    w.__announcements = [];
    const observe = () => {
      const el = document.getElementById("announcer");
      if (!el) return false;
      const push = () => {
        const text = el.textContent?.trim();
        if (text) w.__announcements.push(text);
      };
      push();
      new MutationObserver(push).observe(el, {
        childList: true,
        characterData: true,
        subtree: true
      });
      return true;
    };
    if (!observe()) {
      const mo = new MutationObserver(() => {
        if (observe()) mo.disconnect();
      });
      document.addEventListener("DOMContentLoaded", () => {
        if (!observe())
          mo.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
      });
    }
  });
}

/** Everything `#announcer` has said since `recordAnnouncements`. */
export async function announcements(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      (window as unknown as { __announcements?: string[] }).__announcements ??
      []
  );
}
