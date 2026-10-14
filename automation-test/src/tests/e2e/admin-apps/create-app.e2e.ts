import { test, expect } from "@/fixtures";
import { createApiClient } from "@/api";
import { dataOf } from "@/api/response";
import { copy, copyVi, fill } from "@/data/copy";
import { AdminAppsPage } from "@/pages/admin/admin-apps.page";
import {
  categoryIdsBySlug,
  deleteE2EApps,
  e2eAppName,
  listAdminApps
} from "@/utils/admin-apps";
import { fillRequired, isCreateAppRequest } from "./helpers";

test.use({ role: "admin" });

// Registering an app through the "Register App" sheet and the one-time
// credentials dialog (REQ-ADMINAPPS-02, REQ-ADMINAPPS-03, REQ-ADMINAPPS-07).
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-021 … TC-ADMINAPPS-025,
// TC-ADMINAPPS-031, TC-ADMINAPPS-032, TC-ADMINAPPS-066 … TC-ADMINAPPS-069).
//
// Apps registered here are real: each is named `e2e-…`, switched to inactive
// (so a regular user's /apps never lists it) and deleted from MongoDB in
// afterEach — there is no delete endpoint.

const t = copy.adminApps;
const errors = t.form.validation;

test.afterEach(async () => {
  await deleteE2EApps();
});

test.describe("Register app — happy path and credentials", () => {
  test(
    "An admin registers an app with ordered categories",
    { tag: ["@TC-ADMINAPPS-021", "@smoke"] },
    async ({ adminAppsPage, adminApi }) => {
      const { sheet, secretDialog } = adminAppsPage;
      const name = e2eAppName("create");
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, name, { categories: ["Identity", "Content"] });
      await expect(sheet.categoriesList()).toContainText(
        new RegExp(`Identity.*${t.form.fields.categoryIds.primary}.*Content`)
      );
      await sheet.registerButton().click();

      await expect(secretDialog.root()).toBeVisible();
      await secretDialog.doneButton().click();
      await expect(secretDialog.root()).toBeHidden();

      // The row is in the registry, paused, with the primary category first.
      await expect(adminAppsPage.row(new RegExp(name))).toBeVisible();
      await expect(
        adminAppsPage.rowText(new RegExp(name), t.status.inactive, {
          exact: true
        })
      ).toBeVisible();

      // Stored in the chosen order.
      const admin = createApiClient(adminApi);
      const stored = (await listAdminApps(admin)).find((a) => a.name === name);
      expect(stored).toBeTruthy();
      const bySlug = await categoryIdsBySlug(admin);
      expect(stored!.categoryIds).toEqual([bySlug.identity, bySlug.content]);
    }
  );

  test(
    "The client secret is shown once, right after registering",
    { tag: ["@TC-ADMINAPPS-031", "@smoke"] },
    async ({ adminAppsPage, adminApi }) => {
      const { sheet, secretDialog } = adminAppsPage;
      const name = e2eAppName("create");
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, name);
      await sheet.registerButton().click();

      // Credentials dialog: client id + secret + the "shown once" warning.
      await expect(secretDialog.root()).toBeVisible();
      await expect(
        secretDialog.text(t.secretDialog.clientIdLabel, { exact: true })
      ).toBeVisible();
      await expect(
        secretDialog.text(t.secretDialog.clientSecretLabel, { exact: true })
      ).toBeVisible();
      await expect(secretDialog.text(t.secretDialog.warning)).toBeVisible();
      await expect(secretDialog.clientIdValue()).toBeVisible();
      const secretText = await secretDialog.secretValue().innerText();
      await secretDialog.doneButton().click();
      await expect(secretDialog.root()).toBeHidden();

      // The secret is never readable again over the API …
      const stored = (await listAdminApps(createApiClient(adminApi))).find(
        (a) => a.name === name
      );
      expect(stored).toBeTruthy();
      expect(JSON.stringify(stored)).not.toContain(secretText);
      expect(stored).not.toHaveProperty("clientSecret");

      // … nor anywhere when the app is opened again.
      await adminAppsPage.rowMenuButton(new RegExp(name)).click();
      await adminAppsPage.editItem().click();
      await expect(sheet.heading(t.form.editTitle)).toBeVisible();
      await expect(adminAppsPage.text(secretText)).toHaveCount(0);
      await expect(
        adminAppsPage.text(t.secretDialog.clientSecretLabel, { exact: true })
      ).toHaveCount(0);
    }
  );

  test(
    "A public client gets no secret",
    { tag: "@TC-ADMINAPPS-032" },
    async ({ adminAppsPage }) => {
      const { sheet, secretDialog } = adminAppsPage;
      const name = e2eAppName("public");
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, name);
      await sheet.authMethodSelect().click();
      await sheet
        .authMethodOption(t.form.fields.tokenEndpointAuthMethod.public)
        .click();
      await sheet.registerButton().click();

      await expect(secretDialog.root()).toBeVisible();
      await expect(
        secretDialog.text(t.secretDialog.clientIdLabel, { exact: true })
      ).toBeVisible();
      await expect(
        secretDialog.text(t.secretDialog.clientSecretLabel, { exact: true })
      ).toHaveCount(0);
      await expect(
        secretDialog.text(t.secretDialog.publicClientNote)
      ).toBeVisible();
      await expect(secretDialog.copyButtons()).toHaveCount(1);
    }
  );

  test(
    "A double-click on Register creates one app",
    { tag: "@TC-ADMINAPPS-066" },
    async ({ page, adminAppsPage, adminApi }) => {
      const { sheet, secretDialog } = adminAppsPage;
      let posts = 0;
      page.on("request", (r) => {
        if (isCreateAppRequest(r)) posts += 1;
      });
      const name = e2eAppName("double");
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, name);

      // [Error Guessing] two clicks in the same tick; the second may find the
      // sheet already closing — bound its wait.
      const register = sheet.registerButton();
      await Promise.all([
        register.click(),
        register.click({ timeout: 2_000 }).catch(() => {})
      ]);
      await expect(secretDialog.root()).toBeVisible();
      expect(posts).toBe(1);
      expect(
        await listAdminApps(createApiClient(adminApi), { search: name })
      ).toHaveLength(1);
    }
  );

  test(
    "Registering confirms with a toast and a screen-reader announcement",
    { tag: "@TC-ADMINAPPS-069" },
    async ({ adminAppsPage }) => {
      const { sheet, secretDialog } = adminAppsPage;
      await adminAppsPage.announcer.record();
      const name = e2eAppName("announce");
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, name);
      await sheet.registerButton().click();

      await expect(secretDialog.root()).toBeVisible();
      await expect(
        adminAppsPage.toast.withText(t.toast.createSuccess)
      ).toBeVisible();
      await expect
        .poll(() => adminAppsPage.announcer.history())
        .toContain(fill(t.announce.created, { name: `E2E ${name}` }));
    }
  );
});

test.describe("Register app — validation", () => {
  test(
    "An empty register form reports every required field",
    { tag: "@TC-ADMINAPPS-022" },
    async ({ page, adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      let posted = false;
      page.on("request", (r) => {
        if (isCreateAppRequest(r)) posted = true;
      });
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await sheet.registerButton().click();
      for (const message of [
        errors.name.required,
        errors.displayName.required,
        errors.homeUrl.required,
        errors.categoryIds.required,
        errors.redirectUris.required
      ]) {
        await expect(sheet.text(message)).toBeVisible();
      }
      // Removing the default role adds the roles error to the same pass.
      await sheet.roleCheckbox(t.roles.user).click();
      await sheet.registerButton().click();
      await expect(sheet.text(errors.requiredRoles.required)).toBeVisible();
      expect(posted).toBe(false);
    }
  );

  test(
    "A taken name is reported on the Name field",
    { tag: "@TC-ADMINAPPS-023" },
    async ({ adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, "blog");
      await sheet.registerButton().click();
      await expect(sheet.text(errors.name.exists)).toBeVisible();
      await expect(sheet.heading(t.form.createTitle)).toBeVisible();
    }
  );

  test(
    "A redirect URI only the server refuses keeps the sheet open",
    { tag: "@TC-ADMINAPPS-024" },
    async ({ page, adminAppsPage }) => {
      const { sheet, secretDialog } = adminAppsPage;
      // [Error Guessing] the form only checks http(s)://; the server also
      // refuses plain http on a public host (RFC 6749 §3.1.2 hardening).
      const name = e2eAppName("plainhttp");
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await fillRequired(sheet, name);
      await sheet.removeUriButton("https://e2e.example.com/callback").click();
      await sheet.addRedirectUri("http://e2e.example.com/callback");

      const response = page.waitForResponse((r) =>
        isCreateAppRequest(r.request())
      );
      await sheet.registerButton().click();
      expect((await response).status()).toBe(400);

      await expect(sheet.heading(t.form.createTitle)).toBeVisible();
      await expect(secretDialog.root()).toHaveCount(0);
      await expect(sheet.nameInput()).toHaveValue(name);
    }
  );

  test(
    "Cancelling the register sheet sends nothing and the next open starts empty",
    { tag: "@TC-ADMINAPPS-067" },
    async ({ page, adminAppsPage }) => {
      const { sheet } = adminAppsPage;
      let posted = false;
      page.on("request", (r) => {
        if (isCreateAppRequest(r)) posted = true;
      });
      await adminAppsPage.goto();
      await adminAppsPage.openRegister();
      await sheet.nameInput().fill(e2eAppName("cancel"));
      await sheet.displayNameInput().fill("E2E Cancelled");
      await sheet.cancelButton().click();
      await expect(sheet.heading(t.form.createTitle)).toBeHidden();

      // [ST] back to the list, then forward again: a fresh, empty form.
      await adminAppsPage.openRegister();
      await expect(sheet.nameInput()).toHaveValue("");
      await expect(sheet.displayNameInput()).toHaveValue("");
      expect(posted).toBe(false);
    }
  );

  test(
    "A category deleted while the sheet is open is dropped and reported on its field",
    { tag: "@TC-ADMINAPPS-068" },
    async ({ adminAppsPage, adminApi }) => {
      const { sheet, secretDialog } = adminAppsPage;
      // The category exists before the page loads its list.
      const admin = createApiClient(adminApi);
      const gone = `E2E Gone ${Date.now().toString(36)}`;
      const created = await admin.adminCategories.create({
        name: { en: gone, vi: gone }
      });
      expect(created.status()).toBe(201);
      const goneId = (await dataOf<{ _id: string }>(created))._id;
      const deleteGone = () =>
        admin.adminCategories.remove(goneId, { reassignments: [] });

      try {
        await adminAppsPage.goto();
        await adminAppsPage.openRegister();
        await fillRequired(sheet, e2eAppName("gone"), {
          categories: ["Content", gone]
        });
        await expect(sheet.categoriesList()).toContainText(gone);

        // [Error Guessing — 2 tabs] another admin deletes it meanwhile.
        expect((await deleteGone()).ok()).toBe(true);
        await sheet.registerButton().click();

        await expect(sheet.text(errors.categoryIds.notFound)).toBeVisible();
        await expect(sheet.categoriesList()).not.toContainText(gone);
        await expect(sheet.categoriesList()).toContainText("Content");
        await expect(sheet.heading(t.form.createTitle)).toBeVisible();
        await expect(secretDialog.root()).toHaveCount(0);
      } finally {
        await deleteGone().catch(() => undefined);
      }
    }
  );
});

test.describe("Register app — i18n (vi)", () => {
  test(
    "The register sheet and its errors render in Vietnamese",
    { tag: "@TC-ADMINAPPS-025" },
    async ({ page }) => {
      const vi = new AdminAppsPage(page, copyVi, "/vi");
      const errorsVi = copyVi.adminApps.form.validation;
      await vi.goto();
      await vi.openRegister();
      await vi.sheet.registerButton().click();
      await expect(vi.sheet.text(errorsVi.name.required)).toBeVisible();
      await expect(vi.sheet.text(errorsVi.categoryIds.required)).toBeVisible();
      await expect(vi.sheet.text(errorsVi.redirectUris.required)).toBeVisible();
      await expect(vi.text(/\[adminApps\./)).toHaveCount(0);
    }
  );
});
