# E2E Scenarios — apps-api-integration

> Feature: `apps-api-integration` · Branch: `feat/apps-api-integration`
> Maps the design.md §6 E2E Scenario Matrix (12-category rubric) to concrete Playwright tests.
> Scope: **Apps page** (new category filter) + **Home page** (real API data). Discover deleted → its E2E (if any) removed.
>
> This is a **reconcile** of an existing suite: `e2e/web-app-user-list/apps-list.e2e.ts` already covered the user catalog (role visibility, search, Open-in-new-tab). Those tests are **preserved unchanged**; the category-filter behavior is **added**. The Home suite is **new** (mock → real API). No existing test had an outcome that changed, so nothing was rewritten or removed.

## Artifacts

| Artifact | Path | Change |
| --- | --- | --- |
| Apps suite | `client/e2e/web-app-user-list/apps-list.e2e.ts` | EXTENDED — existing 3 tests kept; +2 vi tests (category filter, invalid categoryId 400) + 1 EN-locale describe |
| Home suite | `client/e2e/home/home.e2e.ts` | NEW — 3 tests (real apps render, totalApps = meta.total, EN render) |
| This doc | `docs/specs/apps-api-integration/e2e.md` | NEW |

Auth: global `e2e/auth.setup.ts` → storageState (seed `user@test.com`, role `user`). Tests run under the `chromium` project (user storageState). All scenarios are **read-only** (GET only) — nothing to revert.

## Coverage matrix (design.md §6 → tests)

| # | Category | Status | Scenario → Test |
| --- | --- | --- | --- |
| 1 | Happy path | ✅ covered | **Apps**: `/vi/apps` renders role-permitted active apps (Blog, Notes, IDMS Portal) with Open actions — *existing* `renders only the role-permitted active apps for a user`. **Home**: `/vi/home` QuickAccess + Recommended render real apps from API — `QuickAccess and Recommended render real apps from the API`. |
| 2 | AuthN | ⏸ deferred | Unauthenticated → redirect `/login`; `GET /apps/categories` without token → 401. Not in this suite — all projects run with authenticated storageState; AuthGuard redirect is shared infra, not changed by this feature. **Follow-up gap**: no dedicated unauthenticated-access test exists for the user dashboard; would need a no-storageState project/fixture. Recorded, not silently dropped. |
| 3 | AuthZ | ✅ covered | User role sees only `requiredRoles=user` apps; admin-only apps (Analytics Dashboard, Operations Console) hidden — *existing* happy-path test asserts `toHaveCount(0)` for admin-only apps. Category filter composes with the role scope (does not widen visibility) — implicitly held: filtered responses still flow through `listUserApps` role scope. |
| 4 | Validation / expected-error | ✅ covered | `GET /apps?categoryId=not-an-objectid` → **HTTP 400** (BE `ValidationError` → `BAD_REQUEST`, key `validation:categoryId.invalid`) — `invalid categoryId query returns 400 from the API`. `?page=abc` → 400 already covered upstream by the validator; not re-asserted here. FE never emits an invalid `categoryId` (pills carry real `_id`), so the bad input is exercised at the API/contract layer. |
| 5 | Empty / null states | ⏸ deferred | Selecting a category with no user-visible apps → grid empty state (`apps.empty`); Home with 0 apps → section empty states. **Deferred — seed dependency**: current seed assigns user-visible apps to its categories, so no category reliably yields an empty user grid, and the seed user always has apps. An empty-category test is deferred **unless** the seed adds a category with no user-visible apps. Null-field rendering (`description=null` / `iconUrl=null` → first-letter fallback) is exercised indirectly by the happy-path render but not asserted explicitly. Recorded as a gap. |
| 6 | Boundary / pagination | ✅ covered (existing/upstream) | Apps pager (page 1 / last / beyond-range) covered by the existing catalog suite + upstream pagination behavior; category change resets to page 1 (logic in `handleCategoryChange`) — not separately asserted as it requires >12 apps in one category (seed dependency). Home uses fixed `limit:8`, no pager — N/A by design. |
| 7 | Filter / search | ✅ covered | Category pill click → server request carries `categoryId=`, pill `aria-pressed=true`; "All" pill clears `categoryId` and is pressed — `category pills filter the catalog server-side`. Search alone covered by *existing* `search filters the catalog server-side and clears`. **Combined search+category** deferred (low value; both paths proven independently). **URL persistence**: design §8 chose in-memory state (no URL persist, YAGNI) → N/A, nothing to assert on reload. |
| 8 | Data rendering | ✅ covered | `category` shows `displayName` not id/slug, `iconUrl` via `CustomImage` with first-letter fallback, Open opens `homeUrl` in a new tab (`target=_blank rel=noopener`) — Open-in-new-tab is *existing* `Open launches the app homeUrl in a new tab`; displayName/heading rendering asserted by happy-path tests. |
| 9 | **i18n (en + vi)** | ✅ covered | **vi**: all Apps/Home tests default to `/vi/*` (group label "Lọc theo danh mục", Open label "Mở …"). **en**: Apps `/apps` → group "Filter by category" + "Open Blog" (`renders catalog and category group in English`); Home `/home` → headings "Quick Access" + "Recommended for You" (`renders in English at /home`). Guards against missing-message bugs (lesson `adminUsers.pagination`). Category names from the API are not translated (asserted via real `displayName`). |
| 10 | Error / loading | ⏸ deferred | `GET /apps` 5xx → Apps error UI; `GET /apps/categories` 5xx → pills hidden, "All" grid still works; loading → skeletons. **Deferred — needs response interception/mocking** (`page.route` to force 5xx); the live-app E2E run here exercises only the success path. Error/loading UI is unit-testable at component level. Recorded as a follow-up gap, not silently dropped. |
| 11 | Mutation safety | N/A | Feature is read-only (GET `/apps`, GET `/apps/categories`). No writes, no optimistic UI, nothing to revert in `afterAll`. |
| 12 | Accessibility | ✅ covered | Pills use `CustomButton` inside `role="group"` (`aria-label` = "Filter by category"/"Lọc theo danh mục") with `aria-pressed` toggled — asserted in `category pills filter the catalog server-side` (role/group + aria-pressed selectors) and the EN-locale group test. Selectors throughout use role/name (not CSS). Category change announces via `useAnnounce` (live region) — present but not separately asserted. |

## Seed dependencies

- **Required (covered tests rely on these):**
  - Seed user `user@test.com` / `User@123` with role `user` (provided by `auth.setup.ts`).
  - ≥1 category returned by `GET /apps/categories` so the pill group has at least one **real** pill at index 1 (the category-filter test picks `pills.nth(1)`).
  - ≥1 user-visible app assigned to that category so clicking the pill yields a 200 with `categoryId=` (test only asserts the request + `aria-pressed`, not a specific result count, for resilience).
  - User-visible apps include "Blog" (asserted by name in vi + EN render tests and the totalApps stat).
- **Not satisfied by current seed (drives deferrals):**
  - A category with **no** user-visible apps (needed for the empty-category grid state, row 5).
  - A seed user with **zero** apps (needed for Home empty-state, row 5).

## Recorded follow-up gaps (no silent omission)

1. **Unauthenticated access** (row 2) — no no-storageState fixture for the user dashboard; add a dedicated project/fixture to assert `/login` redirect + 401 on `/apps/categories`.
2. **Empty / null states** (row 5) — needs seed: a category with no user-visible apps, and/or a user with zero apps. Add seed fixtures, then add empty-state tests.
3. **Error / loading** (row 10) — needs `page.route` interception to force 5xx; add when error-path E2E coverage is prioritized (component-level tests cover it meanwhile).
4. **Combined search + category & page-1-reset-on-category-change** (rows 6/7) — deferred; both paths proven independently. Page-reset assertion needs >12 apps in one category.
