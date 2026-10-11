import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import {
  ADMIN_APPS_API,
  deleteE2EApps,
  e2eAppName,
  listApps
} from "@helpers/adminApps";

test.use({ role: "admin" });

// Registering an app through the "Register App" sheet and the one-time
// credentials dialog (REQ-ADMAPPS-02, REQ-ADMAPPS-03).
// Test cases: test-cases/admin-apps.md (TC-ADMAPPS-021 … TC-ADMAPPS-025,
// TC-ADMAPPS-031, TC-ADMAPPS-032).
//
// Apps registered here are real: each is named `e2e-…`, switched to inactive
// (so a regular user's /apps never lists it) and deleted from MongoDB in
// afterEach — there is no delete endpoint.

const SECRET_DIALOG = "App registered — copy your credentials";

const openRegister = async (page: Page, locale = "") => {
  await page.goto(`${locale}/admin/apps`);
  await page
    .getByRole("button", {
      name: locale === "/vi" ? "Đăng ký ứng dụng" : "Register App"
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: locale === "/vi" ? "Đăng ký ứng dụng mới" : "Register New App"
    })
  ).toBeVisible();
};

const sheet = (page: Page) => page.getByRole("dialog");

const fillRequired = async (
  page: Page,
  name: string,
  { categories = ["Content"] }: { categories?: string[] } = {}
) => {
  await page.getByRole("textbox", { name: "Name *", exact: true }).fill(name);
  await page.getByRole("textbox", { name: "Display Name" }).fill(`E2E ${name}`);
  await page
    .getByRole("textbox", { name: "Home URL" })
    .fill("https://e2e.example.com");
  await page.getByRole("combobox", { name: /^Categories:/ }).click();
  for (const category of categories) {
    await page.getByRole("option", { name: new RegExp(category) }).click();
  }
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "https://app.example.com/auth/callback" })
    .fill("https://e2e.example.com/callback");
  await page.getByRole("button", { name: "Add URI" }).click();
  // Keep the app out of every user's launcher while it exists.
  await sheet(page).getByRole("switch").click();
  await expect(sheet(page).getByRole("switch")).not.toBeChecked();
};

test.afterEach(async () => {
  await deleteE2EApps();
});

test.describe("Register app — happy path and credentials", () => {
  test(
    "registers an app with ordered categories, then shows its credentials once",
    { tag: ["@TC-ADMAPPS-021", "@TC-ADMAPPS-031", "@smoke"] },
    async ({ page, adminApi }) => {
      const name = e2eAppName("create");
      await openRegister(page);
      await fillRequired(page, name, { categories: ["Identity", "Content"] });
      await expect(
        sheet(page).getByRole("list", { name: "Categories" })
      ).toContainText(/Identity.*Primary.*Content/);
      await page.getByRole("button", { name: "Register", exact: true }).click();

      // Credentials dialog: client id + secret + the "shown once" warning.
      const dialog = page.getByRole("dialog", { name: SECRET_DIALOG });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText("Client ID", { exact: true })
      ).toBeVisible();
      await expect(
        dialog.getByText("Client Secret", { exact: true })
      ).toBeVisible();
      await expect(
        dialog.getByText(
          "Store the client secret now — it will not be shown again."
        )
      ).toBeVisible();
      await expect(dialog.getByText(/^client_[0-9a-f]{12}$/)).toBeVisible();
      const secretText = await dialog
        .getByText(/^[0-9a-f]{64}$/)
        .first()
        .innerText();
      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(dialog).toBeHidden();

      // The row is in the registry, paused, with the primary category first.
      const row = page.getByRole("row", { name: new RegExp(name) });
      await expect(row).toBeVisible();
      await expect(row.getByText("Paused", { exact: true })).toBeVisible();

      // Stored in the chosen order; the secret is never readable again.
      const stored = (await listApps(adminApi)).find((a) => a.name === name);
      expect(stored).toBeTruthy();
      const categories = (await (
        await adminApi.get("/api/v1/admin/categories")
      ).json()) as { data: { _id: string; slug: string }[] };
      const bySlug = Object.fromEntries(
        categories.data.map((c) => [c.slug, c._id])
      );
      expect(stored!.categoryIds).toEqual([bySlug.identity, bySlug.content]);
      expect(JSON.stringify(stored)).not.toContain(secretText);
      expect(stored).not.toHaveProperty("clientSecret");

      // Re-opening the app shows no secret anywhere.
      await row.getByRole("button", { name: "App actions" }).click();
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await expect(
        page.getByRole("heading", { name: "Edit App" })
      ).toBeVisible();
      await expect(page.getByText(secretText)).toHaveCount(0);
      await expect(
        page.getByText("Client Secret", { exact: true })
      ).toHaveCount(0);
    }
  );

  test(
    "a public client gets no secret and a PKCE note instead",
    { tag: "@TC-ADMAPPS-032" },
    async ({ page }) => {
      const name = e2eAppName("public");
      await openRegister(page);
      await fillRequired(page, name);
      await page
        .getByRole("combobox", { name: /Client authentication/ })
        .click();
      await page
        .getByRole("option", { name: "Public — no client secret (PKCE only)" })
        .click();
      await page.getByRole("button", { name: "Register", exact: true }).click();

      const dialog = page.getByRole("dialog", { name: SECRET_DIALOG });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText("Client ID", { exact: true })
      ).toBeVisible();
      await expect(
        dialog.getByText("Client Secret", { exact: true })
      ).toHaveCount(0);
      await expect(
        dialog.getByText(/This is a public client, so it has no client secret/)
      ).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Copy" })).toHaveCount(1);
    }
  );
});

test.describe("Register app — validation", () => {
  test(
    "[DT] an empty form reports every required field and sends nothing",
    { tag: "@TC-ADMAPPS-022" },
    async ({ page }) => {
      let posted = false;
      page.on("request", (r) => {
        if (r.method() === "POST" && r.url().endsWith(ADMIN_APPS_API))
          posted = true;
      });
      await openRegister(page);
      await page.getByRole("button", { name: "Register", exact: true }).click();
      for (const message of [
        "Please enter a name.",
        "Please enter a display name.",
        "Please enter a home URL.",
        "Select at least one category.",
        "Add at least one redirect URI."
      ]) {
        await expect(sheet(page).getByText(message)).toBeVisible();
      }
      // Removing the default role adds the roles error to the same pass.
      await sheet(page).getByRole("checkbox", { name: "User" }).click();
      await page.getByRole("button", { name: "Register", exact: true }).click();
      await expect(
        sheet(page).getByText("Select at least one role.")
      ).toBeVisible();
      expect(posted).toBe(false);
    }
  );

  test(
    "a taken name is reported on the Name field",
    { tag: "@TC-ADMAPPS-023" },
    async ({ page }) => {
      await openRegister(page);
      await fillRequired(page, "blog");
      await page.getByRole("button", { name: "Register", exact: true }).click();
      await expect(
        sheet(page).getByText("An app with this name already exists.")
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Register New App" })
      ).toBeVisible();
    }
  );

  test(
    "a redirect URI the server refuses keeps the sheet open with an error",
    { tag: "@TC-ADMAPPS-024" },
    async ({ page }) => {
      // [Error Guessing] the form only checks http(s)://; the server also
      // refuses plain http on a public host (RFC 6749 §3.1.2 hardening).
      const name = e2eAppName("plainhttp");
      await openRegister(page);
      await fillRequired(page, name);
      await page
        .getByRole("button", {
          name: "Remove URI: https://e2e.example.com/callback"
        })
        .click();
      await page
        .getByRole("textbox", { name: "https://app.example.com/auth/callback" })
        .fill("http://e2e.example.com/callback");
      await page.getByRole("button", { name: "Add URI" }).click();

      const response = page.waitForResponse(
        (r) =>
          r.request().method() === "POST" && r.url().endsWith(ADMIN_APPS_API)
      );
      await page.getByRole("button", { name: "Register", exact: true }).click();
      expect((await response).status()).toBe(400);

      await expect(
        page.getByRole("heading", { name: "Register New App" })
      ).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: SECRET_DIALOG })
      ).toHaveCount(0);
      await expect(
        page.getByRole("textbox", { name: "Name *", exact: true })
      ).toHaveValue(name);
    }
  );
});

test.describe("Register app — i18n (vi)", () => {
  test(
    "the register sheet and its errors render in Vietnamese",
    { tag: "@TC-ADMAPPS-025" },
    async ({ page }) => {
      await openRegister(page, "/vi");
      await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
      await expect(sheet(page).getByText("Vui lòng nhập tên.")).toBeVisible();
      await expect(
        sheet(page).getByText("Hãy chọn ít nhất một danh mục.")
      ).toBeVisible();
      await expect(
        sheet(page).getByText("Thêm ít nhất một redirect URI.")
      ).toBeVisible();
      await expect(page.getByText(/\[adminApps\./)).toHaveCount(0);
    }
  );
});
