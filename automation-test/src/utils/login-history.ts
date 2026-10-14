import {
  expect,
  type APIRequestContext,
  type APIResponse
} from "@playwright/test";
import { createApiClient } from "@/api";
import type { AdminLoginHistoryPage } from "@/api/admin-login-history.client";
import { dataOf } from "@/api/response";
import { findUserByEmail } from "./accounts";

// Login-history state shared by the admin modules (moved out of the former
// helpers/adminUsers.ts, which admin-login-history imported).
//
// A login-history row's `userId` (and the admin `userId` filter) is the
// account's AUTH id (`auths._id`, the model's ref), not the `users._id` that
// GET /admin/users returns — authIdOf() resolves it.

/** Plain (cookie-less) password login on any request context; raw response. */
export function passwordLogin(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<APIResponse> {
  return createApiClient(api).auth.login(email, password);
}

/** The auth id (`auths._id`) of an account — what login history calls `userId`. */
export async function authIdOf(email: string): Promise<string> {
  const user = await findUserByEmail(email);
  expect(user, `users row for ${email}`).toBeTruthy();
  return String(user!.authId);
}

/**
 * Waits until the admin API lists `count` rows for one account: attempts are
 * written asynchronously, a moment after the login answers.
 */
export async function waitForAttempts(
  adminApi: APIRequestContext,
  userId: string,
  count: number
): Promise<void> {
  const admin = createApiClient(adminApi).adminLoginHistory;
  await expect
    .poll(
      async () =>
        (await dataOf<AdminLoginHistoryPage>(await admin.list({ userId }))).meta
          .total,
      { timeout: 10_000 }
    )
    .toBe(count);
}

/**
 * Makes sure the login history holds at least one failed attempt: a
 * throwaway account signs in with a wrong password, then waits until the
 * (asynchronously written) row is visible to the admin API.
 */
export async function ensureFailedAttempt(
  adminApi: APIRequestContext,
  guestApi: APIRequestContext,
  account: { email: string },
  wrongPassword = "Wrong@Password1"
): Promise<void> {
  await passwordLogin(guestApi, account.email, wrongPassword);
  const admin = createApiClient(adminApi).adminLoginHistory;
  await expect
    .poll(
      async () => {
        const res = await admin.list({ status: "failed", limit: 1 });
        return (await dataOf<AdminLoginHistoryPage>(res)).meta.total;
      },
      { timeout: 10_000 }
    )
    .toBeGreaterThan(0);
}
