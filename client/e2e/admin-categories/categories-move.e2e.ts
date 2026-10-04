import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CategoryApi, CATEGORIES_API } from "../helpers/categories";

// Feature `category-management` — ordering with ↑ / ↓ (DR-6, DR-15).
// Matrix rows: 1, 6 (BVA position), 10 (500), 11 (stale tab), 12 (focus).
// The original order is snapshotted and restored in afterAll.

test.describe.configure({ mode: "serial" });

let api: CategoryApi;
let originalOrder: string[];

const dataRows = (page: Page) =>
  page.getByRole("row").filter({ has: page.locator("td") });

test.beforeAll(async () => {
  api = await CategoryApi.login();
  originalOrder = (await api.list()).map((c) => c._id);
});

test.afterAll(async () => {
  await api.restoreOrder(originalOrder);
  await api.dispose();
});

test("moving the second row up makes it first, and focus stays on its arrow [row 1, 6, 12]", async ({
  page
}) => {
  await page.goto("/admin/categories");
  const second = await dataRows(page)
    .nth(1)
    .getByRole("cell")
    .nth(1)
    .innerText();
  const name = second.split("\n")[0];

  await page.getByRole("button", { name: `Move ${name} up` }).click();

  await expect(dataRows(page).first()).toContainText(name);
  await expect(
    page.getByRole("button", { name: `Move ${name} up` })
  ).toBeDisabled();
  // It reached the top, so focus falls back to its other arrow.
  await expect(
    page.getByRole("button", { name: `Move ${name} down` })
  ).toBeFocused();

  // Keyboard: press it to go back down.
  await page.keyboard.press("Enter");
  await expect(dataRows(page).nth(1)).toContainText(name);
  await expect(
    page.getByRole("button", { name: `Move ${name} down` })
  ).toBeFocused();
});

test("a failed move leaves the order unchanged [row 10]", async ({ page }) => {
  await page.goto("/admin/categories");
  await expect(dataRows(page)).toHaveCount((await api.list()).length);
  const before = await dataRows(page).allInnerTexts();
  await page.route(`**${CATEGORIES_API}/*/move`, (route) =>
    route.fulfill({ status: 500, body: "{}" })
  );
  await page
    .getByRole("button", { name: /^Move .+ up$/ })
    .nth(1)
    .click();
  await page.waitForTimeout(500);
  expect(await dataRows(page).allInnerTexts()).toEqual(before);
});

test("a tab with a stale order shows the server's order after moving [row 11 ST]", async ({
  page
}) => {
  await page.goto("/admin/categories");
  const list = await api.list();
  // Another tab moves the last category to the top first.
  const last = list[list.length - 1];
  for (let i = 0; i < list.length - 1; i += 1) await api.move(last._id, "up");

  // This tab still shows `last` at the bottom. Its "up" is a no-op on the
  // server (already first), and the table must now show the server's order.
  await page.getByRole("button", { name: `Move ${last.name.en} up` }).click();
  await expect(dataRows(page).first()).toContainText(last.name.en);
});

test("two concurrent moves never 500 and leave distinct sortOrders [row 11]", async () => {
  const list = await api.list();
  const [a, b] = await Promise.all([
    api.move(list[1]._id, "up"),
    api.move(list[2]._id, "up")
  ]);
  expect(a.status()).toBe(200);
  expect(b.status()).toBe(200);
  const orders = (await api.list()).map((c) => c.sortOrder);
  expect(new Set(orders).size).toBe(orders.length);
});
