import { expect, request } from "@playwright/test";
import type { APIRequestContext, APIResponse, Page } from "@playwright/test";
import { MongoClient } from "mongodb";
import { BASE_URL, MONGO_DB_NAME, MONGO_URL } from "./env";
import { KNOWN_OTP, THROWAWAY_DOMAIN, findUserByEmail } from "./accounts";
import { deleteKeys, hasCode, plantCode } from "./redis";
import type { OtpKind } from "./redis";

// Helpers for the AUTH module specs (tests/e2e/auth, tests/api/auth).
//
// Server facts these rely on (read from server/src, not guessed):
//   - LOGIN_LOCKOUT: 10 wrong passwords → locked for 1800 s
//     (modules/login/constants). Wrong passwords for an unknown email are
//     never counted.
//   - Magic-link tokens are 64 random bytes as hex = 128 chars
//     (validators/schemas/login.ts) and stored as a bcrypt hash under
//     `magic-link-login:<email>`; the email link is
//     `/login/verify-magic-link?token=…&email=…` (strategies/magic-link-login).
//   - The unlock "code" is a temporary password (≥ 12 chars) stored as a
//     bcrypt hash under `login-unlock-token:<email>`.

export const API = "/api/v1";

/** A password that satisfies the strength policy but is never anyone's. */
export const WRONG_PASSWORD = "Wrong@1234";

/** 128 lower-case hex chars — the shape the magic-link verify schema accepts. */
export const KNOWN_MAGIC_TOKEN = "ab12".repeat(32);

/** A temporary unlock password the test plants (min length is 12). */
export const KNOWN_TEMP_PASSWORD = "TempUnlock@2026";

/**
 * Fresh guest request context (own cookie jar). Dispose it when done.
 * Sends `Accept-Language: en` unless told otherwise — with no header the
 * server answers in its default locale, which is Vietnamese
 * (server/src/i18n/locales.config.ts).
 */
export function newApi(
  headers: Record<string, string> = {}
): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "Accept-Language": "en", ...headers }
  });
}

export interface ErrorBody {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  errors?: { field: string; reason: string; message: string }[];
}

export async function errorOf(res: APIResponse): Promise<ErrorBody> {
  return (await res.json()) as ErrorBody;
}

/** Every `Set-Cookie` header of a response. */
export function setCookies(res: APIResponse): string[] {
  return res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
}

/** The `Set-Cookie` header for one cookie name, or undefined. */
export function setCookie(res: APIResponse, name: string): string | undefined {
  return setCookies(res).find((c) => c.startsWith(`${name}=`));
}

/** Decodes a JWT payload without verifying it. */
export function jwtPayload<T = Record<string, unknown>>(jwt: string): T {
  const part = jwt.split(".")[1];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

export function passwordLogin(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<APIResponse> {
  return api.post(`${API}/auth/login`, { data: { email, password } });
}

/** Status and parsed body of a response, safe to read after disposal. */
export interface Answer {
  status: number;
  error: ErrorBody;
}

/**
 * Sends `count` wrong passwords for `email` and returns the last answer.
 * Every attempt before the 10th is asserted to be a plain 401.
 */
export async function failPasswords(
  email: string,
  count: number
): Promise<Answer> {
  const api = await newApi();
  try {
    let last: Answer | undefined;
    for (let i = 1; i <= count; i += 1) {
      const res = await passwordLogin(api, email, WRONG_PASSWORD);
      last = { status: res.status(), error: (await res.json()) as ErrorBody };
      if (i < 10) {
        expect(last.status, `wrong password #${i} → ${last.error.code}`).toBe(
          401
        );
      }
    }
    return last!;
  } finally {
    await api.dispose();
  }
}

/** Locks an account the way a user would: 10 wrong passwords. */
export async function lockAccount(email: string): Promise<void> {
  const res = await failPasswords(email, 10);
  expect(res.status, `10th wrong password locks → ${res.error.code}`).toBe(429);
}

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

/** The link the magic-link email would contain (relative to baseURL). */
export function magicLinkUrl(email: string, token = KNOWN_MAGIC_TOKEN): string {
  return `/login/verify-magic-link?token=${token}&email=${encodeURIComponent(email)}`;
}

/**
 * Runs sign-up up to (and including) the verified OTP and returns the
 * session token the info step needs.
 */
export async function verifiedSignupSession(
  api: APIRequestContext,
  email: string
): Promise<string> {
  const send = await api.post(`${API}/auth/signup/send-otp`, {
    data: { email }
  });
  expect(send.status(), "signup send-otp").toBe(200);
  await plantCode("signup", email, KNOWN_OTP);
  const verify = await api.post(`${API}/auth/signup/verify-otp`, {
    data: { email, otp: KNOWN_OTP }
  });
  expect(verify.status(), "signup verify-otp").toBe(200);
  const { data } = (await verify.json()) as { data: { sessionToken: string } };
  return data.sessionToken;
}

/** A complete-signup body that passes validation; override one field. */
export function completeBody(
  email: string,
  sessionToken: string,
  override: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    email,
    sessionToken,
    password: "Signup@123",
    confirmPassword: "Signup@123",
    acceptTerms: true,
    fullName: "Auth Tester",
    gender: "other",
    dateOfBirth: "1995-06-15",
    ...override
  };
}

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

// ── Browser ────────────────────────────────────────────────────────────────

/** Browser assertions: routes compile on first hit in the dev server. */
const uiExpect = expect.configure({ timeout: 15_000 });

/** Types a code into the 6-slot OTP input (input-otp renders one input). */
export async function typeOtp(page: Page, code: string): Promise<void> {
  const input = page.locator('input[data-slot="input-otp"]');
  await input.click();
  await input.pressSequentially(code);
}

/** Email step → password step → signed in. Ends once home has loaded. */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await uiExpect(page).toHaveURL(/\/login\/password\?email=/);
  await page.getByLabel("Enter your password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await uiExpect(page).toHaveURL(/\/$/);
  await uiExpect(
    page.getByRole("button", { name: "Open user menu" })
  ).toBeVisible();
}
