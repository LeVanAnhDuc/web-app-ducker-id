import { test, expect } from "@/fixtures";
import type { APIRequestContext } from "@playwright/test";
import { createApiClient, type ApiClient } from "@/api";
import { adminContext } from "@/api/session";
import { copy, fill } from "@/data/copy";
import {
  listAdminCategories,
  moveCategory,
  restoreCategoryOrder
} from "@/utils/categories";
import { MOVE_ROUTE } from "./helpers";

test.use({ role: "admin" });

// Reordering with ↑ / ↓ (REQ-ADMINCATEGORIES-03; design decisions DR-6, DR-15).
// Test cases: test-cases/admin-categories.md (TC-ADMINCATEGORIES-021 … -024, -072).
// The original order is snapshotted and restored in afterAll.

test.describe.configure({ mode: "serial" });

const t = copy.adminCategories;

let ctx: APIRequestContext;
let api: ApiClient;
let originalOrder: string[];

test.beforeAll(async () => {
  ctx = await adminContext();
  api = createApiClient(ctx);
  originalOrder = (await listAdminCategories(api)).map((c) => c._id);
});

test.afterAll(async () => {
  await restoreCategoryOrder(api, originalOrder);
  await ctx.dispose();
});

test(
  "Moving the second row up makes it first, with focus kept",
  { tag: ["@TC-ADMINCATEGORIES-021", "@smoke"] },
  async ({ adminCategoriesPage, page }) => {
    await adminCategoriesPage.goto();
    const second = await adminCategoriesPage.nameCell(1).innerText();
    const name = second.split("\n")[0];

    await adminCategoriesPage.moveUpButton(name).click();

    await expect(adminCategoriesPage.dataRows().first()).toContainText(name);
    await expect(adminCategoriesPage.moveUpButton(name)).toBeDisabled();
    // It reached the top, so focus falls back to its other arrow.
    await expect(adminCategoriesPage.moveDownButton(name)).toBeFocused();

    // Keyboard: press it to go back down.
    await page.keyboard.press("Enter");
    await expect(adminCategoriesPage.dataRows().nth(1)).toContainText(name);
    await expect(adminCategoriesPage.moveDownButton(name)).toBeFocused();
  }
);

test(
  "A failed move leaves the order unchanged",
  { tag: "@TC-ADMINCATEGORIES-022" },
  async ({ adminCategoriesPage, page }) => {
    await adminCategoriesPage.goto();
    await expect(adminCategoriesPage.dataRows()).toHaveCount(
      (await listAdminCategories(api)).length
    );
    const before = await adminCategoriesPage.dataRows().allInnerTexts();
    await page.route(MOVE_ROUTE, (route) =>
      route.fulfill({ status: 500, body: "{}" })
    );
    const moveUp = adminCategoriesPage.moveUpButtons().nth(1);
    const moveFailed = page.waitForResponse(
      (r) => r.url().includes("/move") && r.status() === 500
    );
    await moveUp.click();
    await moveFailed;
    // The mutation's onError awaits the list refetch, and the arrows stay
    // aria-disabled until the mutation settles — so this proves the refetch
    // after the failure has landed before the order is compared.
    await expect(moveUp).not.toHaveAttribute("aria-disabled");
    expect(await adminCategoriesPage.dataRows().allInnerTexts()).toEqual(
      before
    );
  }
);

test(
  "A tab with a stale order shows the server's order after a move",
  { tag: "@TC-ADMINCATEGORIES-023" },
  async ({ adminCategoriesPage }) => {
    await adminCategoriesPage.goto();
    const list = await listAdminCategories(api);
    // Another tab moves the last category to the top first.
    const last = list[list.length - 1];
    for (let i = 0; i < list.length - 1; i += 1) {
      await moveCategory(api, last._id, "up");
    }

    // This tab still shows `last` at the bottom. Its "up" is a no-op on the
    // server (already first), and the table must now show the server's order.
    await adminCategoriesPage.moveUpButton(last.name.en).click();
    await expect(adminCategoriesPage.dataRows().first()).toContainText(
      last.name.en
    );
  }
);

test(
  "Two concurrent moves never fail and leave distinct sort orders",
  { tag: "@TC-ADMINCATEGORIES-024" },
  async () => {
    const list = await listAdminCategories(api);
    const [a, b] = await Promise.all([
      moveCategory(api, list[1]._id, "up"),
      moveCategory(api, list[2]._id, "up")
    ]);
    expect(a.status()).toBe(200);
    expect(b.status()).toBe(200);
    const orders = (await listAdminCategories(api)).map((c) => c.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  }
);

test(
  "A move is announced with the category's new position",
  { tag: "@TC-ADMINCATEGORIES-072" },
  async ({ adminCategoriesPage }) => {
    await adminCategoriesPage.announcer.record();
    await adminCategoriesPage.goto();
    const second = await adminCategoriesPage.nameCell(1).innerText();
    const name = second.split("\n")[0];

    await adminCategoriesPage.moveUpButton(name).click();
    await expect(adminCategoriesPage.dataRows().first()).toContainText(name);
    await expect
      .poll(() => adminCategoriesPage.announcer.history())
      .toContain(fill(t.announce.moved, { name, position: 1 }));
  }
);
