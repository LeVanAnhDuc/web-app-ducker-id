import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { AdminAppsPage } from "@/pages/admin/admin-apps.page";

test.use({ role: "admin" });

// /admin/apps column controls — client-side sort, URL-driven sort state and
// responsive hideBelow columns (REQ-ADMINAPPS-01).
// Test cases: test-cases/admin-apps.md (TC-ADMINAPPS-001 … TC-ADMINAPPS-009).

// Sort is CLIENT-SIDE + read-only (no DB write) → no revert needed.
// Requires ≥2 seeded apps to assert ordering (seed has blog/notes/… → OK).

const columns = copy.adminApps.table;

const isSortedAsc = (names: string[]) =>
  names.every(
    (n, i) => i === 0 || names[i - 1].toLowerCase() <= n.toLowerCase()
  );

const isSortedDesc = (names: string[]) =>
  names.every(
    (n, i) => i === 0 || names[i - 1].toLowerCase() >= n.toLowerCase()
  );

/** Opens the list (optionally with a query) and waits for the first row. */
const openList = async (adminAppsPage: AdminAppsPage, query = "") => {
  await adminAppsPage.goto(query);
  await expect(adminAppsPage.heading()).toBeVisible();
  await expect(adminAppsPage.tableRows().first()).toBeVisible();
};

test.describe("List Table Column Controls — AdminApps sort", () => {
  // ── #1 Happy path: asc then desc ──
  test(
    "Sorting by App orders ascending then descending",
    { tag: "@TC-ADMINAPPS-001" },
    async ({ adminAppsPage }) => {
      await openList(adminAppsPage);
      const appHeader = adminAppsPage.sortableHeader(columns.app);

      await adminAppsPage.sortButton(columns.app).click();
      await expect(appHeader).toHaveAttribute("aria-sort", "ascending");
      expect(
        isSortedAsc(await adminAppsPage.appNames().allTextContents())
      ).toBe(true);

      await adminAppsPage.sortButton(columns.app).click();
      await expect(appHeader).toHaveAttribute("aria-sort", "descending");
      expect(
        isSortedDesc(await adminAppsPage.appNames().allTextContents())
      ).toBe(true);
    }
  );

  // ── #6a toggle 2-state + #6b switch column (invalid transition) + #12b single active ──
  test(
    "The sort toggle cycles and only one column is sorted at a time",
    { tag: "@TC-ADMINAPPS-002" },
    async ({ adminAppsPage }) => {
      await openList(adminAppsPage);
      const appHeader = adminAppsPage.sortableHeader(columns.app);
      const sortApp = adminAppsPage.sortButton(columns.app);

      await sortApp.click();
      await expect(appHeader).toHaveAttribute("aria-sort", "ascending");
      await sortApp.click();
      await expect(appHeader).toHaveAttribute("aria-sort", "descending");
      await sortApp.click();
      await expect(appHeader).toHaveAttribute("aria-sort", "ascending");

      // switch to Last Updated → App resets to "none", Updated becomes ascending
      await adminAppsPage.sortButton(columns.updatedAt).click();
      await expect(
        adminAppsPage.sortableHeader(columns.updatedAt)
      ).toHaveAttribute("aria-sort", "ascending");
      await expect(appHeader).toHaveAttribute("aria-sort", "none");

      // #12b — only one column has a non-"none" aria-sort at a time
      expect(await adminAppsPage.sortedHeaders().count()).toBe(1);
    }
  );

  // ── #7a URL persist + reload ──
  test(
    "The sort lives in the URL and survives a reload",
    { tag: "@TC-ADMINAPPS-003" },
    async ({ page, adminAppsPage }) => {
      await openList(adminAppsPage);

      await adminAppsPage.sortButton(columns.app).click();
      await expect(page).toHaveURL(/sortBy=app/);
      await expect(page).toHaveURL(/sortOrder=asc/);

      await page.reload();
      await expect(adminAppsPage.sortableHeader(columns.app)).toHaveAttribute(
        "aria-sort",
        "ascending"
      );
    }
  );

  // ── #7b deep-link pre-set sort on first load ──
  test(
    "A deep-linked sort applies on first load",
    { tag: "@TC-ADMINAPPS-004" },
    async ({ adminAppsPage }) => {
      await openList(adminAppsPage, "?sortBy=app&sortOrder=desc");
      await expect(adminAppsPage.sortableHeader(columns.app)).toHaveAttribute(
        "aria-sort",
        "descending"
      );
      expect(
        isSortedDesc(await adminAppsPage.appNames().allTextContents())
      ).toBe(true);
    }
  );

  // ── #7c filter + sort combined ──
  test(
    "Sorting works inside an active status filter",
    { tag: "@TC-ADMINAPPS-005" },
    async ({ adminAppsPage }) => {
      await openList(adminAppsPage, "?status=active&sortBy=app&sortOrder=asc");
      await expect(adminAppsPage.sortableHeader(columns.app)).toHaveAttribute(
        "aria-sort",
        "ascending"
      );
      expect(
        isSortedAsc(await adminAppsPage.appNames().allTextContents())
      ).toBe(true);
    }
  );

  // ── #4a/#4b/#4c invalid sortBy / sortOrder → no crash, no reorder ──
  test.describe("Invalid sort parameters are ignored without a crash", () => {
    test(
      "ignores a sortBy with no accessor without crashing",
      { tag: "@TC-ADMINAPPS-006" },
      async ({ adminAppsPage }) => {
        await openList(adminAppsPage, "?sortBy=status");
        await expect(adminAppsPage.tableRows().first()).toBeVisible();
        // status column is not sortable → its header has no aria-sort
        await expect(
          adminAppsPage.columnHeader(columns.status)
        ).not.toHaveAttribute("aria-sort");
      }
    );

    test(
      "ignores a garbage sortBy without crashing",
      { tag: "@TC-ADMINAPPS-006" },
      async ({ adminAppsPage }) => {
        await openList(adminAppsPage, "?sortBy=___bogus&sortOrder=asc");
        await expect(adminAppsPage.tableRows().first()).toBeVisible();
      }
    );

    test(
      "ignores an invalid sortOrder without crashing",
      { tag: "@TC-ADMINAPPS-006" },
      async ({ adminAppsPage }) => {
        await openList(adminAppsPage, "?sortBy=app&sortOrder=sideways");
        // invalid order → useListQuery yields undefined → column not marked sorted
        await expect(adminAppsPage.sortableHeader(columns.app)).toHaveAttribute(
          "aria-sort",
          "none"
        );
      }
    );
  });

  // ── #12a a11y keyboard ──
  test(
    "The sort header is keyboard operable",
    { tag: "@TC-ADMINAPPS-007" },
    async ({ page, adminAppsPage }) => {
      await openList(adminAppsPage);
      const btn = adminAppsPage.sortButton(columns.app);
      await btn.focus();
      await expect(btn).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(adminAppsPage.sortableHeader(columns.app)).toHaveAttribute(
        "aria-sort",
        "ascending"
      );
    }
  );

  // ── R responsive hideBelow (BVA on breakpoints) ──
  test(
    "Breakpoint columns hide below their threshold",
    { tag: "@TC-ADMINAPPS-008" },
    async ({ page, adminAppsPage }) => {
      await openList(adminAppsPage);

      // Category → hidden below sm (640)
      await page.setViewportSize({ width: 639, height: 900 });
      await expect(
        adminAppsPage.columnHeader(columns.category)
      ).not.toBeVisible();
      await page.setViewportSize({ width: 640, height: 900 });
      await expect(adminAppsPage.columnHeader(columns.category)).toBeVisible();

      // Redirect URIs → hidden below md (768)
      await page.setViewportSize({ width: 767, height: 900 });
      await expect(
        adminAppsPage.columnHeader(columns.redirectUris)
      ).not.toBeVisible();
      await page.setViewportSize({ width: 768, height: 900 });
      await expect(
        adminAppsPage.columnHeader(columns.redirectUris)
      ).toBeVisible();
    }
  );

  // ── #9 i18n (vi) ──
  test(
    "Sorting works in Vietnamese with localized labels",
    { tag: "@TC-ADMINAPPS-009" },
    async ({ page }) => {
      const vi = new AdminAppsPage(page, copyVi, "/vi");
      await vi.goto();
      await expect(vi.tableRows().first()).toBeVisible();
      const viSortBtn = vi.sortButtons();
      await expect(viSortBtn.first()).toBeVisible();
      await viSortBtn.first().click();
      await expect(page).toHaveURL(/sortBy=/);
      await expect(vi.sortedHeaders()).toHaveCount(1);
    }
  );
});
