import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page } from "@playwright/test";

// MyContacts — user's own contact tickets list (`/contacts/me`).
// Runs under the `chromium` project (regular-user storageState `user.json`,
// project user@test.com) — playwright.config.ts `testIgnore` on `chromium`
// only excludes admin-only suite folders, so `my-contacts/` is picked up by
// the existing glob without any config edit.
//
// Seed dependency (server/src/database/seeders/data/contacts.ts +
// contact.seeder.ts `attachMyContactsOwner`): 3 sample contacts are attached
// to user@test.com (MY_CONTACTS_SEED_OWNER_EMAIL), spanning all 3 statuses —
// this suite relies on those exact subjects/status/priority existing. If the
// seeder has not been run against the target DB, the happy-path/filter/data-
// rendering tests below will fail with "not visible" (see e2e.md
// Prerequisites). Idempotent — safe to re-run `yarn seed` any number of times.
//
// Real backend throughout (no `page.route` stubbing) EXCEPT the
// "error / loading" describe block, which stubs the list endpoint on that
// page only to force a deterministic loading/5xx window — mirrors the
// contact-display / admin-users precedent of testing against seeded data,
// while still allowing a controlled error simulation.

const OWNED = {
  new: {
    subject: "App crashes on launch after latest update",
    statusLabel: "New",
    priorityLabel: "High"
  },
  processing: {
    subject: "Billing question about pro plan",
    statusLabel: "Processing",
    priorityLabel: "Medium"
  },
  resolved: {
    subject: "Suggestion: dark mode for dashboard",
    statusLabel: "Resolved",
    priorityLabel: "Low"
  }
} as const;

// Seeded but NOT owned by user@test.com (guest submit, userId=null) — must
// never appear in MyContacts (data-isolation / AuthZ list-scope, Row 3).
const NOT_OWNED_SUBJECT = "Cannot login with Google OAuth";

const SHORT_ID_RE = /^[0-9a-f]{6}\.\.\.$/;
const LIST_API_RE = /\/api\/v1\/contacts(\?|$)/;

const goto = (page: Page, query = "") => page.goto(`/contacts/me${query}`);

// The app renders a GLOBAL header search in addition to the page list
// search — scope to the toolbar's role="search" landmark (same convention as
// unified-list/admin-users.e2e.ts).
const listSearch = (page: Page) =>
  page.getByRole("search").getByRole("textbox");

// ---------------------------------------------------------------------------
// 1. Happy path
// ---------------------------------------------------------------------------
test.describe("MyContacts — happy path", () => {
  test("list renders own contacts with ticket id, subject, status badge, priority and date; row navigates to detail", async ({
    page
  }) => {
    await goto(page);
    await expect(page.getByRole("table")).toBeVisible();

    // Ticket id column uses the ShortId format (first 6 hex chars + "..."),
    // never the raw 24-char ObjectId.
    await expect(page.getByText(SHORT_ID_RE).first()).toBeVisible();

    // Subject + translated status badge + translated priority label for the
    // "new" owned sample.
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(OWNED.new.statusLabel, { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText(OWNED.new.priorityLabel, { exact: true }).first()
    ).toBeVisible();

    // Date rendered via a <time> element (FormatTime), not a raw ISO string.
    await expect(page.locator("time").first()).toBeVisible();

    // Row → detail navigation via the row's accessible link overlay.
    const row = page.getByRole("link", {
      name: new RegExp(`View details for ticket`, "i")
    });
    await row.first().click();
    await expect(page).toHaveURL(/\/contacts\/me\/[0-9a-f]{24}/);

    // Detail: full message, status badge, no status-change control.
    await expect(
      page.getByRole("heading", { name: /request detail/i })
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: /status/i })).toHaveCount(
      0
    );
  });
});

// ---------------------------------------------------------------------------
// 2. AuthN — unauthenticated
// ---------------------------------------------------------------------------
test.describe("MyContacts — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated access to /contacts/me redirects to /login", async ({
    page
  }) => {
    await goto(page);
    await expect(page).toHaveURL(/login/);
  });

  test("GET /contacts with no token returns 401", async ({ baseURL }) => {
    const ctx = await playwrightRequest.newContext({ baseURL });
    try {
      const res = await ctx.get("/api/v1/contacts");
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. AuthZ — data isolation (list never leaks guest/other contacts)
// ---------------------------------------------------------------------------
test.describe("MyContacts — authZ (list data isolation)", () => {
  // Row 3: list must ONLY ever show contacts owned by the current user — a
  // guest-submitted (userId=null) seeded contact must never render here even
  // though it exists in the `contacts` collection. Detail-level owner-scope
  // (direct navigation to someone else's/absent id → 404) is covered in
  // detail.e2e.ts, which is the more security-critical surface for this row.
  test("guest/other contacts never render in the owner-scoped list", async ({
    page
  }) => {
    await goto(page);
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(NOT_OWNED_SUBJECT, { exact: true })
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Validation — tampered / invalid query params
// ---------------------------------------------------------------------------
test.describe("MyContacts — validation / tampered params", () => {
  // [EP] invalid status value → dropped client-side (useListQuery only keeps
  // filter values present in filterDefs options), table still renders.
  test("invalid status=xyz is silently dropped — table renders unfiltered", async ({
    page
  }) => {
    await goto(page, "?status=xyz");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(OWNED.processing.subject, { exact: true })
    ).toBeVisible();
  });

  // [BVA] page=abc sanitized to 1 — table still renders with data.
  test("page=abc is sanitized to page=1 — table renders normally", async ({
    page
  }) => {
    await goto(page, "?page=abc");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Empty / null
// ---------------------------------------------------------------------------
test.describe("MyContacts — empty / no-match", () => {
  // [EP] search with no match → empty state + Clear filters button.
  test("search with no match shows the empty state with Clear filters", async ({
    page
  }) => {
    await goto(page, "?search=zzznomatch99999");
    const clearBtn = page.getByRole("button", { name: /clear filters/i });
    await expect(clearBtn).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toHaveCount(0);
  });

  // NOTE (defer, documented in e2e.md): a genuinely EMPTY MyContacts
  // ("user has never submitted anything" — the `emptyTitle`/"Submit new"
  // empty-state) cannot be exercised against the shared seed user
  // (user@test.com always owns ≥3 sample contacts per the seeder). Would
  // require a dedicated throwaway user with zero contacts — out of scope for
  // this suite; the empty-state COMPONENT itself is exercised above via the
  // "no search match" path (same PageEmptyState, hasActiveFilters branch).

  test("clicking Clear filters restores the full list", async ({ page }) => {
    await goto(page, "?search=zzznomatch99999");
    await expect(
      page.getByRole("button", { name: /clear filters/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /clear filters/i }).click();
    await expect(page).not.toHaveURL(/search=/);
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Boundary / pagination
// ---------------------------------------------------------------------------
test.describe("MyContacts — boundary / pagination", () => {
  // [BVA] page=0 / page=-1 sanitized to page=1.
  test("page=0 is sanitized to page=1 — table renders normally", async ({
    page
  }) => {
    await goto(page, "?page=0");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
  });

  test("page=-1 is sanitized to page=1 — table renders normally", async ({
    page
  }) => {
    await goto(page, "?page=-1");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible();
  });

  // [BVA] page far beyond range → graceful empty state, no crash. NOTE
  // (defer, documented in e2e.md): with only 3 owned seed contacts (< 1 page
  // of `DEFAULT_PAGE_SIZE=20`), this can only ever exercise the "beyond range
  // of a single page" case, never a real second-page dataset — deep
  // pagination across ≥2 real pages is deferred (matches design.md matrix
  // Row 6 defer note).
  test("page=9999 beyond range does not crash — graceful empty state", async ({
    page
  }) => {
    await goto(page, "?page=9999");
    const tableOrEmpty = page
      .getByRole("table")
      .or(page.getByText(/no requests submitted yet/i))
      .or(page.getByText(/no results found/i));
    await expect(tableOrEmpty.first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 7. Filter / search
// ---------------------------------------------------------------------------
test.describe("MyContacts — filter / search", () => {
  test("status filter shows only the matching contact", async ({ page }) => {
    await goto(page, `?status=resolved`);
    await expect(
      page.getByText(OWNED.resolved.subject, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText(OWNED.processing.subject, { exact: true })
    ).toHaveCount(0);
  });

  // [EP] search by (partial) subject match, persisted to the URL after the
  // 300ms debounce.
  test("typing in search filters by subject and persists in the URL", async ({
    page
  }) => {
    await goto(page);
    const searchBox = listSearch(page);
    await searchBox.fill("dark mode");
    await page.waitForURL(/search=dark/, { timeout: 3000 });
    await expect(page).toHaveURL(/search=dark/);
    await expect(
      page.getByText(OWNED.resolved.subject, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toHaveCount(0);
  });

  // [DT] combine filter + search — AND semantics.
  test("combined status + search filters apply together", async ({ page }) => {
    await goto(page, "?status=processing&search=billing");
    await expect(
      page.getByText(OWNED.processing.subject, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toHaveCount(0);
  });

  // Reload preserves search + filter state from the URL.
  test("reload preserves search and status filter state", async ({ page }) => {
    await goto(page, "?search=billing&status=processing");
    await expect(
      page.getByText(OWNED.processing.subject, { exact: true })
    ).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/search=billing/);
    await expect(page).toHaveURL(/status=processing/);
    await expect(
      page.getByText(OWNED.processing.subject, { exact: true })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. Data rendering
// ---------------------------------------------------------------------------
test.describe("MyContacts — data rendering", () => {
  test("status renders as a translated badge, never the raw enum", async ({
    page
  }) => {
    await goto(page, "?status=new");
    await expect(
      page.getByText(OWNED.new.statusLabel, { exact: true }).first()
    ).toBeVisible();
    // Raw lowercase enum value must not appear as its own visible text node.
    await expect(page.getByText("new", { exact: true })).toHaveCount(0);
  });

  test("ticket id renders as the ShortId form, never the full raw ObjectId", async ({
    page
  }) => {
    await goto(page);
    const shortId = page.getByText(SHORT_ID_RE).first();
    await expect(shortId).toBeVisible();
    await expect(shortId).toHaveText(SHORT_ID_RE);
  });

  test("date column renders formatted text, not a raw ISO timestamp", async ({
    page
  }) => {
    await goto(page);
    const timeEl = page.locator("time").first();
    await expect(timeEl).toBeVisible();
    const text = await timeEl.textContent();
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });
});

// ---------------------------------------------------------------------------
// 9. i18n — EN + VI
// ---------------------------------------------------------------------------
test.describe("MyContacts — i18n", () => {
  test("EN: title, table headers and filters render in English", async ({
    page
  }) => {
    await goto(page);
    await expect(
      page.getByRole("heading", { name: "My Requests" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Ticket" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /submit new request/i })
    ).toBeVisible();
    await expect(page.getByText(/\[contactAdmin\./)).toHaveCount(0);
  });

  test("VI: title, table headers and filters render in Vietnamese", async ({
    page
  }) => {
    await page.goto("/vi/contacts/me");
    await expect(
      page.getByRole("heading", { name: "Yêu cầu của tôi" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Mã ticket" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /gửi yêu cầu mới/i })
    ).toBeVisible();
    await expect(page.getByText(/\[contactAdmin\./)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Error / loading
// ---------------------------------------------------------------------------
test.describe("MyContacts — error / loading", () => {
  test("shows a skeleton while the list is loading", async ({ page }) => {
    await page.route(LIST_API_RE, async (route) => {
      // Delay just long enough to reliably observe the skeleton before the
      // real backend would ever respond.
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await goto(page);
    await expect(page.locator(".animate-pulse").first()).toBeVisible();
    // Eventually resolves to real data (route.continue() forwards to backend).
    await expect(
      page.getByText(OWNED.new.subject, { exact: true })
    ).toBeVisible({ timeout: 10000 });
  });

  test("5xx from the list API settles into a stable, non-crashing state", async ({
    page
  }) => {
    await page.route(LIST_API_RE, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          path: "/api/v1/contacts",
          message: "Internal server error",
          code: "INTERNAL_ERROR"
        })
      })
    );
    await goto(page);
    // No retry-exhaustion crash — page settles into the stable empty state
    // (React Query retries 5xx up to 2x with backoff, then this is what
    // remains once retries are exhausted; the transient error toast is not
    // asserted here as it auto-dismisses — same convention as admin-authz.e2e.ts).
    await expect(page.getByText(/no requests submitted yet/i)).toBeVisible({
      timeout: 10000
    });
  });
});

// ---------------------------------------------------------------------------
// 11. Mutation safety — Gate A only (real, persistent mutation)
// ---------------------------------------------------------------------------
test.describe("MyContacts — mutation safety (submit new)", () => {
  // [ST] Submitting a new request while logged in attaches ownership and the
  // list refetches to include it. This is a REAL, persistent mutation
  // (append-only — no revert needed per design.md §11 Follow-up/defer: guest-
  // submit-no-owner is covered by the BE unit test
  // `contact-admin.service.spec.ts` "sets userId null for a guest submit").
  // A OWN gate — not driven concurrently by Gate B (MCP walk) to avoid
  // contaminating list assertions in the parallel gate.
  test("submitting a new request while logged in shows it in the list after refetch", async ({
    page
  }) => {
    const uniqueSubject = `E2E MyContacts submit ${Date.now()}`;
    await goto(page);

    await page.getByRole("button", { name: /submit new request/i }).click();

    const dialog = page.getByRole("dialog", { name: /contact support/i });
    await expect(dialog).toBeVisible();

    // Robust field locators by RHF field `name` (CONSTANTS.FIELD_NAMES.
    // SUPPORT_FIELD_NAMES), NOT getByLabel: SubjectField (and EmailField)
    // build their input via `useFieldProps` (src/hooks/useFieldProps.ts),
    // which sets `field.id = field.name` (e.g. "subject") — that explicit
    // `id` on the underlying <CustomInput> wins over the id injected by the
    // shadcn <FormControl> Radix Slot (the auto-generated `formItemId`,
    // which is what <FormLabel>'s `htmlFor` actually points to). Net
    // effect: the "Subject" <label> is NOT programmatically associated with
    // its <input> — a real a11y gap in app code (out of scope here, do not
    // fix). MessageField (Controller-based, no id override) IS correctly
    // associated, but the `name` selector is used for both for consistency.
    await dialog.locator('input[name="subject"]').fill(uniqueSubject);
    await dialog
      .locator('textarea[name="message"]')
      .fill(
        "E2E-generated support request body, at least twenty characters long."
      );
    await dialog.getByRole("button", { name: /send request/i }).click();

    // Success view shows a ticket code (ShortId format).
    await expect(dialog.getByText(SHORT_ID_RE)).toBeVisible({
      timeout: 10000
    });
    // `dialog.getByRole("button", { name: /^close$/i })` is ambiguous:
    // shadcn's <DialogContent> injects its own icon-only close button
    // (data-slot="dialog-close", accessible name "Close" via sr-only text)
    // IN ADDITION to SupportSuccess's own explicit CustomButton — both
    // resolve to the "Close" accessible name. Scope to the explicit button
    // (data-slot="button", the shadcn Button/CustomButton wrapper) to avoid
    // the strict-mode collision.
    await dialog
      .locator('button[data-slot="button"]', { hasText: /^close$/i })
      .click();
    await expect(dialog).not.toBeVisible();

    // List invalidates + refetches → the new request appears, owned by me.
    await expect(page.getByText(uniqueSubject, { exact: true })).toBeVisible({
      timeout: 10000
    });
  });
});

// ---------------------------------------------------------------------------
// 12. Accessibility
// ---------------------------------------------------------------------------
test.describe("MyContacts — accessibility", () => {
  test("search input and Filters button have accessible names", async ({
    page
  }) => {
    await goto(page);
    await expect(listSearch(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  });

  test("table row link is keyboard-reachable with a descriptive accessible name", async ({
    page
  }) => {
    await goto(page);
    const row = page
      .getByRole("link", { name: /View details for ticket/i })
      .first();
    await row.focus();
    await expect(row).toBeFocused();
  });

  test("status badge renders as visible text, not color alone", async ({
    page
  }) => {
    await goto(page);
    await expect(
      page.getByText(OWNED.new.statusLabel, { exact: true }).first()
    ).toBeVisible();
  });

  test("Filters popover opens and closes with Escape", async ({ page }) => {
    await goto(page);
    await page.getByRole("button", { name: /filters/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
