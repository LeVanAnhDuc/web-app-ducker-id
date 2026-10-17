import { test, expect } from "@/fixtures";
import type { Request } from "@playwright/test";
import { copy } from "@/data/copy";
import { SILENT_SSO_RECORD, stubDetail, stubList } from "./helpers";

test.use({ role: "admin" });

// Admin login history — where a sign-in came from (REQ-ADMINLOGINHISTORY-01/02):
// the App column on the list and Source / App / Sign-in type on the detail.
// Runs as admin (role fixture). Every response is stubbed with `page.route`;
// nothing touches the DB. Test cases: test-cases/admin-login-history.md.

const t = copy.loginHistory;

test.describe("Admin Login History — app source", () => {
  // Row 1 + Row 7: admin sees every row by default (no interactive param) and
  // the app column renders the satellite app with the Auto badge.
  test(
    'The App column shows the satellite app and "Auto"',
    { tag: "@TC-ADMINLOGINHISTORY-005" },
    async ({ adminLoginHistoryPage: list, page }) => {
      const seen: Request[] = [];
      await stubList(page, [SILENT_SSO_RECORD], { seen });
      await list.goto();

      const row = list.row(SILENT_SSO_RECORD.app!.name);
      await expect(row).toBeVisible();
      await expect(row.getByText(t.app.silent, { exact: true })).toBeVisible();
      const query = new URL(seen[seen.length - 1].url()).searchParams;
      expect(query.has("interactive")).toBe(false);
    }
  );

  // Row 8: detail adds Source / App / Sign-in type.
  test(
    "Detail shows source, app and sign-in type",
    { tag: ["@TC-ADMINLOGINHISTORY-014", "@smoke"] },
    async ({ adminLoginHistoryDetailPage: detail, page }) => {
      await stubDetail(page, SILENT_SSO_RECORD);
      await detail.goto(SILENT_SSO_RECORD._id);

      await expect(detail.text(t.app.sourceOauth)).toBeVisible();
      await expect(detail.text(SILENT_SSO_RECORD.app!.name)).toBeVisible();
      await expect(detail.text(t.app.silentLong)).toBeVisible();
    }
  );
});
