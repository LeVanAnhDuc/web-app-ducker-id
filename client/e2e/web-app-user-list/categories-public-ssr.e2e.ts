import { test, expect, request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import {
  BASE_URL,
  USER_EMAIL,
  USER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD
} from "../helpers/env";

// Reconciliation for feature `apps-category-ssr` (design.md / e2e.md in the
// docs repo): `GET /api/v1/apps/categories` became a PUBLIC endpoint
// (optionalAuthGuard + per-IP rate-limit + `Cache-Control: public,
// max-age=300`), and the `/apps` page now fetches categories in a Next.js
// Server Component (`getServerAppCategories`, no auth header) and passes them
// as a prop to the client `AppsBoard`. On a server-fetch failure, `AppsBoard`
// falls back to the existing client hook `useAppCategories()`. The apps LIST
// (`GET /api/v1/apps`) is UNCHANGED — still `authGuard`, still client-fetched.
//
// Read-only: every test here only performs GET requests (or a stubbed route).
// Nothing to revert.

const CATEGORIES_PATH = "/api/v1/apps/categories";
const APPS_PATH = "/api/v1/apps";

async function loginToken(
  ctx: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email, password }
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body.data?.accessToken;
  expect(token).toBeTruthy();
  return token as string;
}

test.describe("GET /api/v1/apps/categories — public endpoint", () => {
  // Row: anon + user + admin all get 200 with byte-identical arrays.
  test("anon, user, and admin all get 200 with identical category arrays", async ({
    browser
  }) => {
    // anon: fresh context, no storageState, no cookies.
    const anonCtx = await browser.newContext({ storageState: undefined });
    await anonCtx.clearCookies();
    const anonPage: Page = await anonCtx.newPage();

    const apiCtx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    try {
      const userToken = await loginToken(apiCtx, USER_EMAIL, USER_PASSWORD);
      const adminToken = await loginToken(apiCtx, ADMIN_EMAIL, ADMIN_PASSWORD);

      const [anonRes, userRes, adminRes] = await Promise.all([
        anonPage.request.get(CATEGORIES_PATH),
        apiCtx.get(CATEGORIES_PATH, {
          headers: { Authorization: `Bearer ${userToken}` }
        }),
        apiCtx.get(CATEGORIES_PATH, {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      ]);

      expect(anonRes.status()).toBe(200);
      expect(userRes.status()).toBe(200);
      expect(adminRes.status()).toBe(200);

      const [anonBody, userBody, adminBody] = await Promise.all([
        anonRes.json(),
        userRes.json(),
        adminRes.json()
      ]);

      expect(anonBody.data).toEqual(userBody.data);
      expect(userBody.data).toEqual(adminBody.data);
    } finally {
      await apiCtx.dispose();
      await anonCtx.close();
    }
  });

  // Row: behavior cliff — a present-but-invalid Bearer is still rejected
  // (optionalAuthGuard delegates to authGuard when a header is present), while
  // no header passes through anonymous (200). Note: the app maps an invalid
  // JWT to HTTP 403 (code JWT_INVALID), not 401 — this is pre-existing global
  // auth behavior, not specific to this feature. The point of the cliff is
  // that a bad token does NOT silently degrade to anonymous.
  test("rejects a garbage Bearer token but allows no header (200) [EP]", async ({
    page
  }) => {
    const noHeaderRes = await page.request.get(CATEGORIES_PATH, {
      headers: { Authorization: "" }
    });
    expect(noHeaderRes.status()).toBe(200);

    const garbageRes = await page.request.get(CATEGORIES_PATH, {
      headers: { Authorization: "Bearer garbage" }
    });
    expect(garbageRes.status()).toBe(403);
  });

  // Row: Cache-Control header present. category-management (DR-19) cut it
  // from 300s to 60s so a renamed or deleted category leaves the filter fast.
  test("response carries Cache-Control: public, max-age=60", async ({
    page
  }) => {
    const res = await page.request.get(CATEGORIES_PATH);
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("public, max-age=60");
  });
});

test.describe("Apps catalog (/apps) — SSR category prop", () => {
  // Reconciled for category-management (DR-19): the SSR list now SEEDS the
  // client cache instead of replacing the client fetch. The filter renders
  // from server data straight away, and the client refetches exactly once on
  // mount so a category deleted within the SSR cache window disappears.
  test("loading /apps renders the filter from SSR data and refetches once", async ({
    page
  }) => {
    let categoriesRequests = 0;
    page.on("request", (req) => {
      if (req.url().includes("/apps/categories")) categoriesRequests += 1;
    });

    const listResponse = page.waitForResponse(
      (r) => r.url().includes(APPS_PATH) && r.status() === 200
    );
    await page.goto("/vi/apps");
    await listResponse;
    await page.waitForTimeout(1000);

    expect(categoriesRequests).toBe(1);
  });
});

test.describe("Apps catalog (/apps) — category i18n", () => {
  // Row: filter group label differs per locale.
  test("filter group label is localized per locale (en vs vi)", async ({
    page
  }) => {
    // EN first: a fresh page has no NEXT_LOCALE cookie yet, so the prefix-less
    // "/apps" resolves to the default (en). (Doing VI first would set a vi
    // cookie that makes the later prefix-less "/apps" resolve to vi.)
    await page.goto("/apps");
    await page.waitForResponse(
      (r) => r.url().includes(APPS_PATH) && r.status() === 200
    );
    await page.getByRole("button", { name: /Filters/i }).click();
    await expect(page.getByText("Filter by category")).toBeVisible();
    await page.keyboard.press("Escape");

    // VI via explicit "/vi/" path — the path prefix forces vi regardless of
    // any cookie the en visit may have set.
    await page.goto("/vi/apps");
    await page.waitForResponse(
      (r) => r.url().includes(APPS_PATH) && r.status() === 200
    );
    await page.getByRole("button", { name: /Bộ lọc/i }).click();
    await expect(page.getByText("Lọc theo danh mục")).toBeVisible();
  });
});

test.describe("Apps catalog (/apps) — categoryId deep link", () => {
  // Row: deep-link with a valid categoryId cold-loads with the filter
  // pre-selected, options present, and the list filtered accordingly.
  test("deep-link /vi/apps?categoryId=<validId> pre-selects the filter and filters the list", async ({
    page
  }) => {
    // Discover a real category id from the (now-public) categories endpoint.
    const catRes = await page.request.get(CATEGORIES_PATH);
    expect(catRes.status()).toBe(200);
    const catBody = (await catRes.json()) as {
      data: { _id: string; slug: string; name: { en: string; vi: string } }[];
    };
    expect(catBody.data.length).toBeGreaterThan(0);
    const target = catBody.data[0];

    const listResponse = page.waitForResponse(
      (r) =>
        r.url().includes(APPS_PATH) &&
        r.url().includes(`categoryId=${target._id}`) &&
        r.status() === 200
    );
    await page.goto(`/vi/apps?categoryId=${target._id}`);
    const res = await listResponse;
    const body = (await res.json()) as { data: { items: unknown[] } };

    // Filters button shows an active-filter badge (activeFilterCount = 1).
    // VI label is "Bộ lọc" (list.filters).
    const filtersBtn = page.getByRole("button", { name: /Bộ lọc/i });
    await expect(filtersBtn).toBeVisible();
    await expect(filtersBtn.getByText("1")).toBeVisible();

    // Opening the popover shows the pre-selected option's label.
    await filtersBtn.click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover.getByRole("combobox")).toBeVisible();

    // Every returned item (if any) has the requested category among its
    // categories (category-management: apps carry 1–5 categories).
    for (const item of body.data.items as {
      categories: { _id: string }[];
    }[]) {
      expect(item.categories.map((c) => c._id)).toContain(target._id);
    }
  });

  test("deep-link /apps?categoryId=<garbage> does not crash and renders the catalog", async ({
    page
  }) => {
    // A garbage categoryId is not one of the select filter's valid option ids,
    // so the filter ignores it and the client does NOT forward it to the API
    // (no `categoryId=garbage` request fires). The requirement is simply that
    // the page does not crash — the catalog shell (toolbar + Filters) renders.
    await page.goto("/apps?categoryId=garbage");
    await expect(page.getByRole("button", { name: /Filters/i })).toBeVisible();
  });
});
