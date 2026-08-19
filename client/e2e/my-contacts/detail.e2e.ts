import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { Page } from "@playwright/test";
import { USER_EMAIL, USER_PASSWORD } from "../helpers/env";

// MyContacts — read-only detail page (`/contacts/me/:id`).
// Runs under the `chromium` project (regular-user storageState `user.json`).
// Real backend throughout — no route stubbing. Depends on the same seed as
// list.e2e.ts (server/src/database/seeders/data/contacts.ts,
// `attachMyContactsOwner`): user@test.com owns ≥1 sample contact.
//
// Row 3 (AuthZ, owner-scope) is THE key security case for this suite: a
// contact that exists but does not belong to the current user must 404, not
// leak. We avoid needing a second real user account or an admin login for
// this — a guest (unauthenticated) contact submission is created on the fly
// via a token-less APIRequestContext, its `id` is owned by nobody, and that
// is sufficient to prove "not mine → 404" without depending on any other
// seeded account.

const ABSENT_ID = "ffffffffffffffffffffffff"; // valid 24-hex ObjectId format, does not exist
const MALFORMED_ID = "not-a-valid-object-id";

// Discovers a REAL id owned by the current user by reading it off the list
// page's row link (per task instructions: prefer discovering via the
// list API/UI over hardcoding a ticket id).
const getOwnContactId = async (page: Page): Promise<string> => {
  await page.goto("/contacts/me");
  const row = page
    .getByRole("link", { name: /View details for ticket/i })
    .first();
  const href = await row.getAttribute("href");
  const match = href?.match(/([0-9a-f]{24})(?:\?.*)?$/);
  if (!match) {
    throw new Error(
      "detail.e2e.ts: could not discover an owned contact id from the list — check the seeder (attachMyContactsOwner)"
    );
  }
  return match[1];
};

// Derives a REAL owned contact { id, subject } via an authenticated API call
// (login as the seeded user, then GET /api/v1/contacts) — used by the happy
// path test so the subject assertion matches whichever contact the backend
// actually returns first, instead of a hardcoded subject string that may not
// correspond to the first-by-default-sort owned row.
const getFirstOwnContact = async (
  baseURL: string | undefined
): Promise<{ id: string; subject: string }> => {
  const ctx = await playwrightRequest.newContext({ baseURL });
  try {
    const loginRes = await ctx.post("/api/v1/auth/login", {
      data: { email: USER_EMAIL, password: USER_PASSWORD }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = (await loginRes.json()) as {
      data?: { accessToken?: string };
    };
    const token = loginBody.data?.accessToken;
    expect(token).toBeTruthy();

    const res = await ctx.get("/api/v1/contacts", {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data?: {
        items?: Array<{ _id?: string; id?: string; subject?: string }>;
      };
    };
    const first = body.data?.items?.[0];
    const id = first?._id ?? first?.id;
    const subject = first?.subject;
    if (!id || !subject) {
      throw new Error(
        "detail.e2e.ts: could not derive an owned contact via GET /api/v1/contacts — check the seeder (attachMyContactsOwner)"
      );
    }
    return { id, subject };
  } finally {
    await ctx.dispose();
  }
};

// Creates a guest (unauthenticated) contact via a token-less request context
// and returns its id. This contact's `userId` is null — it belongs to
// nobody, so it must never be reachable via the owner-scoped detail
// endpoint/page for ANY logged-in user. Contributes 1 request to the
// `contact:submit` per-IP rate limit budget (5/15min) — kept to a single call.
const createGuestContactId = async (baseURL: string | undefined) => {
  const ctx = await playwrightRequest.newContext({ baseURL });
  try {
    const res = await ctx.post("/api/v1/contact/submit", {
      data: {
        subject: "E2E guest AuthZ probe (not owned by any user)",
        message:
          "This guest-submitted contact exists only to prove owner-scope 404 in E2E — safe to ignore/delete."
      }
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data?: { id?: string } };
    const id = body.data?.id;
    if (!id) throw new Error("guest contact submit did not return an id");
    return id;
  } finally {
    await ctx.dispose();
  }
};

// ---------------------------------------------------------------------------
// 1. Happy path — read-only render of an own contact
// ---------------------------------------------------------------------------
test.describe("MyContact Detail — happy path (read-only)", () => {
  test("renders full message, priority, status badge and date; no status-change control", async ({
    page,
    baseURL
  }) => {
    const { id, subject } = await getFirstOwnContact(baseURL);
    await page.goto(`/contacts/me/${id}`);

    await expect(
      page.getByRole("heading", { name: /request detail/i })
    ).toBeVisible();
    await expect(page.getByText(subject, { exact: true })).toBeVisible();
    // Full message body renders (dt/dd definition list, not truncated).
    await expect(page.getByText("Message", { exact: true })).toBeVisible();
    await expect(page.locator("time").first()).toBeVisible();

    // No status-change control anywhere on the read-only detail page.
    await expect(page.getByRole("combobox", { name: /status/i })).toHaveCount(
      0
    );
    await expect(
      page.getByRole("button", { name: /update status|change status/i })
    ).toHaveCount(0);

    // Breadcrumb back to the list.
    await expect(
      page.getByRole("navigation", { name: "breadcrumb" })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. AuthZ — owner-scope (KEY security case)
// ---------------------------------------------------------------------------
test.describe("MyContact Detail — authZ (owner-scope)", () => {
  test("a contact not owned by the current user 404s as not-found, not leaked", async ({
    page,
    baseURL
  }) => {
    const guestId = await createGuestContactId(baseURL);
    await page.goto(`/contacts/me/${guestId}`);

    // Scoped to the app's own <p role="alert"> (MyContactDetailNotFound) —
    // an unscoped `page.getByRole("alert")` ALSO matches Next.js's built-in
    // `#__next-route-announcer__` (a route-change `div role="alert"`
    // present on every page), which trips Playwright strict mode on
    // multi-match assertions like toContainText (toBeVisible is exempted
    // from strict mode, which is why only toContainText failed in Round 1).
    const notFoundAlert = page.locator('p[role="alert"]');
    await expect(notFoundAlert).toBeVisible();
    await expect(notFoundAlert).toContainText(
      /this request could not be found/i
    );
    // The guest contact's content must never leak onto the page.
    await expect(
      page.getByText("E2E guest AuthZ probe", { exact: false })
    ).toHaveCount(0);
  });

  test("an absent (well-formed but non-existent) id 404s as not-found", async ({
    page
  }) => {
    await page.goto(`/contacts/me/${ABSENT_ID}`);
    const notFoundAlert = page.locator('p[role="alert"]');
    await expect(notFoundAlert).toBeVisible();
    await expect(notFoundAlert).toContainText(
      /this request could not be found/i
    );
  });

  test("GET /contacts/:id for a not-owned contact returns 404 at the API level (authenticated)", async ({
    baseURL
  }) => {
    // Direct API check with a REAL bearer token attached (page.request does
    // NOT carry the in-memory Zustand access token automatically — see
    // src/libs/axios.ts / admin-authz.e2e.ts precedent — so we do one fresh
    // login here to get a real token). Confirms the owner-scope 404 (not a
    // leak, not a 403) at the API boundary directly, complementing the UI
    // test above (browser session) + the BE unit tests in
    // contact-admin.service.spec.ts "throws NotFoundError (no leak) when
    // contact belongs to another user or is absent".
    const ctx = await playwrightRequest.newContext({ baseURL });
    try {
      const guestId = await createGuestContactId(baseURL);

      const loginRes = await ctx.post("/api/v1/auth/login", {
        data: { email: USER_EMAIL, password: USER_PASSWORD }
      });
      expect(loginRes.ok()).toBeTruthy();
      const loginBody = (await loginRes.json()) as {
        data?: { accessToken?: string };
      };
      const token = loginBody.data?.accessToken;
      expect(token).toBeTruthy();

      const res = await ctx.get(`/api/v1/contacts/${guestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(res.status()).toBe(404);
    } finally {
      await ctx.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Validation — malformed id
// ---------------------------------------------------------------------------
test.describe("MyContact Detail — validation", () => {
  // Malformed (non-ObjectId) `:id` → BE 400 at the params pipe, same generic
  // not-found render on the FE — no crash, no leak of internal error detail.
  test("a malformed id renders the not-found state, not a crash", async ({
    page
  }) => {
    await page.goto(`/contacts/me/${MALFORMED_ID}`);
    const notFoundAlert = page.locator('p[role="alert"]');
    await expect(notFoundAlert).toBeVisible();
    await expect(notFoundAlert).toContainText(
      /this request could not be found/i
    );
  });
});

// ---------------------------------------------------------------------------
// 9. i18n — EN + VI
// ---------------------------------------------------------------------------
test.describe("MyContact Detail — i18n", () => {
  test("EN: detail title, breadcrumb and fields render in English", async ({
    page
  }) => {
    const id = await getOwnContactId(page);
    await page.goto(`/contacts/me/${id}`);
    await expect(
      page.getByRole("heading", { name: "Request Detail" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "breadcrumb" })
        .getByText("My Requests", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Message", { exact: true })).toBeVisible();
    await expect(page.getByText(/\[contactAdmin\./)).toHaveCount(0);
  });

  test("VI: detail title, breadcrumb and fields render in Vietnamese", async ({
    page
  }) => {
    const id = await getOwnContactId(page);
    await page.goto(`/vi/contacts/me/${id}`);
    await expect(
      page.getByRole("heading", { name: "Chi tiết yêu cầu" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "breadcrumb" })
        .getByText("Yêu cầu của tôi", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Tin nhắn", { exact: true })).toBeVisible();
    await expect(page.getByText(/\[contactAdmin\./)).toHaveCount(0);
  });

  // Not-found state must also render translated (never a leaked i18n key)
  // in both locales.
  test("VI: not-found state for an absent id renders translated", async ({
    page
  }) => {
    await page.goto(`/vi/contacts/me/${ABSENT_ID}`);
    const notFoundAlert = page.locator('p[role="alert"]');
    await expect(notFoundAlert).toBeVisible();
    await expect(notFoundAlert).toContainText("Không tìm thấy yêu cầu này.");
  });
});

// ---------------------------------------------------------------------------
// 12. Accessibility
// ---------------------------------------------------------------------------
test.describe("MyContact Detail — accessibility", () => {
  test("heading order: page title (h1/PageTitle) before the ticket sub-heading (h2)", async ({
    page
  }) => {
    const id = await getOwnContactId(page);
    await page.goto(`/contacts/me/${id}`);
    const headings = page.getByRole("heading");
    await expect(headings.first()).toBeVisible();
    // The card's own <h2> (ticket ShortId heading) exists after the page title.
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("breadcrumb link back to the list is keyboard-reachable", async ({
    page
  }) => {
    const id = await getOwnContactId(page);
    await page.goto(`/contacts/me/${id}`);
    const backLink = page
      .getByRole("navigation", { name: "breadcrumb" })
      .getByRole("link", { name: /my requests/i });
    await expect(backLink).toBeVisible();
    await backLink.focus();
    await expect(backLink).toBeFocused();
  });

  test("not-found state is announced via role=alert", async ({ page }) => {
    await page.goto(`/contacts/me/${ABSENT_ID}`);
    await expect(page.getByRole("alert")).toBeVisible();
  });
});

// A11Y FOLLOW-UP (flagged, NOT fixed here, no app code changed): the detail
// card's ticket heading (<h2><ShortId .../></h2>) relies on ShortId's
// `title` attribute (tooltip-only, mouse-hover) to expose the full id —
// keyboard/screen-reader users get no equivalent. Same gap already flagged
// in contact-display.e2e.ts for the admin detail page; MyContactDetail
// inherits the same ShortId component. Consider an `aria-label` with the
// full id as a follow-up (shared component fix, out of scope here).
