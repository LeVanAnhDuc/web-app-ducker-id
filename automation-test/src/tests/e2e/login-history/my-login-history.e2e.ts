import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import { LoginHistoryPage } from "@/pages/dashboard/login-history.page";
import { IDP_ROW, row, stubList } from "./helpers";

// The user's own Login History page (/login-history) — how IP, location and
// device are rendered. Role: user. Read-only; the list endpoint is stubbed so
// assertions do not depend on the data.
// Test cases: test-cases/login-history.md (TC-LOGINHISTORY-001 … 003, 028).

const t = copy.loginHistory;

test.describe("My Login History — location/IP rendering (LOCAL)", () => {
  // Row 1 Happy + Row 4 EP [country="LOCAL"/ip loopback] + Row 8 DT
  // [city sentinel → country-label only] (en). The row must show the
  // normalized loopback IP (never the raw `::1`/`::ffff:` forms the BE used to
  // emit) and the localized "Local" label (never the raw "LOCAL" sentinel).
  test(
    'Loopback IP and the "Local" location label',
    { tag: "@TC-LOGINHISTORY-001" },
    async ({ page, loginHistoryPage: list }) => {
      await stubList(page, [IDP_ROW]);
      await list.goto();
      await expect(list.text("127.0.0.1")).toBeVisible();
      await expect(list.text("::1")).toHaveCount(0);
      await expect(list.text("::ffff:")).toHaveCount(0);
      await expect(list.text(t.location.local, true)).toBeVisible();
      await expect(list.text("LOCAL", true)).toHaveCount(0);
    }
  );

  // Row 9 i18n (vi). Same LOCAL stub under the vi locale — label must be the
  // vi translation "Nội bộ (Local)", never the raw "LOCAL" sentinel.
  test(
    'The "Local" label in Vietnamese',
    { tag: "@TC-LOGINHISTORY-002" },
    async ({ page }) => {
      const list = new LoginHistoryPage(page, copyVi, "/vi");
      await stubList(page, [IDP_ROW]);
      await list.goto();
      await expect(
        list.text(copyVi.loginHistory.location.local, true)
      ).toBeVisible();
      await expect(list.text("LOCAL", true)).toHaveCount(0);
    }
  );
});

test.describe("My Login History — stats moved to Home", () => {
  test(
    "The summary stat cards moved to Home",
    { tag: "@TC-LOGINHISTORY-003" },
    async ({ page, loginHistoryPage: list }) => {
      await stubList(page, [IDP_ROW]);
      await list.goto();
      await expect(list.text("127.0.0.1")).toBeVisible();
      await expect(list.legacyStatsGroup()).toHaveCount(0);
    }
  );
});

// [EP] the other sentinel class: geoip could not place a public address
// (country / city UNKNOWN), and the user agent named no device type.
test(
  "An unknown location and device fall back to labels",
  { tag: "@TC-LOGINHISTORY-028" },
  async ({ page, loginHistoryPage: list }) => {
    await stubList(page, [
      row(1, {
        ip: "198.51.*.*",
        country: "UNKNOWN",
        city: "UNKNOWN",
        deviceType: "UNKNOWN",
        browser: "Firefox 130"
      })
    ]);
    await list.goto();
    const r = list.row("198.51.*.*");
    await expect(r).toBeVisible();
    await expect(list.exactText(t.location.unknown, r)).toBeVisible();
    await expect(list.exactText("UNKNOWN", r)).toHaveCount(0);
    await expect(list.exactText("Firefox 130", r)).toBeVisible();
    await expect(r).not.toContainText("UNKNOWN ·");
  }
);
