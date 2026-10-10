import { test, expect } from "@fixtures";
import type { Page } from "@playwright/test";
import { CATEGORIES_API } from "@helpers/categories";

test.use({ role: "admin" });

// The create / edit sheet's keyboard behaviour, rate-limit handling and
// Vietnamese errors (REQ-ADMCAT-02).
// Test cases: test-cases/admin-categories.md (TC-ADMCAT-068 … TC-ADMCAT-070).
// Nothing is saved: the one request that would create is stubbed or refused.

const openCreate = async (page: Page, locale = "") => {
  await page.goto(`${locale}/admin/categories`);
  const trigger = page
    .getByRole("button", { name: locale ? "Tạo danh mục" : "New category" })
    .first();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return trigger;
};

test(
  "the sheet focuses the English name, closes on Escape and gives focus back",
  { tag: "@TC-ADMCAT-068" },
  async ({ page }) => {
    // BUG: BUG-028 — closing the category sheet with Escape drops focus on <body> instead of returning it to "New category" (design §6 row 12).
    test.fail();
    const trigger = await openCreate(page);
    await expect(
      page.getByRole("textbox", { name: "Name (English)" })
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  }
);

test(
  "a rate-limited create shows the server's message and keeps the typed values",
  { tag: "@TC-ADMCAT-069" },
  async ({ page }) => {
    const MESSAGE = "Too many category changes. Try again in a minute.";
    await page.route(`**${CATEGORIES_API}`, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 429,
            contentType: "application/json",
            body: JSON.stringify({
              code: "RATE_LIMIT_EXCEEDED",
              message: MESSAGE,
              timestamp: new Date().toISOString(),
              path: CATEGORIES_API
            })
          })
        : route.continue()
    );
    await openCreate(page);
    await page
      .getByRole("textbox", { name: "Name (English)" })
      .fill("E2E Throttled");
    await page
      .getByRole("textbox", { name: "Name (Vietnamese)" })
      .fill("Bị giới hạn");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText(MESSAGE)).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Name (English)" })
    ).toHaveValue("E2E Throttled");
  }
);

test(
  "required and duplicate-name errors render in Vietnamese",
  { tag: "@TC-ADMCAT-070" },
  async ({ page }) => {
    await openCreate(page, "/vi");
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await expect(page.getByText("Hãy nhập tên tiếng Anh.")).toBeVisible();
    await expect(page.getByText("Hãy nhập tên tiếng Việt.")).toBeVisible();

    // [DT] duplicate en (other case) + valid vi → 409 on the English field.
    await page.getByRole("textbox", { name: "Tên (English)" }).fill("identity");
    await page
      .getByRole("textbox", { name: "Tên (Tiếng Việt)" })
      .fill("Bản sao");
    await page.getByRole("button", { name: "Tạo", exact: true }).click();
    await expect(
      page
        .getByRole("dialog")
        .getByText("Đã có danh mục với tên tiếng Anh này.")
    ).toBeVisible();
  }
);
