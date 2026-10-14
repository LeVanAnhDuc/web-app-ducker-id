import { expect, type APIRequestContext } from "@playwright/test";
import { createApiClient } from "@/api";
import { userIdOf } from "./accounts";
import { readQueuedEmail } from "./email";
import { deleteKeys, getValue } from "./redis";

// Backend state for the PASSWORD module (tests/{e2e,api}/password). Server
// facts these rely on (server/src/modules/forgot-password, constants/redis):
//   - Each recovery send that reaches a real, active account sets a 60 s
//     cooldown (`otp-forgot-pw-cd:<email>` / `ml-forgot-pw-cd:<email>`) and
//     bumps a send counter (`otp-forgot-pw-resend:<email>` /
//     `ml-forgot-pw-resend:<email>`); the 4th send in the window is refused.
//     Both are written fire-and-forget after the response (withRetry).
//   - An admin reset overwrites the password with a random temporary one that
//     only leaves through the ADMIN_RESET_PASSWORD email (utils/email.ts).

/** Which recovery channel: one-time code or magic link. */
export type RecoveryChannel = "otp" | "magicLink";

const PREFIX: Record<RecoveryChannel, string> = {
  otp: "otp-forgot-pw",
  magicLink: "ml-forgot-pw"
};

/**
 * Waits until the server has counted `sends` recovery sends for `email`, then
 * removes the 60 s cooldown so the next send is judged by the send limit
 * alone — what a user sees after waiting out the countdown.
 */
export async function skipRecoveryCooldown(
  channel: RecoveryChannel,
  email: string,
  sends: number
): Promise<void> {
  const e = email.toLowerCase();
  await expect
    .poll(() => getValue(`${PREFIX[channel]}-resend:${e}`), {
      message: `${channel} send #${sends} counted for ${email}`,
      timeout: 10_000
    })
    .toBe(String(sends));
  await expect
    .poll(() => getValue(`${PREFIX[channel]}-cd:${e}`), {
      message: `${channel} cooldown set for ${email}`,
      timeout: 10_000
    })
    .not.toBeNull();
  await deleteKeys(`${PREFIX[channel]}-cd:${e}`);
}

/**
 * Admin-resets an account's password (on a context carrying the admin's
 * Bearer, e.g. the `adminApi` fixture) and returns the temporary password
 * from the queued ADMIN_RESET_PASSWORD email.
 */
export async function adminResetAndReadTempPassword(
  adminApi: APIRequestContext,
  email: string
): Promise<string> {
  const id = await userIdOf(email);
  const res = await createApiClient(adminApi).adminUsers.resetPassword(id);
  expect(res.status(), `admin reset ${email}`).toBe(200);
  const data = await readQueuedEmail("ADMIN_RESET_PASSWORD", email);
  const temp = data.tempPassword;
  expect(typeof temp, "tempPassword in the queued email").toBe("string");
  return temp as string;
}
