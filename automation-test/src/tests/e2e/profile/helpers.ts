import type { Page } from "@playwright/test";
import type { ApiClient } from "@/api";
import type { MyProfile } from "@/api/user.client";
import { dataOf, sessionOf } from "@/api/response";
import { loginInBrowser } from "@/api/session";
import { API_PREFIX } from "@/config/urls";
import { PROFILE_FIXTURE } from "@/data/test-data";
import type { ProfilePage } from "@/pages/settings/profile.page";
import { createAccount, type Account } from "@/utils/accounts";

// Scaffolding the profile e2e specs share (moved from helpers/profile.ts):
// a throwaway account with a known profile, its stored profile read back over
// the API, and page.route mocks / counters for PATCH /users/me. Only this
// module uses them.

type NewApi = () => Promise<ApiClient>;

/** Glob of /users/me on the client origin (GET and PATCH). */
export const USERS_ME_GLOB = `**${API_PREFIX}/users/me`;

/** The Bearer-carrying `users` client of an account, on a fresh context from `newApi`. */
async function usersAs(newApi: NewApi, account: Account) {
  const api = await newApi();
  const session = await sessionOf(
    await api.auth.login(account.email, account.password)
  );
  return api.as(session).users;
}

/** PATCH /users/me as the account; throws unless it answers 200. */
export async function setProfile(
  newApi: NewApi,
  account: Account,
  data: Record<string, unknown>
): Promise<MyProfile> {
  const res = await (await usersAs(newApi, account)).updateMe(data);
  if (res.status() !== 200) {
    throw new Error(`PATCH /users/me → ${res.status()} ${await res.text()}`);
  }
  return dataOf<MyProfile>(res);
}

/** GET /users/me as the account; throws unless it answers 200. */
export async function storedProfile(
  newApi: NewApi,
  account: Account
): Promise<MyProfile> {
  const res = await (await usersAs(newApi, account)).me();
  if (res.status() !== 200) {
    throw new Error(`GET /users/me → ${res.status()} ${await res.text()}`);
  }
  return dataOf<MyProfile>(res);
}

/** A throwaway account whose profile is PROFILE_FIXTURE. */
export async function accountWithProfile(
  newApi: NewApi,
  tag: string
): Promise<Account> {
  const account = await createAccount({
    tag,
    fullName: PROFILE_FIXTURE.fullName
  });
  await setProfile(newApi, account, { ...PROFILE_FIXTURE });
  return account;
}

/** Signs the page's context in as the account and opens /profile (`prefix` "/vi"). */
export async function openProfileAs(
  profilePage: ProfilePage,
  account: Account,
  prefix = ""
): Promise<void> {
  await loginInBrowser(profilePage.page, account.email, account.password);
  await profilePage.open(prefix);
}

/** Answers every PATCH /users/me with a 500; GET passes through. */
export async function failProfileUpdate(page: Page): Promise<void> {
  await page.route(USERS_ME_GLOB, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INTERNAL_SERVER_ERROR",
            message: "x"
          })
        })
      : route.continue()
  );
}

/** Counts the PATCH /users/me requests the page fires. */
export function countProfileUpdates(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().endsWith(`${API_PREFIX}/users/me`)) {
      counter.count += 1;
    }
  });
  return counter;
}

/** Collects the text of every console error the page logs from now on. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

/** The console errors that come from next-intl (a missing or broken message). */
export function intlErrors(errors: string[]): string[] {
  return errors.filter((m) =>
    /MISSING_MESSAGE|IntlError|MessageFormat/i.test(m)
  );
}
