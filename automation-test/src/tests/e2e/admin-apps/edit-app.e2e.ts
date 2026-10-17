import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import type { AdminAppCreated } from "@/api/admin-apps.client";
import { dataOf } from "@/api/response";
import { clientLiteral, copy, copyVi, fill } from "@/data/copy";
import {
  CONFLICT_APP_NAME,
  EDIT_TARGET_APP as TARGET_APP,
  UNKNOWN_APP_ID
} from "@/data/test-data";
import { AdminAppsPage } from "@/pages/admin/admin-apps.page";
import {
  adminAppBody,
  categoryIds,
  deleteE2EApps,
  e2eAppName,
  restoreApp
} from "@/utils/admin-apps";
import { APP_ITEM_ROUTE, isUpdateAppRequest } from "./helpers";

test.use({ role: "admin" });

// Admin app registry — edit sheet, hide / unhide, validation, errors, a11y
// (REQ-ADMINAPPS-04, REQ-ADMINAPPS-05). Runs as admin via the role fixture; the
// AuthN / AuthZ blocks take `guestPage` / `userPage` instead.
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-037 … TC-ADMINAPPS-057).
//
// Most tests borrow the seeded app `blog` (TARGET_APP). Every test starts from
// it as seeded: the afterEach puts its display name and status back, so no
// test depends on what an earlier one saved. Name changes never persist (the
// 409 is refused; the others never save).

const t = copy.adminApps;
const errors = t.form.validation;
const EDITED_DISPLAY_NAME = "Blog (edited e2e)";

test.afterEach(async () => {
  await restoreApp(TARGET_APP.name, TARGET_APP.displayName, "active");
});

test.describe("Admin Apps — edit + hide/unhide", () => {
  test.beforeEach(async ({ adminAppsPage }) => {
    await adminAppsPage.goto();
    await expect(adminAppsPage.heading()).toBeVisible();
  });

  // ── Happy path ──
  test(
    "An admin edits an app's display name",
    { tag: ["@TC-ADMINAPPS-037", "@smoke"] },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.rowMenuButton(TARGET_APP.displayName).click();
      await adminAppsPage.editItem().click();
      const displayName = sheet.displayNameInput();
      await expect(displayName).toBeVisible();
      await displayName.fill(EDITED_DISPLAY_NAME);
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.toast.withText(t.toast.updateSuccess)
      ).toBeVisible();
      await expect(
        adminAppsPage.text(EDITED_DISPLAY_NAME, { exact: true })
      ).toBeVisible();
    }
  );

  // ── Hide / unhide (State Transition active → inactive → active) ──
  test(
    "Hide then Unhide from the row menu",
    { tag: ["@TC-ADMINAPPS-057", "@smoke"] },
    async ({ adminAppsPage }) => {
      await adminAppsPage.startHide(TARGET_APP.displayName);
      await adminAppsPage.hideDialog.confirmButton().click();
      await expect(adminAppsPage.toast.withText(t.toast.hidden)).toBeVisible();
      await expect(
        adminAppsPage.rowText(TARGET_APP.displayName, t.status.inactive)
      ).toBeVisible();

      await adminAppsPage.unhide(TARGET_APP.displayName);
      await expect(
        adminAppsPage.toast.withText(t.toast.reactivated)
      ).toBeVisible();
      await expect(
        adminAppsPage.rowText(TARGET_APP.displayName, t.status.active)
      ).toBeVisible();
    }
  );
});

// ── AuthN ──
// `guestPage` is a context with no session at all.
test.describe("Admin Apps — AuthN", () => {
  test(
    "Without a session the registry is unreachable",
    { tag: ["@TC-ADMINAPPS-038", "@smoke"] },
    async ({ guestPage, guestApi }) => {
      const guest = new AdminAppsPage(guestPage);
      await guest.goto();
      // SessionGate / AuthGuardLayout pushes back to login without a refresh cookie.
      await expect(guestPage).toHaveURL(/\/login/);
      await expect(guest.heading()).toHaveCount(0);

      // Direct API call without a Bearer token → 401 (guard rejects before service).
      const res = await createApiClient(guestApi).adminApps.update(
        UNKNOWN_APP_ID,
        { displayName: "x" }
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
    "A non-admin cannot update apps or see them",
    { tag: ["@TC-ADMINAPPS-039", "@smoke"] },
    async ({ userPage, userApi }) => {
      // (1) Direct PATCH with a valid non-admin Bearer → authGuard passes,
      // adminGuard rejects: privilege escalation blocked.
      const res = await createApiClient(userApi).adminApps.update(
        UNKNOWN_APP_ID,
        { displayName: "x" }
      );
      expect(res.status()).toBe(403);

      // (2) UI: the admin-only list GET 403s, so no seeded row or row menu renders.
      const asUser = new AdminAppsPage(userPage);
      await asUser.goto();
      await expect(asUser.heading()).toBeVisible();
      await expect(asUser.rowMenuButtons()).toHaveCount(0);
      await expect(asUser.row(TARGET_APP.displayName)).toHaveCount(0);
      await expect(asUser.text(t.table.empty)).toBeVisible();
    }
  );
});

// ── Validation, boundaries and the select-reset regression ──
// All of these open the edit sheet on `blog`.
test.describe("Admin Apps — validation & boundaries", () => {
  test.beforeEach(async ({ adminAppsPage }) => {
    await adminAppsPage.goto();
    await expect(adminAppsPage.heading()).toBeVisible();
  });

  // E2E-4a — [EP] per-field inline errors (no Save success → no mutation).
  test(
    "Each field reports its own validation error",
    { tag: "@TC-ADMINAPPS-040" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);

      // Worked example: empty Display Name
      const displayName = sheet.displayNameInput();
      await displayName.fill("");
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.text(errors.displayName.required)
      ).toBeVisible();

      // Name forbidden char — restore Display Name so it is not the blocking error.
      await displayName.fill("Blog");
      await sheet.nameInput().fill("Blog!");
      await sheet.saveButton().click();
      await expect(adminAppsPage.text(errors.name.invalid)).toBeVisible();

      // Home URL bad scheme
      await sheet.nameInput().fill("blog");
      await sheet.homeUrlInput().fill("ftp://x");
      await sheet.saveButton().click();
      await expect(adminAppsPage.text(errors.homeUrl.invalid)).toBeVisible();
      // No successful Save → no revert needed.
    }
  );

  // E2E-4b — [DT] anti-OFAT: BOTH errors must render at once.
  test(
    "Several errors show at once",
    { tag: "@TC-ADMINAPPS-041" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);

      await sheet.displayNameInput().fill("");
      await sheet.nameInput().fill("Blog!");
      await sheet.saveButton().click();

      // BOTH must render — guards against OFAT where one error masks the other.
      await expect(
        adminAppsPage.text(errors.displayName.required)
      ).toBeVisible();
      await expect(adminAppsPage.text(errors.name.invalid)).toBeVisible();
    }
  );

  // E2E-4c — 409 name conflict mapped to the `name` field (save attempt the server refuses).
  test(
    "Renaming onto a taken name is reported on the Name field",
    { tag: "@TC-ADMINAPPS-042" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await sheet.nameInput().fill(CONFLICT_APP_NAME);
      await sheet.saveButton().click();
      // WEB_APP_NAME_EXISTS (409) → setError(NAME, "exists") → inline message.
      // The same copy also appears in a sonner toast, so scope to the Edit App
      // sheet to assert the INLINE field error specifically.
      await expect(
        sheet.textIn(t.form.editTitle, errors.name.exists)
      ).toBeVisible();
    }
  );

  // E2E-4d — Select-reset regression guard (saves; afterEach reverts).
  // Changing only Display Name must NOT wipe the categories (originally a
  // shadcn-Select RHF reset bug; category-management replaced the single select
  // with CategoryMultiSelect and keeps this guard).
  test(
    "Changing only the display name keeps the categories",
    { tag: "@TC-ADMINAPPS-043" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await expect(sheet.categoriesList()).toContainText("Content");
      await sheet.displayNameInput().fill("Blog (select-reset e2e)");
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.toast.withText(t.toast.updateSuccess)
      ).toBeVisible();

      // Reopen → Category must NOT have been wiped by the reset/onValueChange path.
      await adminAppsPage.openEdit("Blog (select-reset e2e)");
      await expect(sheet.categoriesList()).toContainText("Content");
    }
  );

  // E2E-6a — [BVA] Name length: 1 (min-1), 2 (min), 64 (max), 65 (max+1).
  test(
    "Name length boundaries",
    { tag: "@TC-ADMINAPPS-045" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);
      const name = sheet.nameInput();

      // 1 (min-1) → error
      await name.fill("a");
      await sheet.saveButton().click();
      await expect(adminAppsPage.text(errors.name.minLength)).toBeVisible();

      // 65 (max+1) → error
      await name.fill("a".repeat(65));
      await sheet.saveButton().click();
      await expect(adminAppsPage.text(errors.name.maxLength)).toBeVisible();

      // 2 (min) and 64 (max) → valid (length errors clear).
      await name.fill("ab");
      await expect(adminAppsPage.text(errors.name.minLength)).toHaveCount(0);
      await name.fill("a".repeat(64));
      await expect(adminAppsPage.text(errors.name.maxLength)).toHaveCount(0);
      // Leave field at original; close without a successful save → no mutation.
      await name.fill("blog");
    }
  );

  // E2E-6b — [BVA] Display Name length: 2 (min), 80 (max), 81 (max+1).
  test(
    "Display name length boundaries",
    { tag: "@TC-ADMINAPPS-046" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);
      const displayName = sheet.displayNameInput();

      // 81 (max+1) → error
      await displayName.fill("a".repeat(81));
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.text(errors.displayName.maxLength)
      ).toBeVisible();

      // 2 (min) and 80 (max) → valid (max error clears).
      await displayName.fill("ab");
      await expect(
        adminAppsPage.text(errors.displayName.maxLength)
      ).toHaveCount(0);
      await displayName.fill("a".repeat(80));
      await expect(
        adminAppsPage.text(errors.displayName.maxLength)
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
    "At most 20 redirect URIs",
    { tag: "@TC-ADMINAPPS-047" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);

      // Count current pills (rendered as <li> with a "Remove URI: <uri>" button).
      const removeButtons = sheet.removeUriButtons();
      const current = await removeButtons.count();
      const TARGET_COUNT = 21;

      for (let i = current; i < TARGET_COUNT; i += 1) {
        await sheet.addRedirectUri(`https://e2e-extra-${i}.example.com/cb`);
      }
      await expect(removeButtons).toHaveCount(TARGET_COUNT);

      await sheet.saveButton().click();
      await expect(
        adminAppsPage.text(errors.redirectUris.maxItems)
      ).toBeVisible();
      // Client-side validation blocks submit → no PATCH → no mutation.
    }
  );

  // E2E-8 — Data render: full prefill incl. Category human label [Decision Table].
  test(
    "The edit sheet prefills every field",
    { tag: "@TC-ADMINAPPS-048" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await expect(sheet.nameInput()).toHaveValue("blog");
      await expect(sheet.displayNameInput()).toHaveValue("Blog");
      // Categories render the human label, NOT the ObjectId.
      await expect(sheet.categoriesList()).toContainText("Content");
      // Home URL is prefilled (non-empty).
      await expect(sheet.homeUrlInput()).not.toHaveValue("");
      // Status switch reflects status=active (the only switch in the sheet).
      await expect(sheet.statusSwitch()).toBeChecked();
      // Required Roles: at least the "User" role is checked for the seed app.
      await expect(sheet.roleCheckbox(t.roles.user)).toBeChecked();
      // Redirect URI pills render the existing values (count > 0).
      await expect(sheet.removeUriButtons().first()).toBeVisible();
    }
  );
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
    "Null description and icon prefill as empty inputs",
    { tag: "@TC-ADMINAPPS-044" },
    async ({ adminAppsPage, adminApi }) => {
      const { sheet } = adminAppsPage;
      const admin = createApiClient(adminApi);
      const [firstCategory] = await categoryIds(admin);
      const body = adminAppBody([firstCategory], {
        name: e2eAppName("null"),
        description: "",
        iconUrl: ""
      });
      const created = await admin.adminApps.create(body);
      expect(created.status()).toBe(201);
      const data = await dataOf<AdminAppCreated>(created);
      expect(data.description).toBeNull();
      expect(data.iconUrl).toBeNull();

      await adminAppsPage.goto();
      await adminAppsPage.openEdit(body.displayName as string);
      await expect(sheet.descriptionInput()).toHaveValue("");
      await expect(sheet.iconUrlInput()).toHaveValue("");
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.toast.withText(t.toast.updateSuccess)
      ).toBeVisible();
    }
  );
});

// ── i18n (vi) ──
test.describe("The edit flow and status badge render in Vietnamese", () => {
  const tVi = copyVi.adminApps;

  test(
    "renders the edit flow in Vietnamese [EP locale]",
    { tag: "@TC-ADMINAPPS-049" },
    async ({ page }) => {
      const vi = new AdminAppsPage(page, copyVi, "/vi");
      await vi.goto();
      await expect(vi.heading()).toBeVisible();

      // VI row menu aria-label = "Thao tác với ứng dụng".
      await vi.rowMenuButton(TARGET_APP.displayName).click();
      await vi.editItem().click();
      await expect(vi.sheet.heading(tVi.form.editTitle)).toBeVisible();

      const displayName = vi.sheet.displayNameInput();
      await displayName.fill("");
      await vi.sheet.saveButton().click();
      await expect(
        vi.text(tVi.form.validation.displayName.required)
      ).toBeVisible();

      // Successful save in VI → VI toast.
      await displayName.fill("Blog (vi e2e)");
      await vi.sheet.saveButton().click();
      await expect(vi.toast.withText(tVi.toast.updateSuccess)).toBeVisible();
    }
  );

  test(
    "renders the status badge label in Vietnamese",
    { tag: "@TC-ADMINAPPS-049" },
    async ({ page }) => {
      const vi = new AdminAppsPage(page, copyVi, "/vi");
      await vi.goto();
      // Active badge label in VI = "Đang hoạt động".
      await expect(
        vi.rowText(TARGET_APP.name, tVi.status.active).first()
      ).toBeVisible();
    }
  );
});

// ── Error / loading (route-mocked, no DB write) ──
test.describe("Admin Apps — error & loading", () => {
  test.beforeEach(async ({ adminAppsPage }) => {
    await adminAppsPage.goto();
    await expect(adminAppsPage.heading()).toBeVisible();
  });

  // E2E-10a — 5xx → the global MutationCache toast (src/libs/query-client.ts),
  // NOT a field error: useUpdateAdminApp has no onError of its own.
  test(
    "A server error on save shows one generic toast",
    { tag: "@TC-ADMINAPPS-050" },
    async ({ page, adminAppsPage }) => {
      await page.route(APP_ITEM_ROUTE, async (route) => {
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

      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await adminAppsPage.sheet.displayNameInput().fill("Blog (5xx e2e)");
      await adminAppsPage.sheet.saveButton().click();
      await expect(
        adminAppsPage.toast.withText(clientLiteral.serverErrorToast)
      ).toBeVisible();
      // Mocked PATCH → no DB change → no revert needed.
    }
  );

  // E2E-10b — Loading: Save + fields disabled while the update is in flight.
  test(
    "Controls are disabled while saving",
    { tag: "@TC-ADMINAPPS-051" },
    async ({ page, adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await page.route(APP_ITEM_ROUTE, async (route) => {
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

      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await sheet.displayNameInput().fill("Blog x");
      const save = sheet.saveButton();
      await save.click();
      // During pending: Save disabled + a representative field disabled.
      await expect(save).toBeDisabled();
      await expect(sheet.displayNameInput()).toBeDisabled();
    }
  );
});

// ── Mutation safety ──
test.describe("Admin Apps — mutation safety", () => {
  test.beforeEach(async ({ adminAppsPage }) => {
    await adminAppsPage.goto();
    await expect(adminAppsPage.heading()).toBeVisible();
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
    "A double-click saves once",
    { tag: "@TC-ADMINAPPS-052" },
    async ({ page, adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      let patchCount = 0;
      page.on("request", (req) => {
        if (isUpdateAppRequest(req)) patchCount += 1;
      });

      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await sheet.displayNameInput().fill("Blog (double e2e)");
      const save = sheet.saveButton();
      // The second click may find the sheet already closing — bound its wait.
      await Promise.all([
        save.click(),
        save.click({ timeout: 2_000 }).catch(() => {})
      ]);
      await expect(
        adminAppsPage.toast.withText(t.toast.updateSuccess).first()
      ).toBeVisible();
      expect(patchCount).toBe(1);
    }
  );

  // E2E-11b — navigate-away unsaved → no PATCH + reopen shows original values.
  test(
    "Cancel discards unsaved edits",
    { tag: "@TC-ADMINAPPS-053" },
    async ({ page, adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      let patched = false;
      page.on("request", (req) => {
        if (isUpdateAppRequest(req)) patched = true;
      });

      await adminAppsPage.openEdit(TARGET_APP.displayName);
      await sheet.displayNameInput().fill("Blog (unsaved)");
      await sheet.cancelButton().click();

      await adminAppsPage.openEdit(TARGET_APP.displayName);
      // FormResetEffect re-prefilled the original value on reopen.
      await expect(sheet.displayNameInput()).toHaveValue("Blog");
      expect(patched).toBe(false);
    }
  );
});

// ── Accessibility ──
test.describe("Admin Apps — accessibility", () => {
  test.beforeEach(async ({ adminAppsPage }) => {
    await adminAppsPage.goto();
    await expect(adminAppsPage.heading()).toBeVisible();
  });

  // E2E-12 — (a) focus moves to first invalid field; (b) announcer on success.
  // Part (a) depends on RHF shouldFocusError (default true) — if focus is not
  // managed this part fails. Part (b) saves; afterEach restores the seed app.
  test(
    "Focus moves to the first invalid field and success is announced",
    { tag: "@TC-ADMINAPPS-055" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.openEdit(TARGET_APP.displayName);

      // (a) empty Display Name → focus moves to the first invalid field.
      const displayName = sheet.displayNameInput();
      await displayName.fill("");
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.text(errors.displayName.required)
      ).toBeVisible();
      await expect(displayName).toBeFocused();

      // (b) successful save → polite announcer reads "App {name} updated."
      await displayName.fill("Blog (a11y e2e)");
      await sheet.saveButton().click();
      await expect(
        adminAppsPage.toast.withText(t.toast.updateSuccess)
      ).toBeVisible();
      await expect(adminAppsPage.announcer.region()).toContainText(
        fill(t.announce.updated, { name: "Blog (a11y e2e)" })
      );
    }
  );
});
