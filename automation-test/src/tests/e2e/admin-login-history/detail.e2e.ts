import { test, expect } from "@/fixtures";
import { adminLoginHistoryRoutes } from "@/api/admin-login-history.client";
import { copy, copyVi } from "@/data/copy";
import { AdminLoginHistoryDetailPage } from "@/pages/admin/admin-login-history-detail.page";
import { AdminLoginHistoryPage } from "@/pages/admin/admin-login-history.page";
import { createAccount } from "@/utils/accounts";
import { ensureFailedAttempt } from "@/utils/login-history";
import { FAILED_RECORD, failDetail, STUB_ID, stubDetail } from "./helpers";

test.use({ role: "admin" });

// Admin login-history detail (REQ-ADMINLOGINHISTORY-02) — opening an entry from the
// list and every state of the detail page. Runs as admin (role fixture); the
// guest case takes `guestPage`. Read-only apart from one
// throwaway's failed sign-in; `page.route` only stubs responses. The admin session's own sign-in (setup
// project) guarantees the list has at least one row to open.
// Test cases: test-cases/admin-login-history.md.
//
// Each list row is a link whose accessible name is
// loginHistory.table.viewDetailFor ("View details for {name}" /
// vi "Xem chi tiết cho {name}").

const t = copy.loginHistory.admin.detail;
const UNKNOWN_ID = "000000000000000000000000";
const MALFORMED_ID = "not-a-valid-id";

test.describe("Admin Login History — list + detail", () => {
  // Row 1 Happy + deep-link [EP: id = 24-hex ObjectID of an existing record].
  test(
    "Clicking a row opens its detail page",
    { tag: ["@TC-ADMINLOGINHISTORY-010", "@smoke"] },
    async ({
      adminLoginHistoryPage: list,
      adminLoginHistoryDetailPage: detail,
      page
    }) => {
      await list.goto();
      await expect(list.firstRowLink()).toBeVisible();
      await list.firstRowLink().click();
      await page.waitForURL(detail.urlPattern());
      await expect(detail.heading()).toBeVisible();
      await expect(detail.fieldLabel(t.fields.ip)).toBeVisible();
    }
  );

  test(
    "A detail URL can be opened directly",
    { tag: "@TC-ADMINLOGINHISTORY-011" },
    async ({
      adminLoginHistoryPage: list,
      adminLoginHistoryDetailPage: detail,
      page
    }) => {
      await list.goto();
      await expect(list.firstRowLink()).toBeVisible();
      await list.firstRowLink().click();
      await page.waitForURL(detail.urlPattern());
      const url = page.url();
      await list.goto();
      await page.goto(url);
      await expect(detail.heading()).toBeVisible();
    }
  );

  test(
    "Each row is a named link to its detail",
    { tag: "@TC-ADMINLOGINHISTORY-012" },
    async ({ adminLoginHistoryPage: list }) => {
      await list.goto();
      const link = list.firstRowLink();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute(
        "href",
        /\/admin\/login-history\/[a-f0-9]{24}$/
      );
    }
  );

  // Row 8 Data rendering [DT: localized/formatted, never raw enums/bools/ISO].
  // Stubbed for determinism so the assertions hold regardless of seed data.
  test(
    "Detail values render as labels",
    { tag: "@TC-ADMINLOGINHISTORY-015" },
    async ({ adminLoginHistoryDetailPage: detail, page }) => {
      await stubDetail(page, FAILED_RECORD);
      await detail.goto(STUB_ID);
      await expect(detail.heading()).toBeVisible();
      // status: localized label "Failed", never the raw "failed" enum.
      await expect(
        detail.text(copy.loginHistory.status.failed, true).first()
      ).toBeVisible();
      await expect(detail.text("failed", true)).toHaveCount(0);
      // method: localized "Password", never the raw "password" enum.
      await expect(
        detail.text(copy.loginHistory.method.password, true).first()
      ).toBeVisible();
      await expect(detail.text("password", true)).toHaveCount(0);
      // isAnomaly: "Yes"/"No" label, never a boolean literal.
      await expect(detail.text("true", true)).toHaveCount(0);
      await expect(detail.text("false", true)).toHaveCount(0);
      // createdAt: humanized via formatDateTimeMedium — no ISO timestamp leaks.
      await expect(detail.text(/\dT\d.*Z/)).toHaveCount(0);
    }
  );

  // Row 5 Empty/null [DT: null→hide · present→show · empty[]→"None"].
  test(
    "Empty fields are hidden",
    { tag: "@TC-ADMINLOGINHISTORY-016" },
    async ({ adminLoginHistoryDetailPage: detail, page }) => {
      await stubDetail(page, {
        ...FAILED_RECORD,
        userId: null,
        failReason: "INVALID_CREDENTIALS",
        timezoneOffset: null,
        anomalyReasons: [],
        status: "failed"
      });
      await detail.goto(STUB_ID);
      await expect(detail.heading()).toBeVisible();
      // failReason value present.
      await expect(detail.text("INVALID_CREDENTIALS")).toBeVisible();
      // userId field label absent (conditional render `data.userId &&`).
      await expect(detail.fieldLabel(t.fields.userId)).toHaveCount(0);
      // timezoneOffset field label absent (`data.timezoneOffset &&`).
      await expect(detail.fieldLabel(t.fields.timezoneOffset)).toHaveCount(0);
      // empty anomalyReasons → "None" (loginHistory.admin.detail.anomalyNone).
      await expect(detail.text(t.anomalyNone, true)).toBeVisible();
      // failed status → "Failed" badge (warning variant).
      await expect(
        detail.text(copy.loginHistory.status.failed, true).first()
      ).toBeVisible();
    }
  );

  // Row 4 EP [LOCAL / UNKNOWN sentinels] + Row 9 i18n. The detail must show
  // the localized label, never the raw sentinel string.
  test.describe(
    "Local and unknown locations get labels",
    { tag: "@TC-ADMINLOGINHISTORY-017" },
    () => {
      // Loopback/private login → BE emits country=city="LOCAL" + normalized ip.
      test("country=LOCAL renders the localized Local label, not the raw sentinel (en)", async ({
        adminLoginHistoryDetailPage: detail,
        page
      }) => {
        await stubDetail(page, {
          ...FAILED_RECORD,
          country: "LOCAL",
          city: "LOCAL",
          ip: "127.0.0.1"
        });
        await detail.goto(STUB_ID);
        await expect(detail.heading()).toBeVisible();
        await expect(
          detail.text(copy.loginHistory.location.local, true)
        ).toBeVisible();
        await expect(detail.text("LOCAL", true)).toHaveCount(0);
        await expect(detail.text("127.0.0.1")).toBeVisible();
      });

      // Public IP with a geoip miss → country=city="UNKNOWN", its own label.
      test("country=UNKNOWN renders the localized Unknown label, not the raw sentinel (en)", async ({
        adminLoginHistoryDetailPage: detail,
        page
      }) => {
        await stubDetail(page, {
          ...FAILED_RECORD,
          country: "UNKNOWN",
          city: "UNKNOWN"
        });
        await detail.goto(STUB_ID);
        await expect(detail.heading()).toBeVisible();
        await expect(
          detail.text(copy.loginHistory.location.unknown, true)
        ).toBeVisible();
        await expect(detail.text("UNKNOWN", true)).toHaveCount(0);
      });

      test("country=LOCAL renders the vi label 'Nội bộ (Local)', not the raw sentinel", async ({
        page
      }) => {
        const detail = new AdminLoginHistoryDetailPage(page, copyVi, "/vi");
        await stubDetail(page, {
          ...FAILED_RECORD,
          country: "LOCAL",
          city: "LOCAL",
          ip: "127.0.0.1"
        });
        await detail.goto(STUB_ID);
        await expect(
          detail.text(copyVi.loginHistory.location.local, true)
        ).toBeVisible();
        await expect(detail.text("LOCAL", true)).toHaveCount(0);
      });
    }
  );

  // Row 4 Validation [BVA: non-ObjectID → 400 → notFound branch].
  test(
    'A malformed id shows "not found"',
    { tag: "@TC-ADMINLOGINHISTORY-018" },
    async ({ adminLoginHistoryDetailPage: detail }) => {
      await detail.goto(MALFORMED_ID);
      await expect(detail.notFound()).toBeVisible();
    }
  );

  // Row 10 valid-but-missing id → 404 → notFound branch.
  test(
    'An unknown id shows "not found"',
    { tag: "@TC-ADMINLOGINHISTORY-019" },
    async ({ adminLoginHistoryDetailPage: detail }) => {
      await detail.goto(UNKNOWN_ID);
      await expect(detail.notFound()).toBeVisible();
    }
  );

  test.describe(
    "A failed load shows the error state",
    { tag: "@TC-ADMINLOGINHISTORY-020" },
    () => {
      // Row 10 Error [Error Guessing: 500]. 5xx → t("error"), distinct from notFound.
      test("a detail API failure shows the error UI", async ({
        adminLoginHistoryDetailPage: detail,
        page
      }) => {
        await failDetail(page);
        await detail.goto(UNKNOWN_ID);
        await expect(detail.loadError().first()).toBeVisible();
      });

      // Row 10 network abort [Error Guessing: abort]. route.abort() is a
      // network error (no HTTP response). The axios response interceptor
      // surfaces a BLOCKING confirm-toast ("Unable to connect to server…",
      // duration Infinity + OK action) and only rejects the request once OK
      // is clicked. After dismissal the query rejects (retry returns false
      // for no-response) and the card renders the error UI.
      test("network abort shows the network-error toast then the error UI", async ({
        adminLoginHistoryDetailPage: detail,
        page
      }) => {
        await page.route(adminLoginHistoryRoutes.detail, (route) =>
          route.abort()
        );
        await detail.goto(STUB_ID);
        await expect(detail.networkErrorToast()).toBeVisible();
        await detail.toastOkButton().click();
        await expect(detail.loadError().first()).toBeVisible();
      });
    }
  );

  // Row 10 loading [Error Guessing: delayed-response]. Delayed route → skeleton
  // visible before data arrives, then replaced by the heading.
  test(
    "A skeleton shows while the detail loads",
    { tag: "@TC-ADMINLOGINHISTORY-021" },
    async ({ adminLoginHistoryDetailPage: detail, page }) => {
      await page.route(adminLoginHistoryRoutes.detail, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            path: adminLoginHistoryRoutes.listPath,
            message: "ok",
            data: FAILED_RECORD
          })
        });
      });
      await detail.goto(STUB_ID);
      await expect(detail.skeleton().first()).toBeVisible();
      await expect(detail.heading()).toBeVisible();
      await expect(detail.skeleton()).toHaveCount(0);
    }
  );

  test.describe(
    "Vietnamese detail, not-found and error",
    { tag: "@TC-ADMINLOGINHISTORY-022" },
    () => {
      // Row 9 i18n (vi): row link "Xem chi tiết cho …" + field "Địa chỉ IP".
      test("vi locale renders the translated action label and detail labels", async ({
        page
      }) => {
        const list = new AdminLoginHistoryPage(page, copyVi, "/vi");
        const detail = new AdminLoginHistoryDetailPage(page, copyVi, "/vi");
        await list.goto();
        await expect(list.firstRowLink()).toBeVisible();
        await list.firstRowLink().click();
        await page.waitForURL(/\/vi\/admin\/login-history\/[a-f0-9]{24}/);
        await expect(
          detail.fieldLabel(copyVi.loginHistory.admin.detail.fields.ip)
        ).toBeVisible();
      });

      // vi not-found + error strings render in Vietnamese, no raw keys leak.
      test("vi locale renders translated not-found and error strings", async ({
        page
      }) => {
        const detail = new AdminLoginHistoryDetailPage(page, copyVi, "/vi");
        // not-found: invalid id → 400 → notFound branch.
        await detail.goto(MALFORMED_ID);
        await expect(detail.notFound().first()).toBeVisible();
        await expect(detail.text(/loginHistory\.admin\.detail/)).toHaveCount(0);

        // error: 5xx → error branch.
        await failDetail(page);
        await detail.goto(UNKNOWN_ID);
        await expect(detail.loadError().first()).toBeVisible();
      });
    }
  );

  // Row 12 a11y keyboard activation [State Transition: focus → Enter → navigate].
  test(
    "A row opens from the keyboard",
    { tag: "@TC-ADMINLOGINHISTORY-023" },
    async ({
      adminLoginHistoryPage: list,
      adminLoginHistoryDetailPage: detail,
      page
    }) => {
      await list.goto();
      const link = list.firstRowLink();
      await expect(link).toBeVisible();
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await page.waitForURL(detail.urlPattern());
      await expect(detail.heading()).toBeVisible();
    }
  );

  // Row 12 [State Transition: list?query -> row link -> back -> query kept].
  test(
    "Back returns to the filtered list",
    { tag: "@TC-ADMINLOGINHISTORY-024" },
    async ({
      adminLoginHistoryPage: list,
      adminLoginHistoryDetailPage: detail,
      page,
      adminApi,
      guestApi
    }) => {
      await ensureFailedAttempt(
        adminApi,
        guestApi,
        await createAccount({ tag: "adm-loghist-back" })
      );
      await list.goto("?status=failed&page=1");
      await expect(list.firstRowLink()).toBeVisible();
      await list.firstRowLink().click();
      await page.waitForURL(detail.urlPattern());
      await page.goBack();
      await expect(page).toHaveURL(/[?&]status=failed(&|$)/);
      await expect(page).toHaveURL(/[?&]page=1(&|$)/);
    }
  );

  // [ST] detail → breadcrumb → list (the other way back besides Back).
  test(
    "The breadcrumb leads back to the list",
    { tag: "@TC-ADMINLOGINHISTORY-047" },
    async ({
      adminLoginHistoryPage: list,
      adminLoginHistoryDetailPage: detail,
      page
    }) => {
      await stubDetail(page, FAILED_RECORD);
      await detail.goto(STUB_ID);
      await expect(detail.heading()).toBeVisible();
      await detail.breadcrumbListLink().click();
      await expect(page).toHaveURL(/\/admin\/login-history$/);
      await expect(list.heading()).toBeVisible();
    }
  );

  // Row 12 a11y announce-on-load. LoginHistoryDetailCard fires useAnnounce on
  // load → #announcer (aria-live="polite", root layout) is populated.
  test(
    "The loaded detail is announced",
    { tag: "@TC-ADMINLOGINHISTORY-025" },
    async ({ adminLoginHistoryDetailPage: detail, page }) => {
      await stubDetail(page, FAILED_RECORD);
      await detail.goto(STUB_ID);
      await expect(detail.heading()).toBeVisible();
      const announcer = detail.announcer.region();
      await expect(announcer).not.toBeEmpty();
      await expect(announcer).toContainText(t.announce.loaded);
    }
  );
});

test.describe("Admin Login History — auth", () => {
  // Row 2 AuthN [State Transition: unauth → guard → /login].
  test(
    "A guest is sent to sign in",
    { tag: ["@TC-ADMINLOGINHISTORY-026", "@smoke"] },
    async ({ guestPage }) => {
      await new AdminLoginHistoryDetailPage(guestPage).goto(UNKNOWN_ID);
      await expect(guestPage).toHaveURL(/\/login/);
    }
  );
});

// Non-admin access (old row 3, role × route) is proven over HTTP in
// tests/api/admin-login-history/login-history.api.ts (TC-ADMINLOGINHISTORY-034).
