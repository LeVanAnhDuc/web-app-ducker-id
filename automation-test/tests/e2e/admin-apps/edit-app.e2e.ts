import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  ADMIN_APPS_API,
  appBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName,
  restoreApp
} from "@helpers/adminApps";

test.use({ role: "admin" });

// Admin app registry — edit sheet, hide / unhide, validation, errors, a11y
// (REQ-ADMAPPS-04, REQ-ADMAPPS-05). Runs as admin via the role fixture; the
// AuthN / AuthZ blocks take `guestPage` / `userPage` instead.
// Test cases: test-cases/admin-apps.md (TC-ADMAPPS-037 … TC-ADMAPPS-057).
// Every test that saves puts the seeded app back with `restoreApp`.

// ── Seed deps (server/src/database/seeders/data/web-apps.ts) ──
// TARGET_APP: a seeded ACTIVE app, category "Content", status=active.
const TARGET_APP = { name: "blog", displayName: "Blog" };
const EDITED_DISPLAY_NAME = "Blog (edited e2e)";
// A DIFFERENT seeded app whose `name` is used for the 409 conflict test. MUST be
// the `name` of an app that actually exists in the seed (see
// server/src/database/seeders/data/web-apps.ts) — otherwise renaming `blog` to it
// SUCCEEDS instead of conflicting, corrupting the seed.
const CONFLICT_NAME = "notes";

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

  // ── Happy path ──
  test(
    "edits an app's display name",
    { tag: ["@TC-ADMAPPS-037", "@smoke"] },
    async ({ page }) => {
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
    }
  );

  // ── Hide / unhide (State Transition active → inactive → active) ──
  test(
    "hides then unhides an app (status toggle)",
    { tag: ["@TC-ADMAPPS-057", "@smoke"] },
    async ({ page }) => {
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
    }
  );

  test.afterAll(async () => {
    // restoreApp reverts displayName + status (NOT name). Name-changing tests
    // self-revert below; this guarantees the seed app is back to baseline.
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── AuthN ──
// `guestPage` is a context with no session at all.
test.describe("Admin Apps — AuthN", () => {
  test(
    "blocks unauthenticated access (UI redirect + API 401) [Error Guessing]",
    { tag: "@TC-ADMAPPS-038" },
    async ({ guestPage, guestApi }) => {
      await guestPage.goto("/admin/apps");
      // SessionGate / AuthGuardLayout pushes back to login without a refresh cookie.
      await expect(guestPage).toHaveURL(/\/login/);
      await expect(
        guestPage.getByRole("heading", { name: "App Registry" })
      ).toHaveCount(0);

      // Direct API call without a Bearer token → 401 (guard rejects before service).
      const res = await guestApi.patch(
        "/api/v1/admin/apps/000000000000000000000000",
        { data: { displayName: "x" } }
      );
      expect(res.status()).toBe(401);
    }
  );
});

// ── AuthZ ──
// `userPage` / `userApi` are the seeded regular user (role fixtures).
//
// There is NO client-side role guard: for a signed-in non-admin the admin
// shell and the "App Registry" heading DO render, so the heading is not
// asserted absent. Authorization is enforced by the API (403); the admin-only
// DATA never loads, so the table shows its empty state and no app row or
// "App actions" menu renders. That data-absence is asserted (stable) rather
// than the transient permission toast (flaky).
test.describe("Admin Apps — AuthZ", () => {
  test(
    "forbids non-admin from updating apps (API 403 + admin data unreachable) [Error Guessing]",
    { tag: "@TC-ADMAPPS-039" },
    async ({ userPage: page, userApi }) => {
      // (1) Direct PATCH with a valid non-admin Bearer → authGuard passes,
      // adminGuard rejects: privilege escalation blocked.
      const res = await userApi.patch(
        "/api/v1/admin/apps/000000000000000000000000",
        { data: { displayName: "x" } }
      );
      expect(res.status()).toBe(403);

      // (2) UI: the admin-only list GET 403s, so no seeded row or row menu renders.
      await page.goto("/admin/apps");
      await expect(
        page.getByRole("heading", { name: "App Registry" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "App actions" })
      ).toHaveCount(0);
      await expect(
        page.getByRole("row", { name: TARGET_APP.displayName })
      ).toHaveCount(0);
      await expect(page.getByText("No apps registered yet.")).toBeVisible();
    }
  );
});

// ── Validation, boundaries and the select-reset regression ──
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
  test(
    "shows inline validation errors per field [EP]",
    { tag: "@TC-ADMAPPS-040" },
    async ({ page }) => {
      await openEdit(page, TARGET_APP.displayName);

      // Worked example: empty Display Name
      const displayName = page.getByRole("textbox", { name: "Display Name" });
      await displayName.fill("");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(
        page.getByText("Please enter a display name.")
      ).toBeVisible();

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
    }
  );

  // E2E-4b — [DT] anti-OFAT: BOTH errors must render at once.
  test(
    "surfaces multiple field errors simultaneously [DT] (anti-OFAT)",
    { tag: "@TC-ADMAPPS-041" },
    async ({ page }) => {
      await openEdit(page, TARGET_APP.displayName);

      await page.getByRole("textbox", { name: "Display Name" }).fill("");
      await page
        .getByRole("textbox", { name: "Name *", exact: true })
        .fill("Blog!");
      await page.getByRole("button", { name: "Save Changes" }).click();

      // BOTH must render — guards against OFAT where one error masks the other.
      await expect(
        page.getByText("Please enter a display name.")
      ).toBeVisible();
      await expect(
        page.getByText("Use lowercase letters, numbers, and hyphens only.")
      ).toBeVisible();
    }
  );

  // E2E-4c — 409 name conflict mapped to the `name` field (save attempt the server refuses).
  test(
    "maps 409 name conflict to the name field [Error Guessing]",
    { tag: "@TC-ADMAPPS-042" },
    async ({ page }) => {
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
    }
  );

  // E2E-4d — Select-reset regression guard (saves; self-reverts).
  // Changing only Display Name must NOT wipe the categories (originally a
  // shadcn-Select RHF reset bug; category-management replaced the single select
  // with CategoryMultiSelect and keeps this guard).
  test(
    "preserves Category when only Display Name changes [ST regression]",
    { tag: "@TC-ADMAPPS-043" },
    async ({ page }) => {
      await openEdit(page, TARGET_APP.displayName);
      await expect(
        page.getByRole("dialog").getByRole("list", { name: "Categories" })
      ).toContainText("Content");
      await page
        .getByRole("textbox", { name: "Display Name" })
        .fill("Blog (select-reset e2e)");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("App updated.")).toBeVisible();

      // Reopen → Category must NOT have been wiped by the reset/onValueChange path.
      await openEdit(page, "Blog (select-reset e2e)");
      await expect(
        page.getByRole("dialog").getByRole("list", { name: "Categories" })
      ).toContainText("Content");

      // Self-revert displayName so later serial tests (e.g. the full-prefill test)
      // and openEdit(TARGET_APP.displayName) still find the row as "Blog". The
      // describe-level afterAll only runs once at the very end.
      await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
    }
  );

  // E2E-6a — [BVA] Name length: 1 (min-1), 2 (min), 64 (max), 65 (max+1).
  test(
    "enforces Name length boundaries [BVA]",
    { tag: "@TC-ADMAPPS-045" },
    async ({ page }) => {
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
    }
  );

  // E2E-6b — [BVA] Display Name length: 2 (min), 80 (max), 81 (max+1).
  test(
    "enforces Display Name length boundaries [BVA]",
    { tag: "@TC-ADMAPPS-046" },
    async ({ page }) => {
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
    }
  );

  // E2E-6c — [BVA] redirectUris count 21 > max(20) → inline error (CF-3 done).
  // CF-3 added FE `.max(20)` → message key `redirectUris.maxItems`. Client-side
  // validation. We add URIs through the StringListField draft input + "Add
  // URI" button until the total reaches 21, then Save → inline error. BE rejects
  // anyway; no field mutation persists (validation blocks submit client-side).
  test(
    "rejects more than 20 redirect URIs (CF-3) [BVA]",
    { tag: "@TC-ADMAPPS-047" },
    async ({ page }) => {
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
    }
  );

  // E2E-8 — Data render: full prefill incl. Category human label [Decision Table].
  test(
    "prefills every field from the selected app [Decision Table]",
    { tag: "@TC-ADMAPPS-048" },
    async ({ page }) => {
      await openEdit(page, TARGET_APP.displayName);
      await expect(
        page.getByRole("textbox", { name: "Name *", exact: true })
      ).toHaveValue("blog");
      await expect(
        page.getByRole("textbox", { name: "Display Name" })
      ).toHaveValue("Blog");
      // Categories render the human label, NOT the ObjectId.
      await expect(
        page.getByRole("dialog").getByRole("list", { name: "Categories" })
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
    }
  );

  test.afterAll(async () => {
    // Restores displayName + status. CONFLICT/select-reset tests leave name=blog
    // (409 rejected; select-reset only changed displayName), so name needs no
    // explicit revert here.
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Empty / null prefill ──
// The seed has no app with description = null and iconUrl = null, so the test
// registers one of its own (an empty description / icon is stored as null)
// and deletes it afterwards.
test.describe("Admin Apps — null prefill", () => {
  test.afterEach(async () => {
    await deleteE2EApps();
  });

  test(
    "renders empty inputs for null fields without leaking 'null' [Error Guessing]",
    { tag: "@TC-ADMAPPS-044" },
    async ({ page, adminApi }) => {
      const [firstCategory] = await categoryIds(adminApi);
      const body = appBody([firstCategory], {
        name: e2eAppName("null"),
        description: "",
        iconUrl: ""
      });
      const created = await adminApi.post(ADMIN_APPS_API, { data: body });
      expect(created.status()).toBe(201);
      const { data } = (await created.json()) as {
        data: { description: string | null; iconUrl: string | null };
      };
      expect(data.description).toBeNull();
      expect(data.iconUrl).toBeNull();

      await page.goto("/admin/apps");
      await openEdit(page, body.displayName as string);
      await expect(
        page.getByRole("textbox", { name: "Description" })
      ).toHaveValue("");
      await expect(page.getByRole("textbox", { name: "Icon URL" })).toHaveValue(
        ""
      );
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("App updated.")).toBeVisible();
    }
  );
});

// ── i18n (vi) ──
test.describe("Admin Apps — i18n (vi)", () => {
  test(
    "renders the edit flow in Vietnamese [EP locale]",
    { tag: "@TC-ADMAPPS-049" },
    async ({ page }) => {
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
    }
  );

  test(
    "renders the status badge label in Vietnamese",
    { tag: "@TC-ADMAPPS-049" },
    async ({ page }) => {
      await page.goto("/vi/admin/apps");
      // Active badge label in VI = "Đang hoạt động".
      await expect(
        page
          .getByRole("row", { name: TARGET_APP.name })
          .getByText("Đang hoạt động")
          .first()
      ).toBeVisible();
    }
  );

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Error / loading (route-mocked, no DB write) ──
test.describe("Admin Apps — error & loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // E2E-10a — 5xx → the global MutationCache toast (src/libs/query-client.ts),
  // NOT a field error: useUpdateAdminApp has no onError of its own.
  test(
    "shows a generic toast on server 5xx [Error Guessing]",
    { tag: "@TC-ADMAPPS-050" },
    async ({ page }) => {
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
        page.getByText("Server error. Please try again later.")
      ).toBeVisible();
      // Mocked PATCH → no DB change → no revert needed.
    }
  );

  // E2E-10b — Loading: Save + fields disabled while the update is in flight.
  test(
    "disables form controls while the update is in flight [ST]",
    { tag: "@TC-ADMAPPS-051" },
    async ({ page }) => {
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
    }
  );
});

// ── Mutation safety ──
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
  test(
    "fires exactly one PATCH on rapid double-submit [ST]",
    { tag: "@TC-ADMAPPS-052" },
    async ({ page }) => {
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
      // The second click may find the sheet already closing — bound its wait.
      await Promise.all([
        save.click(),
        save.click({ timeout: 2_000 }).catch(() => {})
      ]);
      await expect(page.getByText("App updated.").first()).toBeVisible();
      expect(patchCount).toBe(1);

      // The single committed PATCH persisted "Blog (double e2e)". Self-revert the
      // displayName so the next serial test (which reopens TARGET_APP by name and
      // asserts the original "Blog" value) still finds the row. The describe-level
      // afterAll only runs once at the very end.
      await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
    }
  );

  // E2E-11b — navigate-away unsaved → no PATCH + reopen shows original values.
  test(
    "discards unsaved edits and reopens with original values [Error Guessing]",
    { tag: "@TC-ADMAPPS-053" },
    async ({ page }) => {
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
    }
  );

  // E2E-11c — trailing-space Name → BE trims to "blog" (no junk name created).
  // restoreApp does NOT revert `name`; this test self-reverts name via the API.
  test(
    "trims a trailing space in Name on the server [Error Guessing]",
    { tag: "@TC-ADMAPPS-054" },
    async ({ adminApi }) => {
      // The form's NAME_PATTERN /^[a-z0-9][a-z0-9-]*$/ rejects a trailing space
      // client-side, so a raw "blog " never reaches the server through the UI.
      // This asserts the server's trim contract directly, then self-reverts
      // (restoreApp only handles displayName + status).
      const list = (await (await adminApi.get(ADMIN_APPS_API)).json()) as {
        data?: { items?: { _id: string; name: string }[] };
      };
      const app = list?.data?.items?.find((a) => a.name === TARGET_APP.name);
      expect(app, "blog seed app must exist").toBeTruthy();
      const id = app!._id;

      const patchRes = await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { name: "blog " }
      });
      expect(patchRes.ok()).toBeTruthy();
      const body = (await patchRes.json()) as { data?: { name?: string } };
      // Server trims → stored as "blog", not "blog " (no junk name).
      expect(body?.data?.name).toBe("blog");

      await adminApi.patch(`${ADMIN_APPS_API}/${id}`, {
        data: { name: "blog" }
      });
    }
  );

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});

// ── Accessibility ──
test.describe("Admin Apps — accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/apps");
    await expect(
      page.getByRole("heading", { name: "App Registry" })
    ).toBeVisible();
  });

  // E2E-12 — (a) focus moves to first invalid field; (b) announcer on success.
  // Part (a) depends on RHF shouldFocusError (default true) — if focus is not
  // managed this part fails. Part (b) saves; afterAll restores the seed app.
  test(
    "manages focus on validation and announces success [Error Guessing]",
    { tag: "@TC-ADMAPPS-055" },
    async ({ page }) => {
      await openEdit(page, TARGET_APP.displayName);

      // (a) empty Display Name → focus moves to the first invalid field.
      const displayName = page.getByRole("textbox", { name: "Display Name" });
      await displayName.fill("");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(
        page.getByText("Please enter a display name.")
      ).toBeVisible();
      await expect(displayName).toBeFocused();

      // (b) successful save → polite announcer reads "App {name} updated."
      await displayName.fill("Blog (a11y e2e)");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("App updated.")).toBeVisible();
      await expect(page.locator("#announcer")).toContainText(
        "App Blog (a11y e2e) updated."
      );
    }
  );

  test.afterAll(async () => {
    await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
  });
});
