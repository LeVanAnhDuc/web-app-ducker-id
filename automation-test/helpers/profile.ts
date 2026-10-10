import { expect, request } from "@playwright/test";
import { BASE_URL } from "./env";
import {
  KNOWN_OTP,
  THROWAWAY_PASSWORD,
  throwawayEmail,
  type Account
} from "./accounts";
import { clearEmailState, plantCode } from "./redis";
import { bearerContext, loginOverApi } from "./password";

// Profile helpers: dates relative to today (the validators are), a sign-up
// with a chosen date of birth (createAccount always uses 1995-06-15), and a
// direct PATCH /users/me to put a throwaway profile into a known state.

/** `yyyy-mm-dd` for today shifted by whole years/days, in local time. */
export function isoDateFromToday(years: number, days = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** `dd/MM/yyyy`, the format the profile date input takes. */
export function toDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Same real sign-up as createAccount(), but with a chosen date of birth.
 * Lives under the throwaway domain, so the cleanup project deletes it.
 */
export async function createAccountWithDob(
  dateOfBirth: string,
  tag = "dob"
): Promise<Account> {
  const email = throwawayEmail(tag);
  const password = THROWAWAY_PASSWORD;
  const fullName = "Elder Tester";
  await clearEmailState(email);
  const api = await request.newContext({ baseURL: BASE_URL });
  try {
    const send = await api.post("/api/v1/auth/signup/send-otp", {
      data: { email }
    });
    expect(send.ok(), `signup send-otp → ${send.status()}`).toBeTruthy();
    await plantCode("signup", email, KNOWN_OTP);
    const verify = await api.post("/api/v1/auth/signup/verify-otp", {
      data: { email, otp: KNOWN_OTP }
    });
    expect(verify.ok(), `signup verify-otp → ${verify.status()}`).toBeTruthy();
    const { data } = (await verify.json()) as {
      data: { sessionToken: string };
    };
    const complete = await api.post("/api/v1/auth/signup/complete", {
      data: {
        email,
        password,
        confirmPassword: password,
        sessionToken: data.sessionToken,
        acceptTerms: true,
        fullName,
        gender: "other",
        dateOfBirth
      }
    });
    expect(
      complete.ok(),
      `signup complete → ${complete.status()} ${await complete.text()}`
    ).toBeTruthy();
  } finally {
    await api.dispose();
  }
  return { email, password, fullName };
}

/** PATCH /users/me as the account; returns the updated profile. */
export async function patchProfile(
  account: Account,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const login = await loginOverApi(account.email, account.password);
  expect(login.status, `login ${account.email}`).toBe(200);
  const api = await bearerContext(login.accessToken!);
  try {
    const res = await api.patch("/api/v1/users/me", { data });
    expect(res.status(), `PATCH /users/me ${await res.text()}`).toBe(200);
    return ((await res.json()) as { data: Record<string, unknown> }).data;
  } finally {
    await api.dispose();
  }
}

/** GET /users/me as the account. */
export async function getProfile(
  account: Account
): Promise<Record<string, unknown>> {
  const login = await loginOverApi(account.email, account.password);
  const api = await bearerContext(login.accessToken!);
  try {
    const res = await api.get("/api/v1/users/me");
    expect(res.status()).toBe(200);
    return ((await res.json()) as { data: Record<string, unknown> }).data;
  } finally {
    await api.dispose();
  }
}
