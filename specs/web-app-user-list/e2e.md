# E2E — `web-app-user-list` (`/vi/apps` catalog)

> Playwright, per CLAUDE.md §4.3. Test: `client/e2e/web-app-user-list/apps-list.e2e.ts`.
> Auth via global `e2e/auth.setup.ts` (seed user `user@test.com`). Read-only — no data mutation, nothing to revert.
> Reconciled against `design.md §6 ## E2E Scenario Matrix` (12-group rubric, merged with category-filter + EN-locale from `apps-api-integration`). Every applicable matrix row maps to a scenario + `test()` below, or is DEFERRED with a reason (no silent gaps).

## Preconditions

- App stack running + DB seeded (web-app seeder → 5 active apps: Blog, Analytics Dashboard, IDMS Portal, Notes, Operations Console; `team-calendar` is inactive and must NOT appear). Role-scoped: a `user`-role account sees 3 (Blog, IDMS Portal, Notes); `Analytics Dashboard` and `Operations Console` are admin-only.
- `E2E_BASE_URL` points at the FE under test. When verifying worktree changes, run the worktree BE + FE on alternate ports (e.g. BE `APP_PORT=5001`, FE `--port 3101` with `API_SERVER_URL=http://localhost:5001`) and set `E2E_BASE_URL=http://localhost:3101` — the main `:3000`/`:5000` stack serves `origin/main` and lacks the endpoint.

## Scenarios

Mapping legend: each item lists the matrix **row #** (from `design.md §6`) and the matching `test()` title. `[EP]`/`[BVA]`/`[DT]` = test-design technique tags.

### Happy path / AuthZ / data render (existing)

1. **(Row 1, 3) Renders role-permitted active apps** — navigate to `/vi/apps`; a `GET /api/v1/apps` 200 fires. The auth user (`user@test.com`, role `user`) sees only apps whose `requiredRoles` include `user`: `Blog`, `IDMS Portal`, `Notes` (each with a "Mở …" button). Admin-only `Analytics Dashboard` and `Operations Console` are **not** present (`toHaveCount(0)`); inactive `team-calendar` is also absent. _test:_ `renders only the role-permitted active apps for a user`.
2. **(Row 8) Open launches homeUrl** — the `Open`/`Mở` button for `Blog` calls `window.open(homeUrl, "_blank", "noopener,noreferrer")`; the test stubs `window.open` to capture the URL and asserts `https://blog.example.com`. `displayName` renders as `<h3>` (not slug/id). _test:_ `Open launches the app homeUrl in a new tab`.

### Filter / search (Row 7)

3. **(Row 7) Server-side search + clear** `[EP]` — typing `Notes` triggers a debounced (300ms) `GET /api/v1/apps?...search=Notes`; only `Notes` remains, `Blog` is removed; clearing restores `Blog`. _test:_ `search filters the catalog server-side and clears`.
4. **(Row 7) Category pills filter** — pills come from `GET /apps/categories`. Clicking a real category pill fires a `GET /api/v1/apps?...categoryId=…` and the pill gets `aria-pressed="true"`. Re-selecting "All"/"Tất cả" serves the unfiltered result from React Query cache (no new request) → assert toggle state (`All` pressed, real pill not pressed). _test:_ `category pills filter the catalog server-side`.
5. **(Row 7) Search + category intersection** `[DT]` — decision table: `(category=selected) AND (search=term)` → a single request must carry **both** `categoryId=` and `search=`. _test:_ `combines search and category as an intersection [DT]`.
6. **(Row 7) Reset on reload** — filter/search state is in-memory by design (no `useSearchParams`); after selecting a pill + typing a search, a `reload()` resets the "All" pill to `aria-pressed="true"` and the search box to empty (no deep-link of filters). _test:_ `resets filter and search on reload (state is in-memory by design)`.

### i18n (Row 9)

7. **(Row 9) EN-locale render** — `/apps` (EN, no prefix) shows the category group "Filter by category" and an "Open Blog" button. _test:_ `renders catalog and category group in English`.
8. **(Row 9) EN-string depth** — `/apps` asserts the real English strings (guards missing-message keys, which next-intl surfaces as raw `apps.xxx`): search placeholder **"Search apps..."**, category group **"Filter by category"**, per-card **"Open Blog"**, pagination summary **"Showing 3 of 3 apps"**, and empty state **"No apps found."** (via a no-match search). Category `displayName` from the API is **not** translated. _test:_ `renders EN strings: placeholder, group, open, summary, empty`.

### AuthN (Row 2)

9. **(Row 2) Unauthenticated UI redirect** `[EP]` — a fresh non-authenticated context (`storageState` dropped **and** `clearCookies()`, because localhost cookies are not port-scoped) visiting `/vi/apps` is redirected to `/login` by `AuthGuardLayout`. _test:_ `redirects an unauthenticated user from /vi/apps to /login [EP]`.
10. **(Row 2) API 401 without a token** `[EP]` — a fresh `request.newContext` (no cookies, no Authorization) hitting `GET /api/v1/apps/categories` returns **401**. Gate A only. _test:_ `GET /api/v1/apps/categories without a Bearer token returns 401 [EP]`.

### Validation / tampered params (Row 4, API-level)

11. **(Row 4) Out-of-range / non-numeric pagination** `[EP]` — the UI never builds a bad query (pills emit only valid `_id`), so tampering is tested directly via `page.request` (forwards the session cookie through the FE proxy → passes `authGuard`, fails at `queryPipe`): `?page=abc` → **400**, `?limit=0` → **400** (below min), `?limit=101` → **400** (above `MAX_LIMIT=100`). _test:_ `rejects non-numeric and out-of-range pagination params [EP]`.
12. **(Row 4) Unknown `status` param stripped** `[EP]` — `?status=DISABLED` is not a valid param → `stripUnknown` drops it and the server forces `status=ACTIVE` → **200** with only active apps; inactive `Team Calendar` never leaks in. _test:_ `strips an unknown status param and forces ACTIVE [EP]`.

### Empty / null states (Row 5)

13. **(Row 5) Empty no-match state** — searching `zzzqqq` returns an empty list → `apps.empty` ("Không tìm thấy ứng dụng nào.") is visible and the grid is empty. _test:_ `shows the empty state when the search matches nothing`.
14. **(Row 5) Null icon + null description fallback** — a stubbed catalog response (`page.route`) with one app (`iconUrl=null`, `description=null`) renders the initial-letter fallback block (no `CustomImage`, so **no `<img>`** inside the card) and an empty description slot that does not break the layout (`min-h-10`). _test:_ `renders an initial-letter fallback when an app has no icon (no broken img)`.

### Boundary / pagination (Row 6)

15. **(Row 6) Single-page → pager hidden** `[BVA]` — with 3 user-visible apps `< PAGE_SIZE (12)`, `totalPages = 1` → `CustomPagination` is not rendered; the summary "Hiển thị 3 trên 3 ứng dụng" still shows. _test:_ `hides the pager and shows the summary on a single page [BVA]`.
16. **(Row 6) Limit boundary at the API** `[BVA]` — `?limit=1` → **200** (min valid), `?limit=100` → **200** (max valid). `?limit=101` (over max) → **400** is asserted in scenario 11. _test:_ `accepts limit boundary values at the API [BVA]`.

### Error / loading (Row 10)

17. **(Row 10) Catalog 5xx error alert** — `page.route` fulfills `GET /apps` with **500**. React Query retries 5xx up to **2×** (3 attempts total) → the mock persists across all attempts; the test timeout is bumped to absorb retry backoff. A `role="alert"` shows `apps.error` ("Không thể tải ứng dụng. Vui lòng thử lại."). _test:_ `shows the error alert when GET /apps fails (5xx + React Query retries)`.
18. **(Row 10) Categories 5xx degrade** — `GET /apps/categories` → **500** → the pill row is reduced to only the "All" pill, but the unfiltered "All" grid still renders apps (Blog visible). _test:_ `hides category pills on a categories 5xx but still renders the All grid`.
19. **(Row 10) Loading skeleton** — a held (`page.route` + gate promise) response keeps the query pending → `AppCardSkeleton`s render (shadcn `Skeleton`, asserted via `[data-slot="skeleton"]`). _test:_ `renders skeleton cards while the catalog request is pending`.

### Accessibility (Row 12)

20. **(Row 12) Keyboard Open** — focusing the "Mở Blog" button (`toBeFocused`) and pressing `Enter` triggers `window.open` (stubbed) with `https://blog.example.com`. _test:_ `activates Open via keyboard (focus + Enter) [a11y]`.
21. **(Row 12) Announcer — loaded count** — after data arrives, the live region `#announcer` (aria-live `polite`, written by `useAnnounce` via `TableLoadedAnnouncer`) contains `apps.announce.loaded` ("Đã tải {total} ứng dụng."). _test:_ `announces the loaded count in the live region after data arrives [a11y]`.
22. **(Row 12) Announcer — category change** — selecting a category pill writes `apps.announce.categoryChanged` ("Đã lọc theo {category}.") into `#announcer`. _test:_ `announces the category change in the live region [a11y]`.

### N/A

- **(Row 11) Mutation safety** — N/A. The feature is read-only: only `GET` (`/apps`, `/apps/categories`); `Open` is `window.open` (no server write, no persistent state mutation). Nothing to revert / make idempotent.

## Notes / follow-ups

- **DEFERRED — page click-through pagination** `[BVA]` (`page=1` / `page=last` / `page=999`): a `user`-role account sees only 3 apps (`< PAGE_SIZE 12` → single page), so `CustomPagination` never renders and there is no page-2/last/999 control to click in the UI. **No silent cap** — this needs **> 12 user-visible active apps seeded**; once seeded, add tests that (a) click page 2 and assert the visible cards change, and (b) request `page=999` and assert an empty grid without a crash. Until then the `limit` boundaries are covered at the **API level** (scenarios 11, 16) in place of UI `page` boundaries.
- **Fresh-context AuthN** (scenario 9): cookies on localhost are not port-scoped, so the unauthenticated test BOTH drops `storageState` AND calls `clearCookies()` to avoid bleed-through from authenticated suites (memory: `reference_e2e_suite_session_contamination`).
- **React Query retry on 5xx** (scenario 17): the catalog error test mock must persist across all 3 attempts (initial + 2 retries) and the test timeout is raised to absorb retry backoff.
- **API-level auth via cookie** (scenarios 10, 11, 12, 16): `page.request.get(...)` forwards the authenticated session cookie through the FE proxy (the token lives in the cookie, not a Bearer header) — the proven idiom from `admin-users-list.e2e.ts`. The no-token 401 leg (scenario 10) uses a fresh `request.newContext` with no cookies. If a future change moves the token out of the cookie, these tests would need an explicit `Authorization` header read from `storageState`.
- **Skeleton selector** (scenario 19): `AppCardSkeleton` uses the shadcn `Skeleton` primitive; the test asserts `[data-slot="skeleton"]` elements are present while pending. No app code was modified.
- Locale is `vi` (path `/vi/apps`) → VI assertions use Vietnamese labels ("Mở", "Tìm ứng dụng…"); EN assertions use `/apps` (no prefix).
- Selectors use role/name (headings, buttons, textbox, group); no app code was modified for testability.
