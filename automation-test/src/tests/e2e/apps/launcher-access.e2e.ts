import { test, expect } from "@/fixtures";
import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { createApiClient } from "@/api";
import { apiAs } from "@/api/session";
import { AppCard } from "@/components/app-card.component";
import { copy, fill } from "@/data/copy";
import { AppsPage } from "@/pages/dashboard/apps.page";
import { NotificationsPage } from "@/pages/dashboard/notifications.page";
import { RecentlyUsedPage } from "@/pages/dashboard/recently-used.page";
import { createAccount } from "@/utils/accounts";
import type { Account } from "@/utils/accounts";
import {
  clearOverrides,
  getAppIdsByName,
  getUserIdByEmail,
  setAccess
} from "@/utils/entitlements";

// Access control as the user sees it: an admin's grant or revoke (written
// through the admin API) shows up in /apps and its search, /favorites,
// /recently-used, /oauth/authorize and the user's notifications.
// Role: a throwaway account (role user) signed in once in beforeAll — every
// grant / revoke notifies its target for real, and doing that to the seeded
// user@test.com would push the notifications suite's seed anchors off page
// one. Overrides are removed in afterEach; cleanup deletes the account.
// Test cases: TC-APPS-060 … 062, TC-FAVORITES-029, TC-RECENTLYUSED-029, TC-OIDC-050,
// TC-OIDC-051, TC-ADMINENTITLEMENTS-040, TC-ADMINENTITLEMENTS-041. The entitlement API's own
// authorisation is tests/api/admin-entitlements/entitlements.api.ts.
//
// Seeded catalog (server/src/database/seeders/data/web-apps.ts): Notes is
// active and [user]; Operations Console is active and [admin].

test.use({ role: "guest" });
test.describe.configure({ mode: "serial" });

const PKCE_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

const NOTES = {
  name: "Notes",
  clientId: "client_notes_44a9",
  redirectUri: "https://notes.example.com/auth/callback"
};
const OPS = {
  name: "Operations Console",
  clientId: "client_ops_5e21",
  redirectUri: "https://ops.example.com/auth/callback"
};
const BLOG = "Blog";

// /oauth/* is mounted at the origin root, not under the API prefix.
const authorizeUrl = (clientId: string, redirectUri: string) =>
  `/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid",
    state: "e2e-access-control",
    code_challenge: PKCE_CHALLENGE,
    code_challenge_method: "S256"
  })}`;

const authorizeLocation = async (
  page: Page,
  app: { clientId: string; redirectUri: string }
): Promise<string> => {
  const res = await page.request.get(
    authorizeUrl(app.clientId, app.redirectUri),
    { maxRedirects: 0 }
  );
  expect(res.status()).toBe(302);
  return res.headers()["location"] ?? "";
};

let account: Account;
let userId: string;
let appIds: Record<string, string>;
let api: APIRequestContext;
let statePath: string;
let webUrl: string;

/** A page signed in as the throwaway account. */
async function accountPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    baseURL: webUrl,
    storageState: statePath
  });
  return ctx.newPage();
}

const favoriteIds = async (): Promise<string[]> => {
  const res = await createApiClient(api).favorites.list();
  expect(res.ok(), `GET favorites → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as {
    data?: { items?: { _id: string }[] };
  };
  return (body.data?.items ?? []).map((item) => item._id);
};

const recentNames = async (): Promise<string[]> => {
  const res = await createApiClient(api).recentApps.list({ limit: 100 });
  expect(res.ok(), `GET recent-apps → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as {
    data: { items: { displayName: string }[] };
  };
  return body.data.items.map((item) => item.displayName);
};

test.beforeAll(async ({ browser }, testInfo) => {
  // The project's baseURL (config/urls.ts); beforeAll gets no test fixtures.
  webUrl = testInfo.project.use.baseURL!;
  account = await createAccount({ tag: "access-launcher" });
  userId = await getUserIdByEmail(account.email);
  appIds = await getAppIdsByName();
  api = await apiAs(account.email, account.password);

  // One browser sign-in for the whole file, the way setup signs in the
  // seeded users.
  const ctx = await browser.newContext({ baseURL: webUrl });
  const login = await createApiClient(ctx.request).auth.login(
    account.email,
    account.password
  );
  expect(login.ok(), `browser login → ${login.status()}`).toBeTruthy();
  statePath = testInfo.outputPath("access-launcher.json");
  await ctx.storageState({ path: statePath });
  await ctx.close();
});

test.afterEach(async () => {
  await clearOverrides(userId);
});

test.afterAll(async () => {
  await api?.dispose();
});

test.describe("Access control — revoke", () => {
  test(
    "A revoked app leaves /apps and returns when the override is removed",
    { tag: ["@TC-APPS-060", "@smoke"] },
    async ({ browser }) => {
      const page = await accountPage(browser);
      const apps = new AppsPage(page);
      await apps.goto();
      await expect(apps.cards.title(NOTES.name)).toBeVisible();

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      await page.reload();
      await expect(apps.cards.title(BLOG)).toBeVisible();
      await expect(apps.cards.title(NOTES.name)).toHaveCount(0);

      await clearOverrides(userId);
      await page.reload();
      await expect(apps.cards.title(NOTES.name)).toBeVisible();
      await page.context().close();
    }
  );

  test(
    "Searching for a revoked app finds nothing",
    { tag: "@TC-APPS-061" },
    async ({ browser }) => {
      const page = await accountPage(browser);
      const apps = new AppsPage(page);
      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      await apps.goto(`?search=${NOTES.name}`);
      await expect(apps.cards.title(NOTES.name)).toHaveCount(0);
      await page.context().close();
    }
  );

  test(
    "A revoked favourite is hidden, not deleted, and returns on re-grant",
    { tag: "@TC-FAVORITES-029" },
    async ({ browser }) => {
      const star = await createApiClient(api).favorites.add(appIds[NOTES.name]);
      expect(star.ok(), `star → ${star.status()}`).toBeTruthy();
      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);

      const page = await accountPage(browser);
      const cards = new AppCard(page);
      await page.goto("/favorites");
      await expect(cards.title(NOTES.name)).toHaveCount(0);
      expect(await favoriteIds()).toEqual([]);

      await clearOverrides(userId);
      await page.reload();
      await expect(cards.title(NOTES.name)).toBeVisible();
      expect(await favoriteIds()).toEqual([appIds[NOTES.name]]);
      await page.context().close();
    }
  );

  test(
    "A revoked app drops out of the history and returns on re-grant",
    { tag: "@TC-RECENTLYUSED-029" },
    async ({ browser }) => {
      const open = await createApiClient(api).recentApps.record(
        appIds[NOTES.name]
      );
      expect(open.ok(), `record launch → ${open.status()}`).toBeTruthy();
      expect(await recentNames()).toContain(NOTES.name);

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      expect(await recentNames()).not.toContain(NOTES.name);
      const page = await accountPage(browser);
      const recent = new RecentlyUsedPage(page);
      await recent.goto();
      await expect(recent.heading()).toBeVisible();
      await expect(recent.rowTitle(NOTES.name)).toHaveCount(0);

      await clearOverrides(userId);
      expect(await recentNames()).toContain(NOTES.name);
      await page.reload();
      await expect(recent.rowTitle(NOTES.name)).toBeVisible();
      await page.context().close();
    }
  );

  test(
    "Signing in to a revoked app is refused, and allowed after reset",
    { tag: ["@TC-OIDC-050", "@smoke"] },
    async ({ browser }) => {
      const page = await accountPage(browser);
      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      expect(await authorizeLocation(page, NOTES)).toContain(
        "error=access_denied"
      );

      await clearOverrides(userId);
      expect(await authorizeLocation(page, NOTES)).toContain(
        `${NOTES.redirectUri}?code=`
      );
      await page.context().close();
    }
  );
});

test.describe("Access control — grant beyond the role", () => {
  test(
    "An admin-only app granted beyond the role appears",
    { tag: "@TC-APPS-062" },
    async ({ browser }) => {
      const page = await accountPage(browser);
      const apps = new AppsPage(page);
      await apps.goto();
      await expect(apps.cards.title(BLOG)).toBeVisible();
      await expect(apps.cards.title(OPS.name)).toHaveCount(0);

      await setAccess([{ userId, appId: appIds[OPS.name], granted: true }]);
      await page.reload();
      await expect(apps.cards.title(OPS.name)).toBeVisible();
      await page.context().close();
    }
  );

  test(
    "An app granted beyond the role lets SSO through",
    { tag: "@TC-OIDC-051" },
    async ({ browser }) => {
      const page = await accountPage(browser);
      expect(await authorizeLocation(page, OPS)).toContain(
        "error=access_denied"
      );

      await setAccess([{ userId, appId: appIds[OPS.name], granted: true }]);
      expect(await authorizeLocation(page, OPS)).toContain(
        `${OPS.redirectUri}?code=`
      );
      await page.context().close();
    }
  );
});

// A flip of effective access writes ENTITLEMENT_GRANTED / _REVOKED for the
// user through the notification queue — so rows are polled for.
test.describe("Access control — notifications", () => {
  interface Row {
    id: string;
    type: string;
    params: Record<string, string>;
  }

  const entitlementRows = async (appName: string): Promise<Row[]> => {
    const res = await createApiClient(api).notifications.list();
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data?: { items?: Row[] } };
    // Scoped to one app: the previous test's teardown may still be
    // delivering a row about another app.
    return (body.data?.items ?? []).filter(
      (row) =>
        row.type.startsWith("ENTITLEMENT_") && row.params.appName === appName
    );
  };

  const newTypes = async (appName: string, before: Set<string>) =>
    (await entitlementRows(appName))
      .filter((row) => !before.has(row.id))
      .map((row) => row.type);

  const idsOf = async (appName: string) =>
    new Set((await entitlementRows(appName)).map((row) => row.id));

  test(
    "Revoking and restoring an app notifies the user both times",
    { tag: "@TC-ADMINENTITLEMENTS-040" },
    async ({ browser }) => {
      const before = await idsOf(NOTES.name);

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      await expect
        .poll(() => newTypes(NOTES.name, before))
        .toEqual(["ENTITLEMENT_REVOKED"]);

      await clearOverrides(userId);
      await expect
        .poll(() => newTypes(NOTES.name, before))
        .toEqual(["ENTITLEMENT_GRANTED", "ENTITLEMENT_REVOKED"]);

      const page = await accountPage(browser);
      const inbox = new NotificationsPage(page);
      const types = copy.notifications.types;
      await inbox.goto();
      await expect(
        inbox
          .text(fill(types.ENTITLEMENT_REVOKED.body, { appName: NOTES.name }))
          .first()
      ).toBeVisible();
      const granted = inbox
        .link(fill(types.ENTITLEMENT_GRANTED.body, { appName: NOTES.name }))
        .first();
      await expect(granted).toHaveAttribute(
        "href",
        `/apps?search=${NOTES.name}`
      );
      await page.context().close();
    }
  );

  test(
    "Saving the value the user already has sends nothing",
    { tag: "@TC-ADMINENTITLEMENTS-041" },
    async () => {
      const notesBefore = await idsOf(NOTES.name);
      const opsBefore = await idsOf(OPS.name);

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: true }]);
      await setAccess([{ userId, appId: appIds[OPS.name], granted: false }]);
      // Give the queue the time a real row would have taken to land: proving
      // an absence needs a bounded wait (no event to wait for).
      await new Promise((resolve) => setTimeout(resolve, 2_000));

      expect(await newTypes(NOTES.name, notesBefore)).toEqual([]);
      expect(await newTypes(OPS.name, opsBefore)).toEqual([]);
    }
  );
});
