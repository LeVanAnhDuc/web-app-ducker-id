import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { restoreApp } from "../helpers/adminApps";

// ── Seed deps (confirm against the seed before running) ──
// TARGET_APP: a seeded ACTIVE app, category "Content", status=active.
const TARGET_APP = { name: "blog", displayName: "Blog" };
const EDITED_DISPLAY_NAME = "Blog (edited e2e)";
// A DIFFERENT seeded app whose `name` is used for the 409 conflict test. MUST be
// the `name` of an app that actually exists in the seed (see
// server/src/database/seeders/data/web-apps.ts) — otherwise renaming `blog` to it
// SUCCEEDS instead of conflicting, corrupting the seed.
const CONFLICT_NAME = "notes";
// App seeded with description=null + iconUrl=null (for the null-prefill test).
// DEFERRED below if the seed has no such app.
const NULL_APP = { name: "minimal", displayName: "Minimal" };

const rowMenu = (page: Page, displayName: string) =>
  page
    .getByRole("row", { name: displayName })
    .getByRole("button", { name: "App actions" });

const openEdit = async (page: Page, displayName: string) => {
  await rowMenu(page, displayName).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("textbox", { name: "Display Name" })
  ).toBeVisible();
};

test.describe.configure({ mode: "serial" });

test.describe("Admin Apps — edit + hide/unhide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // ── Nhóm 1 — Happy path (row #1, EXISTS — kept) ──
  test("edits an app's display name", async ({ page }) => {
    await rowMenu(page, TARGET_APP.displayName).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const displayName = page.getByRole("textbox", { name: "Display Name" });
    await expect(displayName).toBeVisible();
    await displayName.fill(EDITED_DISPLAY_NAME);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("App updated.")).toBeVisible();
    await expect(
      page.getByText(EDITED_DISPLAY_NAME, { exact: true })
    ).toBeVisible();
  });

  // ── Nhóm 2 — Hide/unhide status toggle (row #1, EXISTS — kept) ──
  test("hides then unhides an app (status toggle)", async ({ page }) => {
    await rowMenu(page, EDITED_DISPLAY_NAME).click();
    await page.getByRole("menuitem", { name: "Hide" }).click();
    await page.getByRole("button", { name: "Hide App" }).click();
    await expect(page.getByText("App hidden.")).toBeVisible();
    const row = page.getByRole("row", { name: EDITED_DISPLAY_NAME });
    await expect(row.getByText("Paused")).toBeVisible();

    await rowMenu(page, EDITED_DISPLAY_NAME).click();
    await page.getByRole("menuitem", { name: "Unhide" }).click();
    await expect(page.getByText("App reactivated.")).toBeVisible();
    await expect(row.getByText("Active")).toBeVisible();
  });

  test.afterAll(async () => {
    // restoreApp reverts displayName + status (NOT name). Name-changing tests
    // self-revert below; this guarantees the seed app is back to baseline.
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Nhóm 2 (matrix row #2) — AuthN ──
// Uses a fresh context WITHOUT the admin storageState. Cookies on localhost are
// not scoped per-port, so clear them explicitly to defeat any leaked session.
test.describe("Admin Apps — AuthN", () => {
  test("blocks unauthenticated access (UI redirect + API 401) [Error Guessing]", async ({
    browser
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.context().clearCookies();
      await page.goto("/admin/apps");
      // SessionGate / AuthGuardLayout pushes back to login without a refresh cookie.
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: "App Registry" })
      ).toHaveCount(0);

      // Direct API call without a Bearer token → 401 (guard rejects before service).
      const res = await page.request.patch(
        "/api/v1/admin/apps/000000000000000000000000",
        { data: { displayName: "x" } }
      );
      expect(res.status()).toBe(401);
    } finally {
      await ctx.close();
    }
  });
});

// ── Nhóm 3 (matrix row #3) — AuthZ ──
// Reuses the regular-user storageState (created by the `setup` project →
// e2e/.auth/user.json). NOTE: run with `--project=setup --project=admin-setup
// --project=admin` so user.json exists; the `admin` project only depends on
// `admin-setup`.
//
// Confirmed behavior (see e2e/admin-authz/admin-authz.e2e.ts): there is NO
// client-side role guard. For a logged-in non-admin the admin shell + the
// "App Registry" heading ARE server-rendered, so we do NOT assert the heading is
// absent. Authorization is enforced by the BE (403); the admin-only DATA never
// loads, so the table shows its empty state and the seeded app rows / "App
// actions" row-menu buttons never render. We assert that data-absence (stable)
// rather than the transient permission toast (flaky).

test.describe("Admin Apps — AuthZ", () => {
  test("forbids non-admin from updating apps (API 403 + admin data unreachable) [Error Guessing]", async ({
    browser
  }) => {
    const ctx = await browser.newContext({
      storageState: "e2e/.auth/user.json"
    });
    const page = await ctx.newPage();
    try {
      // (1) Direct PATCH → privilege escalation blocked at adminGuard (this is
      // the assertion that justifies the test's existence).
      // The app authenticates via `Authorization: Bearer <accessToken>` (the
      // accessToken lives in the LOGIN RESPONSE BODY; only refreshToken is a
      // cookie). With no Bearer, authGuard returns 401 BEFORE adminGuard can
      // return 403. So log in as a NON-ADMIN, grab data.accessToken, and send
      // it as a Bearer → authGuard passes, adminGuard rejects with 403.
      const loginRes = await page.request.post("/api/v1/auth/login", {
        data: { email: "user@test.com", password: "User@123" }
      });
      expect(loginRes.ok(), "non-admin login must succeed").toBeTruthy();
      const loginBody = (await loginRes.json()) as {
        data?: { accessToken?: string };
      };
      const userToken = loginBody?.data?.accessToken;
      expect(userToken, "non-admin accessToken must be present").toBeTruthy();

      const res = await page.request.patch(
        "/api/v1/admin/apps/000000000000000000000000",
        {
          headers: { Authorization: `Bearer ${userToken}` },
          data: { displayName: "x" }
        }
      );
      // Valid non-admin token on an admin route → adminGuard → 403 AUTH_ADMIN_ONLY.
      expect(res.status()).toBe(403);

      // (2) UI: the shell + heading ARE rendered (no FE guard), so assert what is
      // REAL and STABLE — the admin-only DATA never loads (the list GET 403s), so
      // the table falls back to its empty state and no app rows / row-menu buttons
      // exist. We do NOT assert the permission toast: it is transient (a sonner
      // toast that auto-dismisses) and is not reliably fired for the list GET 403,
      // so asserting it is flaky. Data-absence is the robust signal here.
      await page.goto("/admin/apps");
      await expect(
        page.getByRole("heading", { name: "App Registry" })
      ).toBeVisible();
      // The seeded app row never renders for a non-admin → no row-menu buttons.
      await expect(
        page.getByRole("button", { name: "App actions" })
      ).toHaveCount(0);
      await expect(
        page.getByRole("row", { name: TARGET_APP.displayName })
      ).toHaveCount(0);
      // The table falls back to its empty state because the admin list 403'd.
      await expect(page.getByText("No apps registered yet.")).toBeVisible();
    } finally {
      await ctx.close();
    }
  });
});

// ── Nhóm 4 — Validation (biggest gap) + Nhóm 6 boundary + select-reset ──
// All of these open the edit sheet on `blog`. Mutating tests self-revert.
// (file-scope serial mode set at the top applies to every describe below)
test.describe("Admin Apps — validation & boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // E2E-4a — [EP] per-field inline errors (no Save success → no mutation).
  test("shows inline validation errors per field [EP]", async ({ page }) => {
    await openEdit(page, TARGET_APP.displayName);

    // Worked example: empty Display Name
    const displayName = page.getByRole("textbox", { name: "Display Name" });
    await displayName.fill("");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Please enter a display name.")).toBeVisible();

    // Name forbidden char — restore Display Name so it is not the blocking error.
    await displayName.fill("Blog");
    // a11y name is "Name *" (label + required "*" span); exact avoids the
    // substring collision with "Display Name *".
    await page
      .getByRole("textbox", { name: "Name *", exact: true })
      .fill("Blog!");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Use lowercase letters, numbers, and hyphens only.")
    ).toBeVisible();

    // Home URL bad scheme
    await page
      .getByRole("textbox", { name: "Name *", exact: true })
      .fill("blog");
    await page.getByRole("textbox", { name: "Home URL" }).fill("ftp://x");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Must start with http:// or https://")
    ).toBeVisible();
    // No successful Save → no revert needed.
  });

  // E2E-4b — [DT] anti-OFAT: BOTH errors must render at once.
  test("surfaces multiple field errors simultaneously [DT] (anti-OFAT)", async ({
    page
  }) => {
    await openEdit(page, TARGET_APP.displayName);

    await page.getByRole("textbox", { name: "Display Name" }).fill("");
    await page
      .getByRole("textbox", { name: "Name *", exact: true })
      .fill("Blog!");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // BOTH must render — guards against OFAT where one error masks the other.
    await expect(page.getByText("Please enter a display name.")).toBeVisible();
    await expect(
      page.getByText("Use lowercase letters, numbers, and hyphens only.")
    ).toBeVisible();
  });

  // E2E-4c — 409 name conflict mapped to the `name` field (Gate A only — mutate attempt).
  test("maps 409 name conflict to the name field [Error Guessing]", async ({
    page
  }) => {
    await openEdit(page, TARGET_APP.displayName);
    await page
      .getByRole("textbox", { name: "Name *", exact: true })
      .fill(CONFLICT_NAME);
    await page.getByRole("button", { name: "Save Changes" }).click();
    // WEB_APP_NAME_EXISTS (409) → setError(NAME, "exists") → inline message.
    // The same copy also appears in a sonner toast, so scope to the Edit App
    // sheet to assert the INLINE field error specifically (avoid strict-mode
    // collision with the toast).
    await expect(
      page
        .getByLabel("Edit App")
        .getByText("An app with this name already exists.")
    ).toBeVisible();
    // BE rejected → no toast success; afterAll restoreApp re-asserts blog intact.
  });

  // E2E-4d — Select-reset regression guard (Gate A only — mutate).
  // Guards the known shadcn-Select RHF reset bug: changing only Display Name must
  // NOT wipe Category (CategorySelect guards `if (value) field.onChange(value)`).
  test("preserves Category when only Display Name changes [ST regression]", async ({
    page
  }) => {
    await openEdit(page, TARGET_APP.displayName);
    await expect(
      page.getByRole("combobox", { name: "Category" })
    ).toContainText("Content");
    await page
      .getByRole("textbox", { name: "Display Name" })
      .fill("Blog (select-reset e2e)");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("App updated.")).toBeVisible();

    // Reopen → Category must NOT have been wiped by the reset/onValueChange path.
    await openEdit(page, "Blog (select-reset e2e)");
    await expect(
      page.getByRole("combobox", { name: "Category" })
    ).toContainText("Content");

    // Self-revert displayName so later serial tests (e.g. the full-prefill test)
    // and openEdit(TARGET_APP.displayName) still find the row as "Blog". The
    // describe-level afterAll only runs once at the very end.
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });

  // E2E-6a — [BVA] Name length: 1 (min-1), 2 (min), 64 (max), 65 (max+1).
  test("enforces Name length boundaries [BVA]", async ({ page }) => {
    await openEdit(page, TARGET_APP.displayName);
    const name = page.getByRole("textbox", { name: "Name *", exact: true });

    // 1 (min-1) → error
    await name.fill("a");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Name must be at least 2 characters.")
    ).toBeVisible();

    // 65 (max+1) → error
    await name.fill("a".repeat(65));
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Name must not exceed 64 characters.")
    ).toBeVisible();

    // 2 (min) and 64 (max) → valid (length errors clear).
    await name.fill("ab");
    await expect(
      page.getByText("Name must be at least 2 characters.")
    ).toHaveCount(0);
    await name.fill("a".repeat(64));
    await expect(
      page.getByText("Name must not exceed 64 characters.")
    ).toHaveCount(0);
    // Leave field at original; close without a successful save → no mutation.
    await name.fill("blog");
  });

  // E2E-6b — [BVA] Display Name length: 2 (min), 80 (max), 81 (max+1).
  test("enforces Display Name length boundaries [BVA]", async ({ page }) => {
    await openEdit(page, TARGET_APP.displayName);
    const displayName = page.getByRole("textbox", { name: "Display Name" });

    // 81 (max+1) → error
    await displayName.fill("a".repeat(81));
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Display name must not exceed 80 characters.")
    ).toBeVisible();

    // 2 (min) and 80 (max) → valid (max error clears).
    await displayName.fill("ab");
    await expect(
      page.getByText("Display name must not exceed 80 characters.")
    ).toHaveCount(0);
    await displayName.fill("a".repeat(80));
    await expect(
      page.getByText("Display name must not exceed 80 characters.")
    ).toHaveCount(0);
    // Restore original; close without a successful save → no mutation.
    await displayName.fill("Blog");
  });

  // E2E-6c — [BVA] redirectUris count 21 > max(20) → inline error (CF-3 done).
  // CF-3 added FE `.max(20)` → message key `redirectUris.maxItems`. Gate A only
  // (Save attempt). We add URIs through the StringListField draft input + "Add
  // URI" button until the total reaches 21, then Save → inline error. BE rejects
  // anyway; no field mutation persists (validation blocks submit client-side).
  test("rejects more than 20 redirect URIs (CF-3) [BVA]", async ({ page }) => {
    await openEdit(page, TARGET_APP.displayName);

    // The draft input exposes aria-label = the placeholder.
    const draft = page.getByRole("textbox", {
      name: "https://app.example.com/auth/callback"
    });
    const addUri = page.getByRole("button", { name: "Add URI" });

    // Count current pills (rendered as <li> with a "Remove URI: <uri>" button).
    const removeButtons = page.getByRole("button", { name: /^Remove URI:/ });
    const current = await removeButtons.count();
    const TARGET_COUNT = 21;

    for (let i = current; i < TARGET_COUNT; i += 1) {
      await draft.fill(`https://e2e-extra-${i}.example.com/cb`);
      await addUri.click();
    }
    await expect(removeButtons).toHaveCount(TARGET_COUNT);

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("You can add at most 20 redirect URIs.")
    ).toBeVisible();
    // Client-side validation blocks submit → no PATCH → no mutation.
  });

  // E2E-8 — Data render: full prefill incl. Category human label [Decision Table].
  test("prefills every field from the selected app [Decision Table]", async ({
    page
  }) => {
    await openEdit(page, TARGET_APP.displayName);
    await expect(
      page.getByRole("textbox", { name: "Name *", exact: true })
    ).toHaveValue("blog");
    await expect(
      page.getByRole("textbox", { name: "Display Name" })
    ).toHaveValue("Blog");
    // Category renders the human label (cat.name), NOT the ObjectId.
    await expect(
      page.getByRole("combobox", { name: "Category" })
    ).toContainText("Content");
    // Home URL is prefilled (non-empty).
    await expect(
      page.getByRole("textbox", { name: "Home URL" })
    ).not.toHaveValue("");
    // Status switch reflects status=active. (No accessible name on the switch —
    // see follow-up note; there is exactly one switch in the sheet.)
    await expect(page.getByRole("switch")).toBeChecked();
    // Required Roles: at least the "User" role is checked for the seed app.
    await expect(page.getByRole("checkbox", { name: "User" })).toBeChecked();
    // Redirect URI pills render the existing values (count > 0).
    await expect(
      page.getByRole("button", { name: /^Remove URI:/ }).first()
    ).toBeVisible();
  });

  test.afterAll(async () => {
    // Restores displayName + status. CONFLICT/select-reset tests leave name=blog
    // (409 rejected; select-reset only changed displayName), so name needs no
    // explicit revert here.
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Nhóm 5 (matrix row #5) — Empty/null prefill ──
// DEFERRED: depends on a seeded app with description=null + iconUrl=null. If the
// seed lacks `minimal` (or an equivalent null-fields app), this stays skipped.
// Reason: writing a test against data that may not exist would be flaky; create a
// proper null seed (or confirm one) before enabling. (CLAUDE.md §4.3 — never
// silently drop; documented in e2e.md.)
test.describe("Admin Apps — null prefill", () => {
  test.fixme(
    "renders empty inputs for null fields without leaking 'null' [Error Guessing]",
    async ({ page }) => {
      await page.goto("/admin/apps");
      await openEdit(page, NULL_APP.displayName);
      await expect(
        page.getByRole("textbox", { name: "Description" })
      ).toHaveValue("");
      await expect(page.getByRole("textbox", { name: "Icon URL" })).toHaveValue(
        ""
      );
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("App updated.")).toBeVisible();
      await restoreApp(NULL_APP.name, NULL_APP.displayName, "active");
    }
  );
});

// ── Nhóm 9 (matrix row #9) — i18n vi (MANDATORY) ──
test.describe("Admin Apps — i18n (vi)", () => {
  test("renders the edit flow in Vietnamese [EP locale]", async ({ page }) => {
    await page.goto("/vi/admin/apps");
    await expect(
      page.getByRole("heading", { name: "Đăng ký ứng dụng" })
    ).toBeVisible();

    // VI row menu aria-label = "Thao tác với ứng dụng".
    await page
      .getByRole("row", { name: TARGET_APP.displayName })
      .getByRole("button", { name: "Thao tác với ứng dụng" })
      .click();
    await page.getByRole("menuitem", { name: "Chỉnh sửa" }).click();
    await expect(
      page.getByRole("heading", { name: "Chỉnh sửa ứng dụng" })
    ).toBeVisible();

    const displayName = page.getByRole("textbox", { name: "Tên hiển thị" });
    await displayName.fill("");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Vui lòng nhập tên hiển thị.")).toBeVisible();

    // Successful save in VI → VI toast.
    await displayName.fill("Blog (vi e2e)");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã cập nhật ứng dụng.")).toBeVisible();
  });

  test("renders the status badge label in Vietnamese", async ({ page }) => {
    await page.goto("/vi/admin/apps");
    // Active badge label in VI = "Đang hoạt động".
    await expect(
      page
        .getByRole("row", { name: TARGET_APP.name })
        .getByText("Đang hoạt động")
        .first()
    ).toBeVisible();
  });

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Nhóm 10 (matrix row #10) — Error / loading (route-mocked, no DB write) ──
test.describe("Admin Apps — error & loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // E2E-10a — 5xx → generic toast, NOT a field error.
  test("shows a generic toast on server 5xx [Error Guessing]", async ({
    page
  }) => {
    await page.route("**/api/v1/admin/apps/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: "INTERNAL", message: "boom" })
        });
        return;
      }
      await route.continue();
    });

    await openEdit(page, TARGET_APP.displayName);
    await page
      .getByRole("textbox", { name: "Display Name" })
      .fill("Blog (5xx e2e)");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Something went wrong. Please try again.")
    ).toBeVisible();
    // Mocked PATCH → no DB change → no revert needed.
  });

  // E2E-10b — Loading: Save + fields disabled while the update is in flight.
  test("disables form controls while the update is in flight [ST]", async ({
    page
  }) => {
    await page.route("**/api/v1/admin/apps/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // hold the pending state
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: "INTERNAL" })
        });
        return;
      }
      await route.continue();
    });

    await openEdit(page, TARGET_APP.displayName);
    await page.getByRole("textbox", { name: "Display Name" }).fill("Blog x");
    const save = page.getByRole("button", { name: "Save Changes" });
    await save.click();
    // During pending: Save disabled + a representative field disabled.
    await expect(save).toBeDisabled();
    await expect(
      page.getByRole("textbox", { name: "Display Name" })
    ).toBeDisabled();
  });
});

// ── Nhóm 11 (matrix row #11) — Mutation safety (all Gate A only) ──
test.describe("Admin Apps — mutation safety", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // E2E-11a — double-submit → exactly one PATCH.
  //
  // AdminAppsFormSheet's onSubmit is wrapped in a shared double-submit guard
  // (useSubmitGuard): an in-flight ref is set synchronously on the first submit
  // and only released in the mutation's onSettled, so a second click dispatched
  // in the same tick (including a single native dblclick) is ignored before it
  // can fire a second PATCH. We assert exactly one PATCH reaches the BE on a
  // rapid double-click.
  test("fires exactly one PATCH on rapid double-submit [ST]", async ({
    page
  }) => {
    let patchCount = 0;
    page.on("request", (req) => {
      if (req.method() === "PATCH" && /\/admin\/apps\//.test(req.url()))
        patchCount += 1;
    });

    await openEdit(page, TARGET_APP.displayName);
    await page
      .getByRole("textbox", { name: "Display Name" })
      .fill("Blog (double e2e)");
    const save = page.getByRole("button", { name: "Save Changes" });
    await Promise.all([save.click(), save.click().catch(() => {})]);
    await expect(page.getByText("App updated.").first()).toBeVisible();
    expect(patchCount).toBe(1);

    // The single committed PATCH persisted "Blog (double e2e)". Self-revert the
    // displayName so the next serial test (which reopens TARGET_APP by name and
    // asserts the original "Blog" value) still finds the row. The describe-level
    // afterAll only runs once at the very end.
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });

  // E2E-11b — navigate-away unsaved → no PATCH + reopen shows original values.
  test("discards unsaved edits and reopens with original values [Error Guessing]", async ({
    page
  }) => {
    let patched = false;
    page.on("request", (req) => {
      if (req.method() === "PATCH" && /\/admin\/apps\//.test(req.url()))
        patched = true;
    });

    await openEdit(page, TARGET_APP.displayName);
    await page
      .getByRole("textbox", { name: "Display Name" })
      .fill("Blog (unsaved)");
    await page.getByRole("button", { name: "Cancel" }).click();

    await openEdit(page, TARGET_APP.displayName);
    // FormResetEffect re-prefilled the original value on reopen.
    await expect(
      page.getByRole("textbox", { name: "Display Name" })
    ).toHaveValue("Blog");
    expect(patched).toBe(false);
  });

  // E2E-11c — trailing-space Name → BE trims to "blog" (no junk name created).
  // restoreApp does NOT revert `name`; this test self-reverts name via the API.
  test("trims a trailing space in Name on the server [Error Guessing]", async ({
    page
  }) => {
    await openEdit(page, TARGET_APP.displayName);
    // NOTE: FE NAME_PATTERN /^[a-z0-9][a-z0-9-]*$/ rejects a trailing space
    // client-side, so a raw "blog " never reaches the BE through the form. This
    // test asserts the BE trim contract directly via the API, then verifies the
    // stored name is clean and self-reverts.
    const ctx = page.request;
    // The admin API authenticates via `Authorization: Bearer <accessToken>` (the
    // accessToken is in the LOGIN RESPONSE BODY, not a cookie). page.request only
    // carries cookies, so we must log in as admin and send an explicit Bearer —
    // otherwise the list GET 401s and `items` is undefined.
    const loginRes = await ctx.post("/api/v1/auth/login", {
      data: { email: "admin@test.com", password: "Admin@123" }
    });
    expect(loginRes.ok(), "admin login must succeed").toBeTruthy();
    const token = (
      (await loginRes.json()) as { data?: { accessToken?: string } }
    )?.data?.accessToken;
    expect(token, "admin accessToken must be present").toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    // Resolve the app id via the admin list.
    const listRes = await ctx.get("/api/v1/admin/apps", { headers: auth });
    const list = (await listRes.json()) as {
      data?: { items?: { _id: string; name: string }[] };
    };
    const app = list?.data?.items?.find((a) => a.name === TARGET_APP.name);
    expect(app, "blog seed app must exist").toBeTruthy();
    const id = app!._id;

    const patchRes = await ctx.patch(`/api/v1/admin/apps/${id}`, {
      headers: auth,
      data: { name: "blog " }
    });
    expect(patchRes.ok()).toBeTruthy();
    const body = (await patchRes.json()) as { data?: { name?: string } };
    // BE trims → stored as "blog", not "blog " (no junk name).
    expect(body?.data?.name).toBe("blog");

    // Self-revert name (restoreApp only handles displayName + status).
    await ctx.patch(`/api/v1/admin/apps/${id}`, {
      headers: auth,
      data: { name: "blog" }
    });
  });

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Nhóm 12 (matrix row #12) — Accessibility ──
test.describe("Admin Apps — accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // E2E-12 — (a) focus moves to first invalid field; (b) announcer on success.
  // Part (a) depends on RHF shouldFocusError (default true) — if focus is not
  // managed, see the defer note in e2e.md. Part (b) mutates → Gate A only.
  test("manages focus on validation and announces success [Error Guessing]", async ({
    page
  }) => {
    await openEdit(page, TARGET_APP.displayName);

    // (a) empty Display Name → focus moves to the first invalid field.
    const displayName = page.getByRole("textbox", { name: "Display Name" });
    await displayName.fill("");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Please enter a display name.")).toBeVisible();
    await expect(displayName).toBeFocused();

    // (b) successful save → polite announcer reads "App {name} updated."
    await displayName.fill("Blog (a11y e2e)");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("App updated.")).toBeVisible();
    await expect(page.locator("#announcer")).toContainText(
      "App Blog (a11y e2e) updated."
    );
  });

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});
