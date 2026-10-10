import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  USER_EMAIL,
  clearOverrides,
  getAppIdsByName,
  getUserIdByEmail,
  setAccess,
  userToken
} from "../helpers/entitlements";
import { getFavoriteIds, setFavorites } from "../helpers/favorites";
import { fetchNotifications } from "../helpers/notifications";

// Access control seen by a regular user (`chromium` project, user@test.com,
// role `user`). Overrides are written through the admin API in each test and
// removed in afterEach, so the seed user is back on the role default for the
// next suite. Design matrix rows 3 (API authz), 7, 11b — docs/specs/access-control.
//
// Seeded catalog (server/src/database/seeders/data/web-apps.ts): Notes is
// active and [user]; Operations Console is active and [admin].

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

let userId: string;
let appIds: Record<string, string>;
let originalFavorites: string[];

test.beforeAll(async () => {
  userId = await getUserIdByEmail(USER_EMAIL);
  appIds = await getAppIdsByName();
  originalFavorites = await getFavoriteIds();
  await clearOverrides(userId);
});

test.afterEach(async () => {
  await clearOverrides(userId);
});

test.afterAll(async () => {
  await clearOverrides(userId);
  await setFavorites(originalFavorites);
});

test.describe("Access control — revoke", () => {
  test("a revoked app leaves /apps and comes back once the override is removed", async ({
    page
  }) => {
    await page.goto("/apps");
    await expect(cardTitle(page, NOTES.name)).toBeVisible();

    await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
    await page.reload();
    await expect(cardTitle(page, "Blog")).toBeVisible();
    await expect(cardTitle(page, NOTES.name)).toHaveCount(0);

    await clearOverrides(userId);
    await page.reload();
    await expect(cardTitle(page, NOTES.name)).toBeVisible();
  });

  test("searching /apps for a revoked app finds nothing", async ({ page }) => {
    await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
    await page.goto("/apps?search=Notes");
    await expect(cardTitle(page, NOTES.name)).toHaveCount(0);
  });

  test("a revoked favorite is hidden, not deleted, and returns on re-grant", async ({
    page
  }) => {
    await setFavorites([appIds[NOTES.name]]);
    await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);

    await page.goto("/favorites");
    await expect(cardTitle(page, NOTES.name)).toHaveCount(0);
    expect(await getFavoriteIds()).toEqual([]);

    await clearOverrides(userId);
    await page.reload();
    await expect(cardTitle(page, NOTES.name)).toBeVisible();
  });

  test("SSO into a revoked app is denied, and allowed again after reset", async ({
    page
  }) => {
    await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
    expect(await authorizeLocation(page, NOTES)).toContain(
      "error=access_denied"
    );

    await clearOverrides(userId);
    expect(await authorizeLocation(page, NOTES)).toContain(
      `${NOTES.redirectUri}?code=`
    );
  });
});

test.describe("Access control — grant beyond the role", () => {
  test("an admin-only app granted to the user shows in /apps and lets SSO through", async ({
    page
  }) => {
    await page.goto("/apps");
    await expect(cardTitle(page, "Blog")).toBeVisible();
    await expect(cardTitle(page, OPS.name)).toHaveCount(0);
    expect(await authorizeLocation(page, OPS)).toContain("error=access_denied");

    await setAccess([{ userId, appId: appIds[OPS.name], granted: true }]);
    await page.reload();
    await expect(cardTitle(page, OPS.name)).toBeVisible();
    expect(await authorizeLocation(page, OPS)).toContain(
      `${OPS.redirectUri}?code=`
    );
  });
});

// Design §9: a flip of effective access writes ENTITLEMENT_GRANTED / _REVOKED
// for the user, through the notification queue — so rows are polled for.
test.describe("Access control — notifications", () => {
  // Only the entitlement rows: the helper's own first API login may still be
  // delivering an "unusual sign-in" row of its own.
  const newRows = async (before: Set<string>) =>
    (await fetchNotifications()).filter(
      (row) => !before.has(row.id) && row.type.startsWith("ENTITLEMENT_")
    );

  const rowIds = async () =>
    new Set((await fetchNotifications()).map((row) => row.id));

  test("revoking and restoring an app tells the user both times", async ({
    page
  }) => {
    const before = await rowIds();

    await setAccess([{ userId, appId: appIds[NOTES.name], granted: false }]);
    await expect
      .poll(async () => (await newRows(before)).map((row) => row.type))
      .toEqual(["ENTITLEMENT_REVOKED"]);

    await clearOverrides(userId);
    await expect
      .poll(async () => (await newRows(before)).map((row) => row.type))
      .toEqual(["ENTITLEMENT_GRANTED", "ENTITLEMENT_REVOKED"]);

    await page.goto("/notifications");
    await expect(
      page.getByText(`You no longer have access to ${NOTES.name}.`).first()
    ).toBeVisible();
    const granted = page
      .getByRole("link")
      .filter({ hasText: `You can now open ${NOTES.name}.` })
      .first();
    await expect(granted).toHaveAttribute("href", `/apps?search=${NOTES.name}`);
  });

  test("saving the value the user already has sends nothing", async () => {
    const before = await rowIds();

    await setAccess([{ userId, appId: appIds[NOTES.name], granted: true }]);
    await setAccess([{ userId, appId: appIds[OPS.name], granted: false }]);
    // Give the queue the time a real row would have taken to land.
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    expect(await newRows(before)).toEqual([]);
  });
});

test.describe("Access control — API authz", () => {
  test("a regular user gets 403 from the admin entitlement API", async ({
    request
  }) => {
    const headers = { Authorization: `Bearer ${await userToken()}` };

    const read = await request.get("/api/v1/admin/entitlements", {
      headers,
      params: { userIds: userId }
    });
    expect(read.status()).toBe(403);

    const write = await request.patch("/api/v1/admin/entitlements", {
      headers,
      data: { changes: [{ userId, appId: appIds[OPS.name], granted: true }] }
    });
    expect(write.status()).toBe(403);
  });

  test("no token gets 401", async ({ request }) => {
    const res = await request.get("/api/v1/admin/entitlements", {
      params: { userIds: userId }
    });
    expect(res.status()).toBe(401);
  });
});
