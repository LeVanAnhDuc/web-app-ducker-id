import { test, expect } from "@/fixtures";
import { copy, copyVi } from "@/data/copy";
import {
  SEED_GUEST_REQUEST_SUBJECT,
  SEED_MY_REQUESTS,
  SUPPORT_MESSAGE
} from "@/data/test-data";
import { MyRequestsPage } from "@/pages/dashboard/my-requests.page";
import {
  deleteSupportRequests,
  SHORT_ID_RE,
  supportSubject
} from "@/utils/contacts";
import { stubMyList } from "./helpers";

// My Requests — the user's own support tickets list (`/contacts/me`).
// Role: user (user@test.com); the access cases run as guest.
// Test cases: test-cases/support.md (TC-SUPPORT-001 … 018).
//
// Seed dependency (data/test-data.ts → SEED_MY_REQUESTS): three sample
// requests are attached to user@test.com, one per status — this file relies
// on those exact subjects / status / priority existing.
//
// Real backend throughout except the loading / failing cases, which stub the
// list endpoint on that page only. The one request this file files is deleted
// in afterAll (utils/contacts.ts → deleteSupportRequests).

const my = copy.contactAdmin.myContacts;
const statusLabel = copy.contactAdmin.admin.list.status;
const OWNED = SEED_MY_REQUESTS;

test.afterAll(async () => {
  await deleteSupportRequests();
});

test(
  "My Requests lists own requests and opens the detail",
  { tag: ["@TC-SUPPORT-001", "@smoke"] },
  async ({ page, myRequestsPage: list, myRequestDetailPage: detail }) => {
    await list.goto();
    await expect(list.table()).toBeVisible();

    // Ticket id column uses the ShortId format (first 6 hex chars + "..."),
    // never the raw 24-char ObjectId.
    await expect(list.textMatching(SHORT_ID_RE).first()).toBeVisible();

    // Subject + translated status badge + translated priority label for the
    // "new" owned sample.
    await expect(list.exactText(OWNED.new.subject)).toBeVisible();
    await expect(
      list.exactText(statusLabel[OWNED.new.status]).first()
    ).toBeVisible();
    await expect(
      list.exactText(my.priority[OWNED.new.priority]).first()
    ).toBeVisible();

    // Date rendered via a <time> element (FormatTime), not a raw ISO string.
    await expect(list.times().first()).toBeVisible();

    // Row → detail navigation via the row's accessible link overlay.
    await list.rowLinks().first().click();
    await expect(page).toHaveURL(/\/contacts\/me\/[0-9a-f]{24}/);

    // Detail: no status-change control.
    await expect(detail.heading()).toBeVisible();
    await expect(detail.statusCombobox()).toHaveCount(0);
  }
);

test.describe("unauthenticated", () => {
  test.use({ role: "guest" });

  test(
    "A guest is sent to login",
    { tag: ["@TC-SUPPORT-002", "@smoke"] },
    async ({ page, myRequestsPage: list }) => {
      await list.goto();
      await expect(page).toHaveURL(/login/);
    }
  );

  test(
    "The list endpoint without a token",
    { tag: ["@TC-SUPPORT-003", "@smoke"] },
    async ({ newApi }) => {
      const api = await newApi();
      const res = await api.contact.listMine();
      expect(res.status()).toBe(401);
    }
  );
});

// The list must ONLY ever show requests owned by the current user — a
// guest-submitted (userId=null) seeded request must never render here even
// though it exists in the `contacts` collection. Detail-level owner scope is
// in my-request-detail.e2e.ts.
test(
  "Guest and other users' requests never appear",
  { tag: ["@TC-SUPPORT-004", "@smoke"] },
  async ({ myRequestsPage: list }) => {
    await list.goto();
    await expect(list.exactText(OWNED.new.subject)).toBeVisible();
    await expect(list.exactText(SEED_GUEST_REQUEST_SUBJECT)).toHaveCount(0);
  }
);

test.describe("Tampered status / page params are sanitised", () => {
  // [EP] invalid status value → dropped client-side (useListQuery only keeps
  // filter values present in filterDefs options), table still renders.
  test(
    "invalid status=xyz is silently dropped — table renders unfiltered",
    { tag: "@TC-SUPPORT-005" },
    async ({ myRequestsPage: list }) => {
      await list.goto("?status=xyz");
      await expect(list.table()).toBeVisible();
      await expect(list.exactText(OWNED.new.subject)).toBeVisible();
      await expect(list.exactText(OWNED.processing.subject)).toBeVisible();
    }
  );

  // [BVA] page=abc sanitized to 1 — table still renders with data.
  test(
    "page=abc is sanitized to page=1 — table renders normally",
    { tag: "@TC-SUPPORT-005" },
    async ({ myRequestsPage: list }) => {
      await list.goto("?page=abc");
      await expect(list.table()).toBeVisible();
      await expect(list.exactText(OWNED.new.subject)).toBeVisible();
    }
  );
});

// A genuinely empty list (an account that never filed anything) is
// TC-SUPPORT-037, on a throwaway account in support-dialog.e2e.ts.
test.describe("No-match search and Clear filters", () => {
  test(
    "search with no match shows the empty state with Clear filters",
    { tag: "@TC-SUPPORT-006" },
    async ({ myRequestsPage: list }) => {
      await list.goto("?search=zzznomatch99999");
      await expect(list.clearFiltersButton()).toBeVisible();
      await expect(list.exactText(OWNED.new.subject)).toHaveCount(0);
    }
  );

  test(
    "clicking Clear filters restores the full list",
    { tag: "@TC-SUPPORT-006" },
    async ({ page, myRequestsPage: list }) => {
      await list.goto("?search=zzznomatch99999");
      await expect(list.clearFiltersButton()).toBeVisible();
      await list.clearFiltersButton().click();
      await expect(page).not.toHaveURL(/search=/);
      await expect(list.exactText(OWNED.new.subject)).toBeVisible();
    }
  );
});

test.describe("Page boundaries in the URL", () => {
  // [BVA] page=0 / page=-1 sanitized to page=1.
  for (const value of ["0", "-1"]) {
    test(
      `page=${value} is sanitized to page=1 — table renders normally`,
      { tag: "@TC-SUPPORT-007" },
      async ({ myRequestsPage: list }) => {
        await list.goto(`?page=${value}`);
        await expect(list.table()).toBeVisible();
        await expect(list.exactText(OWNED.new.subject)).toBeVisible();
      }
    );
  }

  // [BVA] page far beyond range → graceful empty state, no crash. Real
  // multi-page boundaries are TC-SUPPORT-044 at the API layer.
  test(
    "page=9999 beyond range does not crash — graceful empty state",
    { tag: "@TC-SUPPORT-007" },
    async ({ myRequestsPage: list }) => {
      await list.goto("?page=9999");
      const tableOrEmpty = list
        .table()
        .or(list.emptyText())
        .or(list.noResultsText());
      await expect(tableOrEmpty.first()).toBeVisible();
    }
  );
});

test(
  "Status filter",
  { tag: "@TC-SUPPORT-008" },
  async ({ myRequestsPage: list }) => {
    await list.goto("?status=resolved");
    await expect(list.exactText(OWNED.resolved.subject)).toBeVisible();
    await expect(list.exactText(OWNED.new.subject)).toHaveCount(0);
    await expect(list.exactText(OWNED.processing.subject)).toHaveCount(0);
  }
);

// [EP] search by (partial) subject match, persisted to the URL after the
// 300ms debounce.
test(
  "Search by subject, persisted in the URL",
  { tag: "@TC-SUPPORT-009" },
  async ({ page, myRequestsPage: list }) => {
    await list.goto();
    await list.searchInput().fill("dark mode");
    await page.waitForURL(/search=dark/, { timeout: 3000 });
    await expect(page).toHaveURL(/search=dark/);
    await expect(list.exactText(OWNED.resolved.subject)).toBeVisible();
    await expect(list.exactText(OWNED.new.subject)).toHaveCount(0);
  }
);

// [DT] filter + search — AND semantics.
test(
  "Status and search combine",
  { tag: "@TC-SUPPORT-010" },
  async ({ myRequestsPage: list }) => {
    await list.goto("?status=processing&search=billing");
    await expect(list.exactText(OWNED.processing.subject)).toBeVisible();
    await expect(list.exactText(OWNED.new.subject)).toHaveCount(0);
  }
);

test(
  "Filters survive a reload",
  { tag: "@TC-SUPPORT-011" },
  async ({ page, myRequestsPage: list }) => {
    await list.goto("?search=billing&status=processing");
    await expect(list.exactText(OWNED.processing.subject)).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/search=billing/);
    await expect(page).toHaveURL(/status=processing/);
    await expect(list.exactText(OWNED.processing.subject)).toBeVisible();
  }
);

test.describe("Status badge and date are rendered for people", () => {
  test(
    "status renders as a translated badge, never the raw enum",
    { tag: "@TC-SUPPORT-012" },
    async ({ myRequestsPage: list }) => {
      await list.goto("?status=new");
      await expect(
        list.exactText(statusLabel[OWNED.new.status]).first()
      ).toBeVisible();
      // The raw lowercase enum value must not appear as its own text node.
      await expect(list.exactText(OWNED.new.status)).toHaveCount(0);
    }
  );

  test(
    "date column renders formatted text, not a raw ISO timestamp",
    { tag: "@TC-SUPPORT-012" },
    async ({ myRequestsPage: list }) => {
      await list.goto();
      const timeEl = list.times().first();
      await expect(timeEl).toBeVisible();
      const text = await timeEl.textContent();
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    }
  );
});

test(
  "The ticket id is the ShortId form",
  { tag: "@TC-SUPPORT-013" },
  async ({ myRequestsPage: list }) => {
    await list.goto();
    const ticket = list.textMatching(SHORT_ID_RE).first();
    await expect(ticket).toBeVisible();
    await expect(ticket).toHaveText(SHORT_ID_RE);
  }
);

test(
  "My Requests in English",
  { tag: "@TC-SUPPORT-014" },
  async ({ myRequestsPage: list }) => {
    await list.goto();
    await expect(list.heading()).toBeVisible();
    await expect(list.columnHeader(my.table.ticketNumber)).toBeVisible();
    await expect(list.submitNewButton()).toBeVisible();
    await expect(list.leakedKey()).toHaveCount(0);
  }
);

test(
  "My Requests in Vietnamese",
  { tag: "@TC-SUPPORT-015" },
  async ({ page }) => {
    const list = new MyRequestsPage(page, copyVi, "/vi");
    await list.goto();
    await expect(list.heading()).toBeVisible();
    await expect(
      list.columnHeader(copyVi.contactAdmin.myContacts.table.ticketNumber)
    ).toBeVisible();
    await expect(list.submitNewButton()).toBeVisible();
    await expect(list.leakedKey()).toHaveCount(0);
  }
);

test.describe("Loading skeleton and a failing list", () => {
  test(
    "shows a skeleton while the list is loading",
    { tag: "@TC-SUPPORT-016" },
    async ({ page, myRequestsPage: list }) => {
      // Delay just long enough to reliably observe the skeleton before the
      // real backend would ever respond.
      await stubMyList(page, { delayMs: 600 });
      await list.goto();
      await expect(list.skeleton().first()).toBeVisible();
      // Eventually resolves to real data (route.continue() forwards to backend).
      await expect(list.exactText(OWNED.new.subject)).toBeVisible({
        timeout: 10000
      });
    }
  );

  test(
    "5xx from the list API settles into a stable, non-crashing state",
    { tag: "@TC-SUPPORT-016" },
    async ({ page, myRequestsPage: list }) => {
      await stubMyList(page, { status: 500 });
      await list.goto();
      // No retry-exhaustion crash — the page settles into the stable empty
      // state (React Query retries 5xx up to 2x with backoff; the transient
      // error toast auto-dismisses and is not asserted).
      await expect(list.emptyText()).toBeVisible({ timeout: 10000 });
    }
  );
});

// [ST] Submitting a new request while signed in attaches ownership and the
// list refetches to include it. A real write; afterAll deletes it. The
// guest submit is TC-SUPPORT-030 (support-dialog.e2e.ts).
test(
  "A request submitted from My Requests appears in the list",
  { tag: ["@TC-SUPPORT-017", "@smoke"] },
  async ({ myRequestsPage: list }) => {
    const dialog = list.supportDialog;
    const subject = supportSubject("my-requests");
    await list.goto();
    await list.submitNewButton().click();
    await expect(dialog.root()).toBeVisible();

    await dialog.fill(subject, SUPPORT_MESSAGE);
    await dialog.submit();

    // Success view shows a ticket code (ShortId format).
    await expect(dialog.ticketCode(SHORT_ID_RE)).toBeVisible({
      timeout: 10000
    });
    await dialog.closeButton().click();
    await expect(dialog.root()).not.toBeVisible();

    // List invalidates + refetches → the new request appears, owned by me.
    await expect(list.exactText(subject)).toBeVisible({ timeout: 10000 });
  }
);

test.describe("My Requests accessibility", () => {
  test(
    "search input and Filters button have accessible names",
    { tag: "@TC-SUPPORT-018" },
    async ({ myRequestsPage: list }) => {
      await list.goto();
      await expect(list.searchInput()).toBeVisible();
      await expect(list.filtersButton()).toBeVisible();
    }
  );

  test(
    "table row link is keyboard-reachable with a descriptive accessible name",
    { tag: "@TC-SUPPORT-018" },
    async ({ myRequestsPage: list }) => {
      await list.goto();
      const row = list.rowLinks().first();
      await row.focus();
      await expect(row).toBeFocused();
    }
  );

  test(
    "status badge renders as visible text, not color alone",
    { tag: "@TC-SUPPORT-018" },
    async ({ myRequestsPage: list }) => {
      await list.goto();
      await expect(
        list.exactText(statusLabel[OWNED.new.status]).first()
      ).toBeVisible();
    }
  );

  test(
    "Filters popover opens and closes with Escape",
    { tag: "@TC-SUPPORT-018" },
    async ({ page, myRequestsPage: list }) => {
      await list.goto();
      await list.filtersButton().click();
      await expect(list.filtersPopover()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(list.filtersPopover()).not.toBeVisible();
    }
  );
});
