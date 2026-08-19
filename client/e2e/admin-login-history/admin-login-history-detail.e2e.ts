import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  USER_EMAIL as NON_ADMIN_EMAIL,
  USER_PASSWORD as NON_ADMIN_PASSWORD
} from "../helpers/env";

// Read-only admin feature. Runs under the `admin` Playwright project
// (playwright.config.ts maps `admin-login-history/` → `admin` project with
// storageState `e2e/.auth/admin.json`, dependency `admin-setup`). admin.setup's
// admin login records ≥1 login_histories row, so the list is non-empty and the
// first View button is clickable. No data is mutated — no revert needed. Every
// `page.route` below only stubs responses; nothing touches the DB.

const DETAIL_RE = /\/admin\/login-history\/[a-f0-9]{24}/;

// Deterministic record used by the data-render / empty-null / loading tests.
// Stubbed via page.route so assertions don't depend on seed contents.
const VALID_ID = "0123456789abcdef01234567";
const detailUrl = (id: string) => `/admin/login-history/${id}`;

const FAILED_RECORD = {
  _id: VALID_ID,
  method: "password",
  status: "failed",
  failReason: "INVALID_CREDENTIALS",
  ip: "203.0.113.9",
  country: "Vietnam",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 10",
  browser: "Chrome 120",
  clientType: "web",
  userAgent: "Mozilla/5.0 (Windows NT 10.0)",
  createdAt: "2026-01-15T08:30:00.000Z",
  userId: "64b7f0c2e1a2b3c4d5e6f7a8",
  usernameAttempted: "victim@test.com",
  timezoneOffset: "+07:00",
  isAnomaly: true,
  anomalyReasons: ["new_device", "new_country"]
};

const fulfillDetail = (page: Page, body: Record<string, unknown>) =>
  page.route("**/api/v1/admin/login-history/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        path: "/api/v1/admin/login-history",
        message: "ok",
        data: body
      })
    })
  );

const openFirstDetail = async (page: Page) => {
  await page.goto("/admin/login-history");
  const viewButton = page.getByRole("button", { name: /view|xem/i }).first();
  await expect(viewButton).toBeVisible();
  await viewButton.click();
  await page.waitForURL(DETAIL_RE);
};

test.describe("Admin Login History — list + detail", () => {
  // Row 1 Happy + deep-link [EP: id = 24-hex ObjectID of an existing record].
  test("admin opens the list, clicks View, and the detail page renders", async ({
    page
  }) => {
    await openFirstDetail(page);
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    await expect(page.getByText("IP Address", { exact: true })).toBeVisible();
  });

  test("deep-linking directly to a detail URL renders the record", async ({
    page
  }) => {
    await openFirstDetail(page);
    const url = page.url();
    await page.goto("/admin/login-history");
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
  });

  test("the View action is a button with an accessible name", async ({
    page
  }) => {
    await page.goto("/admin/login-history");
    const viewButton = page.getByRole("button", { name: /view/i }).first();
    await expect(viewButton).toBeVisible();
  });

  // Row 8 Data rendering [DT: localized/formatted, never raw enums/bools/ISO].
  // Stubbed for determinism so the assertions hold regardless of seed data.
  test("detail renders localized/formatted values, not raw enums", async ({
    page
  }) => {
    await fulfillDetail(page, FAILED_RECORD);
    await page.goto(detailUrl(VALID_ID));
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    // status: localized label "Failed", never the raw "failed" enum.
    await expect(
      page.getByText("Failed", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("failed", { exact: true })).toHaveCount(0);
    // method: localized "Password", never the raw "password" enum.
    await expect(
      page.getByText("Password", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText("password", { exact: true })).toHaveCount(0);
    // isAnomaly: "Yes"/"No" label, never a boolean literal.
    await expect(page.getByText("true", { exact: true })).toHaveCount(0);
    await expect(page.getByText("false", { exact: true })).toHaveCount(0);
    // createdAt: humanized via formatDateTimeMedium — no ISO timestamp leaks.
    await expect(page.getByText(/\dT\d.*Z/)).toHaveCount(0);
  });

  // Row 5 Empty/null [DT: null→hide · present→show · empty[]→"None"].
  // Stubbed (no guaranteed failed-login seed row) — moved from deferred to
  // covered via page.route.
  test("null userId/timezoneOffset are hidden; failReason shown; anomaly None; warning badge", async ({
    page
  }) => {
    await fulfillDetail(page, {
      ...FAILED_RECORD,
      userId: null,
      failReason: "INVALID_CREDENTIALS",
      timezoneOffset: null,
      anomalyReasons: [],
      status: "failed"
    });
    await page.goto(detailUrl(VALID_ID));
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    // failReason value present.
    await expect(page.getByText("INVALID_CREDENTIALS")).toBeVisible();
    // userId field label absent (conditional render `data.userId &&`).
    await expect(page.getByText("User ID", { exact: true })).toHaveCount(0);
    // timezoneOffset field label absent (`data.timezoneOffset &&`).
    // Label literal "Timezone" per loginHistory.admin.detail.fields.timezoneOffset.
    await expect(page.getByText("Timezone", { exact: true })).toHaveCount(0);
    // empty anomalyReasons → "None" (loginHistory.admin.detail.anomalyNone).
    await expect(page.getByText("None", { exact: true })).toBeVisible();
    // failed status → "Failed" badge (warning variant).
    await expect(
      page.getByText("Failed", { exact: true }).first()
    ).toBeVisible();
  });

  // Row 4 EP [country="LOCAL"] + Row 8 DT [city sentinel → country-label only] +
  // Row 9 i18n (en). Loopback/private login → BE emits country=city="LOCAL" +
  // normalized ip. Detail must show the localized "Local" label, never the raw
  // sentinel string, and the normalized loopback IP.
  test("country=LOCAL renders the localized Local label, not the raw sentinel (en)", async ({
    page
  }) => {
    await fulfillDetail(page, {
      ...FAILED_RECORD,
      country: "LOCAL",
      city: "LOCAL",
      ip: "127.0.0.1"
    });
    await page.goto(detailUrl(VALID_ID));
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    await expect(page.getByText("Local", { exact: true })).toBeVisible();
    await expect(page.getByText("LOCAL", { exact: true })).toHaveCount(0);
    await expect(page.getByText("127.0.0.1")).toBeVisible();
  });

  // Row 4 EP [country="UNKNOWN"] + Row 8 DT + Row 9 i18n (en). Public IP with a
  // real geoip miss → BE emits country=city="UNKNOWN". Distinct sentinel from
  // LOCAL — must map to its own localized label, never the raw enum.
  test("country=UNKNOWN renders the localized Unknown label, not the raw sentinel (en)", async ({
    page
  }) => {
    await fulfillDetail(page, {
      ...FAILED_RECORD,
      country: "UNKNOWN",
      city: "UNKNOWN"
    });
    await page.goto(detailUrl(VALID_ID));
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    await expect(page.getByText("Unknown", { exact: true })).toBeVisible();
    await expect(page.getByText("UNKNOWN", { exact: true })).toHaveCount(0);
  });

  // Row 4 EP [country="LOCAL"] + Row 9 i18n (vi). Same LOCAL stub under the vi
  // locale — label must be the vi translation "Nội bộ (Local)", never the raw
  // "LOCAL" sentinel.
  test("country=LOCAL renders the vi label 'Nội bộ (Local)', not the raw sentinel", async ({
    page
  }) => {
    await fulfillDetail(page, {
      ...FAILED_RECORD,
      country: "LOCAL",
      city: "LOCAL",
      ip: "127.0.0.1"
    });
    await page.goto(`/vi${detailUrl(VALID_ID)}`);
    await expect(
      page.getByText("Nội bộ (Local)", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("LOCAL", { exact: true })).toHaveCount(0);
  });

  // Row 4 Validation [BVA: non-ObjectID "not-a-valid-id" → 400 → notFound branch].
  test("an invalid id shows the not-found UI", async ({ page }) => {
    await page.goto("/admin/login-history/not-a-valid-id");
    await expect(
      page.getByText(/Login history record not found/i)
    ).toBeVisible();
  });

  // Row 10 valid-but-missing id → 404 → notFound branch.
  test("a valid-but-missing id shows the not-found UI", async ({ page }) => {
    await page.goto("/admin/login-history/000000000000000000000000");
    await expect(
      page.getByText(/Login history record not found/i)
    ).toBeVisible();
  });

  // Row 10 Error [Error Guessing: 500]. 5xx → t("error"), distinct from notFound.
  test("a detail API failure shows the error UI", async ({ page }) => {
    await page.route("**/api/v1/admin/login-history/*", (route) =>
      route.fulfill({ status: 500, body: "{}" })
    );
    await page.goto("/admin/login-history/000000000000000000000000");
    await expect(
      page.getByText(/Could not load this login record/i).first()
    ).toBeVisible();
  });

  // Row 10 loading [Error Guessing: delayed-response]. Delayed route → skeleton
  // (animate-pulse) visible before data arrives, then replaced by the heading.
  test("loading skeleton shows before detail data arrives", async ({
    page
  }) => {
    await page.route("**/api/v1/admin/login-history/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/admin/login-history",
          message: "ok",
          data: FAILED_RECORD
        })
      });
    });
    await page.goto(detailUrl(VALID_ID));
    await expect(page.locator(".animate-pulse").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    await expect(page.locator(".animate-pulse")).toHaveCount(0);
  });

  // Row 10 network abort [Error Guessing: abort]. route.abort() is a network
  // error (no HTTP response), distinct from the 500 retry path. The axios
  // response interceptor surfaces a BLOCKING confirm-toast ("Unable to connect
  // to server…", duration Infinity + OK action) and only rejects the request
  // once OK is clicked — so the detail query stays in its loading state until
  // the toast is dismissed. After dismissal the query rejects (retry returns
  // false for no-response) and the card renders the error UI. We assert that
  // real flow: network-error toast → dismiss → error card.
  test("network abort shows the network-error toast then the error UI", async ({
    page
  }) => {
    await page.route("**/api/v1/admin/login-history/*", (route) =>
      route.abort()
    );
    await page.goto(detailUrl(VALID_ID));
    // Network-error confirm-toast is the user-observable abort signal.
    await expect(page.getByText(/Unable to connect to server/i)).toBeVisible();
    // Dismiss the blocking toast → axios rejects → query surfaces isError.
    await page.getByRole("button", { name: /^OK$/ }).click();
    await expect(
      page.getByText(/Could not load this login record/i).first()
    ).toBeVisible();
  });

  // Row 9 i18n (en+vi labels). vi action label "Xem" + field "Địa chỉ IP".
  test("vi locale renders the translated action label and detail labels", async ({
    page
  }) => {
    await page.goto("/vi/admin/login-history");
    const viewButton = page.getByRole("button", { name: /xem/i }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await page.waitForURL(/\/vi\/admin\/login-history\/[a-f0-9]{24}/);
    await expect(page.getByText("Địa chỉ IP", { exact: true })).toBeVisible();
  });

  // Row 9 i18n depth (vi). vi not-found + error strings render in Vietnamese,
  // no raw i18n keys leak.
  test("vi locale renders translated not-found and error strings", async ({
    page
  }) => {
    // not-found: invalid id → 400 → notFound branch.
    await page.goto("/vi/admin/login-history/not-a-valid-id");
    await expect(
      page.getByText(/Không tìm thấy bản ghi lịch sử đăng nhập/i).first()
    ).toBeVisible();
    await expect(page.getByText(/loginHistory\.admin\.detail/)).toHaveCount(0);

    // error: 5xx → error branch.
    await page.route("**/api/v1/admin/login-history/*", (route) =>
      route.fulfill({ status: 500, body: "{}" })
    );
    await page.goto("/vi/admin/login-history/000000000000000000000000");
    await expect(
      page.getByText(/Không thể tải bản ghi đăng nhập này/i).first()
    ).toBeVisible();
  });

  // Row 12 a11y keyboard activation [State Transition: focus → Enter → navigate].
  test("View action is keyboard-activatable (focus + Enter navigates)", async ({
    page
  }) => {
    await page.goto("/admin/login-history");
    const viewButton = page.getByRole("button", { name: /view|xem/i }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.focus();
    await expect(viewButton).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForURL(DETAIL_RE);
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
  });

  // Row 12 a11y back-preserves-filter [State Transition: list?query → View →
  // back → query retained]. View is a <CustomButton> (router.push), not an
  // <a href>; back still works because the list URL stays in the history stack.
  //
  // A11Y FOLLOW-UP (flagged, NOT fixed in test): the View action is a
  // <button> + router.push, not a next-intl <Link href>, so it lacks native
  // link affordances (middle-click / open-in-new-tab / right-click). Consider
  // switching to <Link href> as a follow-up. App code is NOT modified here.
  test("navigating back from detail preserves the list query string", async ({
    page
  }) => {
    await page.goto("/admin/login-history?status=failed&page=1");
    const viewButton = page.getByRole("button", { name: /view|xem/i }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await page.waitForURL(DETAIL_RE);
    await page.goBack();
    await expect(page).toHaveURL(/[?&]status=failed(&|$)/);
    await expect(page).toHaveURL(/[?&]page=1(&|$)/);
  });

  // Row 12 a11y announce-on-load (CF-4). LoginHistoryDetailCard fires
  // useAnnounce on load → #announcer (aria-live="polite", root layout) is
  // populated. CF-4 is implemented (announce.loaded = "Login attempt detail
  // loaded"). Stubbed for a deterministic success render.
  test("detail load announces to the #announcer live region", async ({
    page
  }) => {
    await fulfillDetail(page, FAILED_RECORD);
    await page.goto(detailUrl(VALID_ID));
    await expect(
      page.getByRole("heading", { name: /Login Attempt Detail/i })
    ).toBeVisible();
    const announcer = page.locator("#announcer");
    await expect(announcer).not.toBeEmpty();
    await expect(announcer).toContainText(/Login attempt detail loaded/i);
  });
});

test.describe("Admin Login History — auth", () => {
  // Row 2 AuthN [State Transition: unauth → guard → /login].
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated visit to a detail URL redirects to login", async ({
    page
  }) => {
    await page.goto("/admin/login-history/000000000000000000000000");
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});

// Row 3 AuthZ [Decision Table: role=admin→allow · role=user→deny].
// Authorization for /admin/login-history/* is enforced by the BACKEND: there is
// NO FE role guard for /admin/* (confirmed in admin-authz.e2e.ts). The most
// robust, deterministic denial signal is the BE response itself — a non-admin
// Bearer on the detail API is rejected with HTTP 403 (code AUTH_ADMIN_ONLY).
//
// Why an API-level assertion (not a page walk): this suite runs under the
// `admin` project, which does NOT depend on the `setup` project, so the
// non-admin `user.json` storageState is not guaranteed fresh — in practice it
// gets contaminated by the change-password suite (refresh token rejected with
// AUTH_PASSWORD_CHANGED), which bounces the FE bootstrap to /login before the
// detail query ever fires. Driving the page would therefore be flaky and
// session-state dependent. Logging in fresh via the API request fixture and
// asserting the BE 403 is deterministic and project-independent. Mirrors the
// list-level coverage in e2e/admin-authz/admin-authz.e2e.ts (FE walk under the
// `chromium` project); this adds the detail-route denial at the contract level.
test.describe("Admin Login History — authZ (non-admin)", () => {
  // No storageState: we authenticate a fresh non-admin via the API below, so
  // this test does not depend on the (potentially stale) user.json fixture.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("non-admin is denied the login-history detail API with 403", async ({
    request
  }) => {
    const loginRes = await request.post("/api/v1/auth/login", {
      data: { email: NON_ADMIN_EMAIL, password: NON_ADMIN_PASSWORD }
    });
    expect(loginRes.ok()).toBeTruthy();
    const accessToken = (await loginRes.json()).data.accessToken as string;

    // Non-admin Bearer on the admin detail endpoint => BE 403 (AUTH_ADMIN_ONLY).
    const detailRes = await request.get(
      `/api/v1/admin/login-history/${VALID_ID}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    expect(detailRes.status()).toBe(403);
  });
});
