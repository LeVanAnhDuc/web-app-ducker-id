# APPS — test cases

The user app catalogue at `/apps`, the header search combobox and the public
category list (REQ-APPS-01…05).

Source of truth: `client/src/views/Apps/**`, `client/src/components/AppCard`,
`client/src/layouts/AppHeader/components/HeaderSearch/**`,
`client/src/hooks/useListQuery.ts`, `client/src/hooks/useOpenApp.ts`,
`client/src/locales/{en,vi}/{apps,list,dashboard}.json`,
`server/src/modules/{web-app,category}`, `server/src/validators/schemas/web-app.ts`.
Converted from `docs/specs/web-app-user-list/e2e.md`, `docs/specs/header-search/e2e.md`,
`docs/specs/apps-api-integration/e2e.md`, `docs/specs/apps-category-ssr` (via
`web-app-user-list/e2e.md`) and the user-side rows of
`docs/specs/unified-list-experience/e2e.md`.

**Test data.** The catalogue is read from `GET /apps` at run time — the suite
never names a seed app, because the database it runs against is not
guaranteed to hold the seeder's Blog / Notes / IDMS Portal. Apps a user must
_not_ see are registered per spec through the admin API
(`helpers/catalog.ts → createFixtureApps`: one admin-only, one inactive, names
`e2e-oidc-*`) and deleted in `afterAll`. Launch records are written on a
throwaway account. States that need more apps than exist (pagination, null
icon, failure) stub `GET /apps` with `page.route`.

**Server facts the cases rely on.** Page size 20 (client), `limit` 1…100,
`page` ≥ 1 (Joi `integer().min(1)`), `search` ≤ 200 characters, `categoryId`
must be a 24-hex ObjectId, unknown query keys are stripped. A user sees ACTIVE
apps whose `requiredRoles` contain `user` (or are empty), adjusted by any
per-user exception an admin made (TC-APPS-060…062); an admin sees every ACTIVE app.
Header search asks for 5 results (`HEADER_SEARCH_RESULT_LIMIT`) after a 300 ms
debounce. An empty result is `totalPages: 0`.

### TC-APPS-001 — The catalogue shows exactly the apps the user's role may open

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role × requiredRoles × status), EP
- **Preconditions:** one admin-only and one inactive fixture app registered
- **Steps:**
  1. Open `/vi/apps`.
- **Expected:** every app returned by `GET /apps` renders as a card (h3 title +
  "Mở <name>" button); neither fixture app appears.
- **Automated:** `tests/e2e/apps/apps-list.e2e.ts`

### TC-APPS-002 — Open launches the app's own URL in a new tab

- **Requirement:** REQ-APPS-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (valid launch)
- **Preconditions:** `window.open` stubbed
- **Steps:**
  1. On `/vi/apps`, click "Mở <first app>".
- **Expected:** `window.open` is called with the app's `homeUrl`.
- **Automated:** `tests/e2e/apps/apps-list.e2e.ts`

### TC-APPS-003 — English catalogue chrome at `/apps`

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (en)
- **Preconditions:** none
- **Steps:**
  1. Open `/apps`.
- **Expected:** heading "Apps", search placeholder "Search apps...", a
  "Filters" button and "Open <name>" on the cards.
- **Automated:** `tests/e2e/apps/apps-list.e2e.ts`

### TC-APPS-004 — Search filters server-side, persists in the URL and clears

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (match / cleared), State Transition (typed → reloaded → cleared)
- **Preconditions:** none
- **Steps:**
  1. Type an app's display name into the toolbar search.
  2. Reload.
  3. Clear the box.
- **Expected:** a debounced `GET /apps?search=<name>` returns the app and its
  card is shown; `?search=` is in the URL and survives the reload (box keeps
  the value); clearing removes it and the full list returns.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-005 — A search with no match shows the empty state and Clear filters

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (no-match)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/apps?search=zzzqqq-no-such-app`.
  2. Click "Xóa bộ lọc".
- **Expected:** "Không tìm thấy ứng dụng nào." is shown; clearing drops
  `search` from the URL and cards come back.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-006 — The category filter narrows the list and badges the Filters button

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (one category selected)
- **Preconditions:** at least one category
- **Steps:**
  1. Open "Bộ lọc", pick the first real category.
- **Expected:** the request carries `categoryId`; every returned app has that
  category; the URL carries `categoryId`; the Filters button shows "1".
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-007 — Search and category combine as an intersection

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (search set × category set)
- **Preconditions:** an app with a category
- **Steps:**
  1. Open `/vi/apps?search=<prefix>&categoryId=<its category>`.
- **Expected:** one request carries both params; the app is returned and every
  result carries the category.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-008 — Grid / list toggle

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (grid → list)
- **Preconditions:** none
- **Steps:**
  1. Click "Dạng danh sách".
- **Expected:** grid starts pressed; after the click list is
  `aria-pressed="true"` and grid `false`.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-009 — A single page hides the pager

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (totalPages = 1)
- **Preconditions:** `GET /apps` stubbed with `totalPages: 1`
- **Steps:**
  1. Open `/vi/apps`.
- **Expected:** items render and no `pagination` navigation exists.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-010 — The pager walks page 1 → 2 → last, edges disabled

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (page 1 / 2 / last), State Transition
- **Preconditions:** `GET /apps` stubbed with three pages
- **Steps:**
  1. Open `/vi/apps`; click page 2, then page 3.
- **Expected:** on page 1 "Go to previous page" is `aria-disabled`; page 2 and
  3 put `page=` in the URL and render that page's items; on the last page
  "Go to next page" is `aria-disabled`; requests were made for pages 1, 2, 3.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-011 — A hand-typed page beyond the last one renders safely

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (last + 1), Error Guessing
- **Preconditions:** fewer than 999 × 20 apps
- **Steps:**
  1. Open `/vi/apps?page=999`.
- **Expected:** the empty state "Không tìm thấy ứng dụng nào." — no crash.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-012 — An app without icon or description uses the initial-letter fallback

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (null fields)
- **Preconditions:** `GET /apps` stubbed with `iconUrl: null, description: null`
- **Steps:**
  1. Open `/vi/apps`.
- **Expected:** the card shows the first letter, has no `<img>`, and never
  renders the word "null".
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-013 — Skeleton cards while the catalogue loads

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (loading → loaded)
- **Preconditions:** `GET /apps` held until released
- **Steps:**
  1. Open `/vi/apps`, then release the response.
- **Expected:** pulse skeletons while pending; cards and no skeletons after.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-014 — A failing catalogue request shows the error alert

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (5xx)
- **Preconditions:** `GET /apps` stubbed with 500
- **Steps:**
  1. Open `/vi/apps` and wait out React Query's two retries.
- **Expected:** a `role="alert"` reading "Không thể tải ứng dụng. Vui lòng thử lại."
- **Automated:** `tests/e2e/apps/catalog.e2e.ts` — marked `test.fail()`: **app
  bug**, the alert is rendered inside `PageContent`'s children, which are
  replaced by the empty state when an errored query has no items; the user
  sees "No apps found" instead of an error.

### TC-APPS-015 — Opening a tile records the launch

- **Requirement:** REQ-APPS-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP
- **Preconditions:** `window.open` stubbed
- **Steps:**
  1. On `/apps` click "Open <first app>".
- **Expected:** `POST /users/me/recent-apps/<id>` answers 204 and the app's
  `homeUrl` was opened.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-016 — Open works from the keyboard

- **Requirement:** REQ-APPS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (keyboard)
- **Preconditions:** `window.open` stubbed
- **Steps:**
  1. Focus "Mở <app>" and press Enter.
- **Expected:** the button is focusable and Enter opens the app's `homeUrl`.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-017 — A filter change is announced

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (live region)
- **Preconditions:** none
- **Steps:**
  1. Type into the toolbar search on `/vi/apps`.
- **Expected:** `#announcer` reads "Đã áp dụng bộ lọc." (the per-page
  "{total} apps loaded" announcement of the old design is no longer wired —
  `apps.announce.*` keys are unused).
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-018 — Vietnamese catalogue chrome

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (vi), Error Guessing (raw keys)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/apps`.
- **Expected:** heading "Ứng dụng", placeholder "Tìm ứng dụng...", "Bộ lọc",
  "Mở <name>"; no raw `apps.*` key in the page text.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-019 — A guest is sent to the login screen

- **Requirement:** REQ-APPS-01, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/apps` signed out.
- **Expected:** the URL becomes `/login`; no catalogue toolbar renders.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-020 — Header search: focus shows suggestions, typing narrows

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (closed → suggested → results)
- **Preconditions:** none
- **Steps:**
  1. Click the header combobox; 2. type an app's name.
- **Expected:** the listbox opens under "Suggested apps" with options; after the
  debounce it switches to "Apps" and lists the app.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-021 — A single click opens the popover and it stays open

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (regression: open-then-close toggle)
- **Preconditions:** none
- **Steps:**
  1. Click the input, wait, click it again, press Escape, click again.
- **Expected:** stays open with `aria-expanded="true"` after both clicks;
  Escape closes it; the next click reopens it.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-022 — No header search for a signed-out visitor

- **Requirement:** REQ-APPS-04, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** clean context
- **Steps:**
  1. Open `/`.
- **Expected:** the login affordance "Continue with email" shows and no
  combobox exists.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-023 — Header search is present on a dashboard route

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Decision Table (role = user × route = dashboard)
- **Preconditions:** none
- **Steps:**
  1. Open `/apps`.
- **Expected:** the combobox is visible.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-024 — Query classes: empty, whitespace, match, no-match, special characters

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (5 classes)
- **Preconditions:** none
- **Steps:**
  1. Open the popover; type nothing / " " / an app name / "zzzz-no-such-app"
     / `<script>alert(1)</script>` and an emoji.
- **Expected:** empty and whitespace stay on "Suggested apps"; a match lists
  the app; no-match shows "No apps found" + "Try a different keyword";
  special input keeps the listbox rendered (no crash, no script).
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-025 — Empty and null rows render safely

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (null category / icon)
- **Preconditions:** for the null case `GET /apps` is stubbed
- **Steps:**
  1. Search for a no-match term; 2. open the popover over an app with no
     categories and no icon.
- **Expected:** the localised empty text; the row renders without the word "null".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-026 — "View All" appears only when results exceed the limit

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (total = 5 vs total > 5)
- **Preconditions:** `GET /apps?search=` stubbed (5 of 5, then 5 of 12)
- **Steps:**
  1. Search "match"; 2. search "many".
- **Expected:** no "View All" at 5 of 5; "View All" at 5 of 12.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-027 — One character searches; fast typing sends one request

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (length 1; debounce window)
- **Preconditions:** none
- **Steps:**
  1. Type one character; 2. type three characters 20 ms apart.
- **Expected:** a single-character query fires a search; the fast burst fires
  exactly one request, for the full prefix.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-028 — "View All" jumps to `/apps?search=<query>`

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (results → list page)
- **Preconditions:** the query's response stubbed with total 6
- **Steps:**
  1. Type an app name; click "View All".
- **Expected:** navigates to `/apps?search=<exact query>`.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-029 — Empty vs non-empty query switch the section label

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Decision Table (query empty × non-empty)
- **Preconditions:** none
- **Steps:**
  1. Open the popover, then type an app name.
- **Expected:** "Suggested apps" first; then "Apps" and no "Suggested apps".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-030 — Rows show names, never raw ids

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (data rendering)
- **Preconditions:** none
- **Steps:**
  1. Open the popover.
- **Expected:** the first option has text and is not a 24-hex id.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-031 — Header search chrome in English

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en)
- **Preconditions:** none
- **Steps:**
  1. On `/` check the placeholder, open, search a no-match term.
- **Expected:** "Search apps...", "Suggested apps", "No apps found".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-032 — Header search chrome in Vietnamese

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (vi), Error Guessing (raw keys)
- **Preconditions:** none
- **Steps:**
  1. Same on `/vi`.
- **Expected:** "Tìm kiếm ứng dụng...", "Ứng dụng gợi ý", "Không tìm thấy ứng
  dụng"; no `dashboard.header.*` key in the page.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-033 — Skeleton rows while a search is pending

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (loading → loaded)
- **Preconditions:** `GET /apps` held
- **Steps:**
  1. Open the popover; release the response.
- **Expected:** the listbox has no options while pending, then the stubbed row.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-034 — A failed search renders the empty state, not a spinner

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (5xx)
- **Preconditions:** `GET /apps` stubbed with 500
- **Steps:**
  1. Open the popover.
- **Expected:** the listbox shows "No apps found".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-035 — Popover state transitions: clear, Escape, select

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (results → cleared → suggested; open → closed; results → selected → closed)
- **Preconditions:** `window.open` stubbed for the select case
- **Steps:**
  1. No-match then clear; 2. Escape; 3. search an app and click its row.
- **Expected:** clearing returns to "Suggested apps"; Escape closes and keeps
  focus on the input; selecting opens the app's `homeUrl` and closes.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-036 — Keyboard navigation in the results

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** a11y (keyboard), State Transition
- **Preconditions:** `window.open` stubbed
- **Steps:**
  1. ArrowDown, ArrowDown, ArrowUp, Enter.
- **Expected:** `aria-selected` follows the arrows; Enter opens the active app
  and closes the popover.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-037 — Combobox ARIA wiring

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (roles)
- **Preconditions:** none
- **Steps:**
  1. Inspect the input before and after opening.
- **Expected:** `aria-haspopup="listbox"`, `aria-expanded` false → true,
  `aria-controls` equals the listbox id.
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-038 — Public categories are identical for anon, user and admin

- **Requirement:** REQ-APPS-02, REQ-APPS-05
- **Layer:** api · **Priority:** P2 · **Role:** guest, user, admin
- **Technique:** Decision Table (caller × same payload)
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/apps/categories` as anonymous, user and admin.
- **Expected:** all three 200 with equal `data`.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-039 — A bad Bearer on the public endpoint is rejected, no header is not

- **Requirement:** REQ-APPS-02
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (no header / garbage token)
- **Preconditions:** none
- **Steps:**
  1. GET categories with an empty `Authorization`; 2. with `Bearer garbage`.
- **Expected:** 200; then 403 (`JWT_INVALID`) — a bad token never degrades to anonymous.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-040 — Categories are cacheable for 60 s

- **Requirement:** REQ-APPS-02
- **Layer:** api · **Priority:** P3 · **Role:** user
- **Technique:** specification check
- **Preconditions:** none
- **Steps:**
  1. GET categories.
- **Expected:** `Cache-Control: public, max-age=60`.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-041 — The filter renders from SSR data and refetches once

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (SSR seed → one client refetch)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/apps`, count category requests.
- **Expected:** exactly one client request to `/apps/categories`.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-042 — The category filter label follows the locale

- **Requirement:** REQ-APPS-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (en + vi)
- **Preconditions:** none
- **Steps:**
  1. Open Filters on `/apps`, then on `/vi/apps`.
- **Expected:** "Filter by category", then "Lọc theo danh mục".
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-043 — A `categoryId` deep link pre-selects the filter

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (valid id)
- **Preconditions:** at least one category
- **Steps:**
  1. Open `/vi/apps?categoryId=<id>`.
- **Expected:** the request carries the id, the Filters badge shows "1", and
  every returned app has that category.
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-044 — A garbage `categoryId` deep link does not crash

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (invalid id), Error Guessing
- **Preconditions:** none
- **Steps:**
  1. Open `/apps?categoryId=garbage`.
- **Expected:** the catalogue toolbar renders (the value is dropped client-side).
- **Automated:** `tests/e2e/apps/categories-ssr.e2e.ts`

### TC-APPS-045 — Category chips use the active locale's name

- **Requirement:** REQ-APPS-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (en + vi)
- **Preconditions:** `GET /apps` stubbed with a category named `{ en: "Content Stub", vi: "Nội dung giả" }`
- **Steps:**
  1. Open `/apps`, then `/vi/apps`.
- **Expected:** only the English name on `/apps`; only the Vietnamese name on `/vi/apps`.
- **Automated:** `tests/e2e/apps/catalog.e2e.ts`

### TC-APPS-046 — Header search results are announced

- **Requirement:** REQ-APPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (live region)
- **Preconditions:** none
- **Steps:**
  1. Search a no-match term, then an app name.
- **Expected:** `#announcer` reads "No apps found", then "<n> apps found".
- **Automated:** `tests/e2e/apps/header-search.e2e.ts`

### TC-APPS-047 — Categories fall back to the client fetch when the server fetch fails

- **Requirement:** REQ-APPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing
- **Preconditions:** API unreachable from the Next.js server only
- **Steps:**
  1. Make `getServerAppCategories()` fail; open `/apps`.
- **Expected:** the Filters popover still lists categories once the client
  fetch resolves; the catalogue is unaffected.
- **Automated:** manual — the failing fetch runs in the Next.js server process
  before HTML streams, so `page.route` cannot reach it; it needs the client
  started against an API URL the server cannot resolve.

### TC-APPS-050 — `GET /apps` contract

- **Requirement:** REQ-APPS-01
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** specification check
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/apps`.
- **Expected:** 200, envelope `{ timestamp, path, message, data }`;
  `data.meta` page 1 / limit 20 / `totalPages = ceil(total/limit)`; each item
  has `_id`, `displayName`, an http(s) `homeUrl`, boolean `isFavorite`,
  `categories[]`, and no `clientSecretHash` / `redirectUris`.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-051 — Visibility follows role × status

- **Requirement:** REQ-APPS-01
- **Layer:** api · **Priority:** P1 · **Role:** user, admin
- **Technique:** Decision Table (role user/admin × app admin-only/inactive)
- **Preconditions:** fixture apps
- **Steps:**
  1. List as user and as admin.
- **Expected:** admin-only: hidden for user, shown for admin; inactive: hidden
  for both; the user's set is a subset of the admin's.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-052 — Page boundaries

- **Requirement:** REQ-APPS-02
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** BVA (page 0 / 1 / last / last+1), EP (`-1`, `abc`, `1.5`)
- **Preconditions:** none
- **Steps:**
  1. With `limit=1`: page 1, page = total, page = total + 1; then the invalid values.
- **Expected:** 1 and last return one (different) item; last+1 returns
  `items: []` with the same total; 0, -1, abc, 1.5 → 400 with an error `code`.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-053 — Limit boundaries

- **Requirement:** REQ-APPS-02
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** BVA (0 / 1 / 100 / 101)
- **Preconditions:** none
- **Steps:**
  1. `GET /apps?limit=<n>`.
- **Expected:** 0 → 400, 1 → 200 (≤ 1 item), 100 → 200, 101 → 400.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-054 — Search semantics and length

- **Requirement:** REQ-APPS-02
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** EP (case), Error Guessing (regex metacharacters), BVA (200 / 201)
- **Preconditions:** none
- **Steps:**
  1. Search an upper-cased name prefix; 2. search `.*`, `(`, `[a-z]+`, `\`; 3. search 200 and 201 characters.
- **Expected:** the app is found and every result matches; metacharacters are
  200 and `.*` matches nothing; 200 → 200, 201 → 400.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-055 — Category filter validation

- **Requirement:** REQ-APPS-02
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** EP (malformed / unknown / real id)
- **Preconditions:** a categorised app
- **Steps:**
  1. `categoryId=not-an-objectid`; 2. `ffff…ffff`; 3. a real id.
- **Expected:** 400; empty page with `total: 0, totalPages: 0`; only apps with that category.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-056 — An unknown `status` param never exposes inactive apps

- **Requirement:** REQ-APPS-01
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** Error Guessing (tampered query)
- **Preconditions:** inactive fixture app
- **Steps:**
  1. `GET /apps?status=inactive|INACTIVE|DISABLED`.
- **Expected:** 200 and the inactive app is absent each time.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-057 — The catalogue requires a valid session

- **Requirement:** REQ-APPS-01, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token / garbage token)
- **Preconditions:** none
- **Steps:**
  1. `GET /apps` with no token; 2. with `Bearer garbage`.
- **Expected:** 401 with an error `code`; the garbage token is rejected (401/403).
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-058 — Recording a launch

- **Requirement:** REQ-APPS-03
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user, guest
- **Technique:** EP (visible / admin-only / inactive / unknown / malformed id)
- **Preconditions:** throwaway account; fixture apps
- **Steps:**
  1. `POST /users/me/recent-apps/<id>` for each id class; 2. as guest; 3. list.
- **Expected:** 204 / 404 / 404 / 404 / 400; guest 401; the recent list holds
  exactly the visible app.
- **Automated:** `tests/api/apps/apps.api.ts`

### TC-APPS-059 — Category names are bilingual on every app

- **Requirement:** REQ-APPS-05
- **Layer:** api · **Priority:** P3 · **Role:** user
- **Technique:** specification check
- **Preconditions:** a categorised app
- **Steps:**
  1. List the catalogue.
- **Expected:** every category has non-empty `name.en` and `name.vi`.
- **Automated:** `tests/api/apps/apps.api.ts`

## Access control (per-user exceptions)

These run on a throwaway account (role `user`) whose overrides are written
through the admin API and removed after every test — see
`admin-entitlements.md` for how the role default and the exceptions combine.

### TC-APPS-060 — A revoked app leaves /apps and returns when the override is removed

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** throwaway user (+ admin API)
- **Technique:** State Transition (granted → revoked → default)
- **Preconditions:** throwaway account on the role default
- **Steps:**
  1. Open `/apps`; revoke Notes; reload; remove the override; reload.
- **Expected:** Notes shows, then is gone while Blog stays, then shows again.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-APPS-061 — Searching for a revoked app finds nothing

- **Requirement:** REQ-APPS-06, REQ-APPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway user (+ admin API)
- **Technique:** EP (exact name of a revoked app)
- **Preconditions:** Notes revoked for the account
- **Steps:**
  1. Open `/apps?search=Notes`.
- **Expected:** no Notes card.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-APPS-062 — An admin-only app granted beyond the role appears

- **Requirement:** REQ-APPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway user (+ admin API)
- **Technique:** Decision Table (role-withheld × allow override)
- **Preconditions:** throwaway account on the role default
- **Steps:**
  1. Open `/apps`; grant Operations Console; reload.
- **Expected:** no Operations Console card before the grant; its card after.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`
