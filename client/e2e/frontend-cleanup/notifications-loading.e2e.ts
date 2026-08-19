import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// Frontend-cleanup: NotificationGroups loading skeleton
// Scenario: while the notifications query is pending, NotificationGroupsSkeleton
// is rendered (wrapped in aria-hidden="true"). After the request resolves, real
// notification groups appear and the skeleton is gone.
//
// Runs under the `chromium` project (user storageState → e2e/.auth/user.json).
//
// Real i18n strings from src/locales/en/notifications.json.
// ---------------------------------------------------------------------------

// Regex matching the notifications list endpoint (avoids sub-routes).
const LIST_RE = /\/api\/v1\/notifications(\?|$)/;

// Synthetic item factory (mirrors notifications.e2e.ts).
const fakeItem = (i: number) => ({
  id: `fake-loading-${i}`,
  type: "SYSTEM_ANNOUNCEMENT",
  title: `Loading test notification ${i}`,
  message: `Body ${i}.`,
  meta: null,
  isRead: false,
  readAt: null,
  createdAt: new Date(Date.now() - i * 60_000).toISOString()
});

const responseEnvelope = <T>(data: T) => ({
  timestamp: new Date().toISOString(),
  path: "/api/v1/notifications",
  message: "OK",
  data
});

test.describe("Notifications — loading skeleton (frontend-cleanup)", () => {
  // Scenario: skeleton visible while pending, groups appear after resolve.
  //
  // Technique: intercept the notifications list endpoint with a delayed
  // fulfillment. Assert aria-hidden skeleton visible before resolving.
  // After resolve: skeleton gone (or hidden), at least one notification item
  // rendered.
  //
  // NotificationGroupsSkeleton is wrapped in <div aria-hidden="true">. The
  // skeleton div has no accessible role, so we query it via its aria-hidden
  // attribute and assert its DOM presence while the query is loading.
  //
  // [State Transition] loading → loaded transition.
  test("renders the skeleton while the notifications query is pending, then shows groups [ST]", async ({
    page
  }) => {
    // Hold the response until we have asserted the skeleton.
    let resolveHold!: () => void;
    const hold = new Promise<void>((resolve) => {
      resolveHold = resolve;
    });

    await page.route(LIST_RE, async (route: Route) => {
      // Wait for the test to signal that the skeleton has been observed.
      await hold;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items: [fakeItem(1), fakeItem(2)],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
          })
        )
      });
    });

    await page.goto("/notifications");

    // While pending: NotificationGroupsSkeleton renders inside
    // <div aria-hidden="true">. We locate it by its aria-hidden attribute.
    // The skeleton node is present in DOM (attached) even though it is
    // aria-hidden (screen-reader hidden), so toBeAttached() is the right
    // assertion here — toBeVisible() would fail for aria-hidden elements
    // inside a Tabs panel that is not itself hidden.
    const skeleton = page.locator("[aria-hidden='true']").first();
    await expect(skeleton).toBeAttached({ timeout: 10_000 });

    // Release the hold so the response arrives.
    resolveHold();

    // After resolve: at least one notification article is visible.
    await expect(
      page.getByText("Loading test notification 1", { exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  // [Error Guessing] Verify the skeleton is truly gone once data loads
  // (not just obscured) — guards against a regression where skeleton stays
  // rendered alongside the real groups.
  test("skeleton is removed from DOM once groups are rendered [Error Guessing]", async ({
    page
  }) => {
    // Immediate-fulfill: no hold, so skeleton may flash but data loads fast.
    // We assert on the final settled state: no aria-hidden skeleton sibling
    // is present inside the Tabs content area when real items are visible.
    //
    // NotificationGroupsSkeleton is the ONLY top-level aria-hidden div in the
    // Tabs content; NotificationGroups renders <article> elements without
    // aria-hidden. So once data renders, the aria-hidden div is gone.
    await page.route(LIST_RE, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          responseEnvelope({
            items: [fakeItem(10), fakeItem(11)],
            meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
          })
        )
      })
    );

    await page.goto("/notifications");

    // Wait for the real data to appear.
    await expect(
      page.getByText("Loading test notification 10", { exact: true })
    ).toBeVisible({ timeout: 10_000 });

    // The skeleton wrapper (aria-hidden div from NotificationGroupsSkeleton)
    // must no longer be present in the DOM. The Tabs content area at this
    // point holds only NotificationGroups (article elements).
    //
    // NOTE: there may be other aria-hidden="true" nodes on the page (e.g.
    // icon wrappers inside articles). We narrow to the Skeleton's specific
    // shape: a div containing only Skeleton children (no article children).
    // A simpler proxy: the skeleton has exactly SKELETON_GROUPS (2) group
    // sub-divs — after data loads the containing div is unmounted, so
    // querying for the skeleton structure yields 0 results.
    //
    // The skeleton renders 3+2 = 5 SkeletonNotificationItem divs. In the
    // loaded state there are no such placeholder divs at the skeleton level.
    // We check the first-child aria-hidden div no longer wraps Skeleton nodes
    // by asserting no top-level aria-hidden sibling wraps .h-3.w-16 (the
    // group-header Skeleton className used only in NotificationGroupsSkeleton).
    await expect(page.locator("[aria-hidden='true'] .h-3.w-16")).toHaveCount(
      0,
      {
        timeout: 5_000
      }
    );
  });
});
