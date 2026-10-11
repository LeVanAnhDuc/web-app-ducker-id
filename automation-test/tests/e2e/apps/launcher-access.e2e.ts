import { test, expect, apiAs } from "@fixtures";
import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { createAccount } from "@helpers/accounts";
import type { Account } from "@helpers/accounts";
import { BASE_URL } from "@helpers/env";
import {
  clearOverrides,
  getAppIdsByName,
  getUserIdByEmail,
  setAccess
} from "@helpers/entitlements";

// Access control as the user sees it: an admin's grant or revoke (written
// through the admin API) shows up in /apps and its search, /favorites,
// /recently-used, /oauth/authorize and the user's notifications.
// Role: a throwaway account (role user) signed in once in beforeAll — every
// grant / revoke notifies its target for real, and doing that to the seeded
// user@test.com would push the notifications suite's seed anchors off page
// one. Overrides are removed in afterEach; cleanup deletes the account.
// Test cases: TC-APPS-060 … 062, TC-FAV-029, TC-RECENT-029, TC-OIDC-050,
// TC-OIDC-051, TC-ADMENT-040, TC-ADMENT-041. The entitlement API's own
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

const cardTitle = (page: Page, name: string) =>
  page.getByRole("heading", { level: 3, name, exact: true });

let account: Account;
let userId: string;
let appIds: Record<string, string>;
let api: APIRequestContext;
let statePath: string;

/** A page signed in as the throwaway account. */
async function accountPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    baseURL: BASE_URL,
    storageState: statePath
  });
  return ctx.newPage();
}

const favoriteIds = async (): Promise<string[]> => {
  const res = await api.get("/api/v1/users/me/favorites");
  expect(res.ok(), `GET favorites → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as {
    data?: { items?: { _id: string }[] };
  };
  return (body.data?.items ?? []).map((item) => item._id);
};

const recentNames = async (): Promise<string[]> => {
  const res = await api.get("/api/v1/users/me/recent-apps", {
    params: { limit: 100 }
  });
  expect(res.ok(), `GET recent-apps → ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as {
    data: { items: { displayName: string }[] };
  };
  return body.data.items.map((item) => item.displayName);
};

test.beforeAll(async ({ browser }, testInfo) => {
  account = await createAccount({ tag: "access-launcher" });
  userId = await getUserIdByEmail(account.email);
  appIds = await getAppIdsByName();
  api = await apiAs(account.email, account.password);

  // One browser sign-in for the whole file, the way setup signs in the
  // seeded users.
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const login = await ctx.request.post("/api/v1/auth/login", {
    data: { email: account.email, password: account.password }
  });
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
    "a revoked app leaves /apps and comes back once the override is removed",
    { tag: ["@TC-APPS-060", "@smoke"] },
    async ({ browser }) => {
      const page = await accountPage(browser);
      await page.goto("/apps");
      await expect(cardTitle(page, NOTES.name)).toBeVisible();

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      await page.reload();
      await expect(cardTitle(page, "Blog")).toBeVisible();
      await expect(cardTitle(page, NOTES.name)).toHaveCount(0);

      await clearOverrides(userId);
      await page.reload();
      await expect(cardTitle(page, NOTES.name)).toBeVisible();
      await page.context().close();
    }
  );

  test(
    "searching /apps for a revoked app finds nothing",
    { tag: "@TC-APPS-061" },
    async ({ browser }) => {
      const page = await accountPage(browser);
      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      await page.goto("/apps?search=Notes");
      await expect(cardTitle(page, NOTES.name)).toHaveCount(0);
      await page.context().close();
    }
  );

  test(
    "a revoked favorite is hidden, not deleted, and returns on re-grant",
    { tag: "@TC-FAV-029" },
    async ({ browser }) => {
      const star = await api.post(
        `/api/v1/users/me/favorites/${appIds[NOTES.name]}`
      );
      expect(star.ok(), `star → ${star.status()}`).toBeTruthy();
      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);

      const page = await accountPage(browser);
      await page.goto("/favorites");
      await expect(cardTitle(page, NOTES.name)).toHaveCount(0);
      expect(await favoriteIds()).toEqual([]);

      await clearOverrides(userId);
      await page.reload();
      await expect(cardTitle(page, NOTES.name)).toBeVisible();
      expect(await favoriteIds()).toEqual([appIds[NOTES.name]]);
      await page.context().close();
    }
  );

  test(
    "a revoked app leaves /recently-used and returns on re-grant",
    { tag: "@TC-RECENT-029" },
    async ({ browser }) => {
      const open = await api.post(
        `/api/v1/users/me/recent-apps/${appIds[NOTES.name]}`
      );
      expect(open.ok(), `record launch → ${open.status()}`).toBeTruthy();
      expect(await recentNames()).toContain(NOTES.name);

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
      expect(await recentNames()).not.toContain(NOTES.name);
      const page = await accountPage(browser);
      await page.goto("/recently-used");
      await expect(
        page.getByRole("heading", { level: 1, name: "Recently Used" })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: NOTES.name, exact: true })
      ).toHaveCount(0);

      await clearOverrides(userId);
      expect(await recentNames()).toContain(NOTES.name);
      await page.reload();
      await expect(
        page.getByRole("heading", { name: NOTES.name, exact: true })
      ).toBeVisible();
      await page.context().close();
    }
  );

  test(
    "SSO into a revoked app is denied, and allowed again after reset",
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
    "an admin-only app granted to the user shows in /apps and lets SSO through",
    { tag: ["@TC-APPS-062", "@TC-OIDC-051"] },
    async ({ browser }) => {
      const page = await accountPage(browser);
      await page.goto("/apps");
      await expect(cardTitle(page, "Blog")).toBeVisible();
      await expect(cardTitle(page, OPS.name)).toHaveCount(0);
      expect(await authorizeLocation(page, OPS)).toContain(
        "error=access_denied"
      );

      await setAccess([{ userId, appId: appIds[OPS.name], granted: true }]);
      await page.reload();
      await expect(cardTitle(page, OPS.name)).toBeVisible();
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
    const res = await api.get("/api/v1/notifications");
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
    "revoking and restoring an app tells the user both times",
    { tag: "@TC-ADMENT-040" },
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
      await page.goto("/notifications");
      await expect(
        page.getByText(`You no longer have access to ${NOTES.name}.`).first()
      ).toBeVisible();
      const granted = page
        .getByRole("link")
        .filter({ hasText: `You can now open ${NOTES.name}.` })
        .first();
      await expect(granted).toHaveAttribute(
        "href",
        `/apps?search=${NOTES.name}`
      );
      await page.context().close();
    }
  );

  test(
    "saving the value the user already has sends nothing [DT]",
    { tag: "@TC-ADMENT-041" },
    async () => {
      const notesBefore = await idsOf(NOTES.name);
      const opsBefore = await idsOf(OPS.name);

      await setAccess([{ userId, appId: appIds[NOTES.name], granted: true }]);
      await setAccess([{ userId, appId: appIds[OPS.name], granted: false }]);
      // Give the queue the time a real row would have taken to land.
      await new Promise((resolve) => setTimeout(resolve, 2_000));

      expect(await newTypes(NOTES.name, notesBefore)).toEqual([]);
      expect(await newTypes(OPS.name, opsBefore)).toEqual([]);
    }
  );
});
