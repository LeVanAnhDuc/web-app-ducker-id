# E2E — `notifications-api`: Notifications page + header bell

> **Feature**: `notifications-api`
> **Test file**: `client/e2e/notifications/notifications.e2e.ts`
> **Helper**: `client/e2e/helpers/notifications.ts`
> **Auth**: global `auth.setup.ts` storageState → logged in as `user@test.com`.
> Mirrors the §6 E2E Scenario Matrix in `design.md`.

---

## 1. Scope

Covers the user-facing Notifications page (`/notifications`) and the header bell
badge. Page chrome (tabs, buttons, group headers, empty/error states) is i18n
(en + vi); notification body text is literal (asserted verbatim, never
translated). Selectors prefer `getByRole` / accessible name; `article` /
`aria-hidden` containers used only where roles aren't exposed.

## 2. Running prerequisites

- **Real-backend tests** need the **worktree BE** (with the `notification`
  module + seed) on its API host **and** the **worktree FE** running, with the
  DB seeded (`cd server && yarn seed --clear && yarn seed`). Point the suite at
  the worktree FE via `E2E_BASE_URL` (defaults to `http://localhost:3000`).
- **Intercept-based tests** are backend-agnostic — they `page.route` the API and
  fulfil synthetic responses, so they pass regardless of backend/seed state
  (they still need the FE running to render).

### Verified run (2026-06-10)

Executed against the **worktree stack**: worktree BE on `APP_PORT=5050` (real
`notification` module) + worktree FE on `:3100` (Next webpack dev — see note —
with `.env.local` `API_SERVER_URL=http://localhost:5050`), Mongo seeded.
Command: `E2E_BASE_URL=http://localhost:3100 yarn e2e e2e/notifications/notifications.e2e.ts`
→ **14/14 passed**.

> **Backfill expansion (2026-06-14) — re-run pending.** The suite was extended
> with the matrix `NEW` scenarios (rows 1b, 5a, 5c, 6b, 7-content, 9-vi, 10c,
> 11c, 11d, 11e, 12-announcer, 12-keyboard). `npx playwright test e2e/notifications --list`
> now discovers **28 chromium test blocks** (+1 `auth.setup`). These backfill
> tests have **not yet been executed** against a running app — they were verified
> by `npx tsc --noEmit` (0 errors) + discovery only. Re-run
> `E2E_BASE_URL=… yarn e2e e2e/notifications/notifications.e2e.ts` and record the
> true pass count before relying on it; the old "14/14" figure is stale and is
> intentionally **not** updated to an unverified number.

Environment notes (worktree-specific, not feature defects):

- **Turbopack fails through the `node_modules` junction** ("Next.js package not
  found"). Run the worktree FE with **plain webpack dev** (`npx next dev -p 3100`),
  not `--turbopack`.
- **Cross-suite session contamination** when running the *whole* `yarn e2e`:
  the `change-password` happy-path rotates the user password, which revokes the
  shared-storageState refresh token, so later user-auth suites (`apps-list`,
  `notifications`) land on the login screen. The notifications suite passes
  cleanly **on its own**; this is a pre-existing suite-isolation issue (also
  affects `apps-list`) to fix separately, not a notifications-feature bug.
- **AuthN test cookie leak**: refresh cookies are scoped to `localhost` (not
  port-specific), so a `browser.newContext()` could inherit a stale authed
  cookie. The test now passes `storageState: undefined` + `clearCookies()` to
  guarantee a clean unauthenticated context (deterministic).

## 3. Scenarios (one test per ✅ matrix row)

| # | Matrix row | Test | Backend |
| --- | --- | --- | --- |
| 1 | Happy path | Unread tab active by default; ≥1 `article` visible; a Today/Yesterday/Earlier group header visible; a relative timestamp (`/ago\|trước\|hour\|minute\|day/i`) visible | **Real** |
| 2 | AuthN | Fresh `browser.newContext({ storageState: undefined })` + `clearCookies()` → `goto("/notifications")` shows the login screen ("Continue with email") and the protected Unread tab is absent | **Real** |
| 3 | Empty state | Intercept list API → `{items:[], meta:{total:0,…,totalPages:0}}` → `states.empty` text visible | **Intercept** |
| 4 | Boundary / pagination | Intercept page1 (`totalPages:2`) + page2 → "Load more" visible, click appends page-2 items, button gone on last page | **Intercept** |
| 5 | Tabs filter | Unread tab shows mark-read buttons; switch to Read tab → mark-read buttons count 0 | **Real** |
| 6 | Data rendering | Seeded literal title (`"Unusual sign-in detected"`) shown verbatim; **no** ISO substring (`/\dT\d\d:\d\d/`) in body; icon container (`aria-hidden`) present | **Real** |
| 7 | i18n (en) | `/notifications` → Unread/Read tabs + "Mark all as read" button chrome | **Real** |
| 7 | i18n (vi) | `/vi/notifications` → Chưa đọc/Đã đọc tabs + "Đánh dấu tất cả đã đọc" button chrome | **Real** |
| 8 | Error / loading | Intercept list API → `500` before goto → `states.error` text visible | **Intercept** |
| 9 | Mark single | On unread tab: read API unread-count, click first item's mark-read button, assert count **decreases by exactly 1** (delta, polled) and the marked title leaves the unread list | **Real (mutates)** |
| 10 | Mark all | Intercept list + unread-count + read-all PATCH → click "Mark all as read" → unread tab becomes empty (`states.empty`), intercepted items gone | **Intercept** |
| 11 | A11y | Mark-read button has accessible name + is keyboard-focusable (`focus()` → `toBeFocused()`); "Load more" reachable & focusable by role (intercept drives pagination) | **Real + intercept** |

### Backfill scenarios (matrix `NEW` rows — added 2026-06-14)

| # | Matrix row | Gate | Test | Backend |
| --- | --- | --- | --- | --- |
| 1b | Happy path — header bell + panel | **A only** | Intercept `unread-count: 3` + list → bell shows `3` badge; open panel → first-page items visible + "Mark all as read" affordance present (asserted, never clicked). Second test: `unread-count: 0` → no numeric badge on bell | **Intercept** |
| 5a | Empty / null — per-tab empty (Read) | A+B | Intercept list returning `[]` only when `isRead=true` (Unread tab still has data) → switch to Read tab → `states.empty` visible. [EP] | **Intercept** |
| 5c | Empty / null — null `readAt` | A+B | Intercept one `isRead:false, readAt:null` item → title renders, no `pageerror` captured. [EP] | **Intercept** |
| 6b | Boundary — single full page | A+B | Intercept exactly **20** items with `totalPages:1` → "Load more" **never** rendered (`hasNextPage===false` from page 1). [BVA] | **Intercept** |
| 7 | Filter — Read-tab content | A+B | Real seed: `SEED_UNREAD_TITLE` visible / `SEED_READ_TITLE` absent on Unread; inverse on Read tab. [Decision Table] | **Real** |
| 9 | i18n — vi relative-time | A+B | `/vi/notifications` → a timestamp matches `/trước/` specifically; English `\bago\b` absent (locale-leak guard). [Error Guessing] | **Real** |
| 10c | Error — mark-read failure | A+B | Intercept list (1 unread) + `PATCH /:id/read → 500` → `toast.markReadError` ("Could not mark as read.") fires **and** item stays unread (invalidate-on-success: no rollback needed). [Error Guessing] | **Intercept** |
| 11c | Mutation — mark-all no-op | **A only** | Intercept empty list + `count:0` + `read-all → {updated:0}` → click mark-all → still empty, no negative/any numeric badge. [BVA] | **Intercept** |
| 11d | Mutation — double-click idempotent | **A only** | Intercept list (1 unread) + delayed `PATCH /:id/read` → two rapid clicks → button `disabled` while `isPending` swallows the 2nd → PATCH count `=== 1` (count −1, not −2). [State Transition] | **Intercept** |
| 11e | Mutation — persistence after reload | **A only** | **REAL** mark-single → item leaves Unread → `page.reload()` → still out of Unread (default tab), present on Read tab (authoritative refetch). [State Transition] | **Real (mutates)** |
| 12 | A11y — announcer (tab change) | A+B | Switch to Read tab → `#announcer` (`aria-live="polite"`) text equals `announce.tabChanged` ("Showing Read notifications."). [State Transition] | **Real** |
| 12 | A11y — announcer (load-more) | A+B | Intercept 2-page set → click Load more → `#announcer` text equals `announce.loadingMore` ("Loading more notifications..."). | **Intercept** |
| 12 | A11y — keyboard activation | **A only** | Focus mark-read button → press **Enter** (and **Space**, separate test) → mark-read `PATCH` fires (same handler as click). Measured at request layer via intercept (no seed mutation). [State Transition] | **Intercept** |

> **Namespace note**: the page (`/notifications`) chrome is namespace
> `notifications.*` (tabs/actions/states/toast/announce); the header bell label
> + panel "Mark all as read" come from `dashboard.*`
> (`dashboard.header.notificationsLabel`, `dashboard.notifications.markAllRead`).
> The panel mark-all assertion is scoped inside the popover (anchored on its
> "View all notifications" button) to avoid matching the PageHeader mark-all.

### Intentionally NOT tested here (covered by BE — see `design.md` §6)

- **AuthZ (row 3)** — ownership 404 on `PATCH /notifications/:id/read` for a
  foreign id: enforced in the query filter, covered by BE integration. No FE UI
  path can target another user's notification id.
- **Validation / FE form (row 4)** — `page=abc` / oversized `limit`: server-side
  `queryPipe` validation + `MAX_LIMIT` clamp, covered by BE. The page has no
  manual page/limit input (load-more only), so there is no client form to test.

### Loading state

The loading-skeleton/text (`states.loading`) is transient and race-prone to
assert deterministically without an artificial intercept delay; it is **deferred**
(low value vs. flake risk). The error path (row 10/test 8) is covered.

## 4. Why intercepts where used

The page exposes only **Unread** and **Read** tabs (no "all" tab) and page size
is 20. The seed is 26 notifications split across read/unread, so a **single
tab** is not guaranteed to exceed 20 items → 2-page pagination per tab is not
deterministic from the seed alone. Tests 4, 10, and the load-more half of test
11 therefore drive the list via `page.route` for stable assertions. Tests 3
(empty) and 8 (500) likewise use intercepts because the seed always has data
and never errors. All other tests run against the real backend.

## 5. Teardown / reseed requirement (mutation safety)

- **TWO tests fire a REAL `PATCH /notifications/:id/read`** that permanently
  flips a seeded notification to read:
  1. **Test 9 (mark single)** — validates the live mutation + badge-decrement path.
  2. **Row 11e (persistence after reload)** — validates state survives a reload
     (added 2026-06-14, in the same `describe.serial` block, after test 9).
- **There is no mark-unread API**, so neither test can programmatically revert.
  The `afterAll` hook documents this (now naming **both** tests) rather than
  attempting a revert.
- **All other backfill mutation-path tests** (11c mark-all no-op, 11d
  double-click idempotency, 12 keyboard activation) use **route intercepts** and
  do **not** touch the real backend — seeded state stays intact.
- **Test 10 (mark all)** likewise uses route intercepts and leaves the seed intact.
- **To restore state for a clean re-run:** `cd server && yarn seed --clear && yarn seed`.

## 6. Follow-ups / known gaps

- Per-tab 2-page pagination against the real backend is unverified (seed volume
  per tab < 20); covered deterministically via intercept instead. If the seed
  later guarantees > 20 unread items, test 4 could switch to real backend.
- Loading-state assertion deferred (see §3).
- **`announce.markedRead` / `announce.markedAllRead` live-region assertions —
  DEFERRED.** These fire only on a real mutation's `onSuccess`, so asserting
  them would require mutating the real seed purely to read the announcer — no
  added coverage beyond the existing real mark-single (test 9) + persistence
  (11e), and it adds reseed burden. The `#announcer` wiring is already proven by
  the read-only tab-change + intercept-driven load-more announcer tests (row 12).
  If thoroughness is later required, piggyback an
  `expect(page.locator("#announcer")).toHaveText(announce.markedRead)` onto the
  existing test 9 (no new mutating test needed).
- **Auto-revert for the two real mark-single tests (test 9 + 11e) — DEFERRED**:
  no mark-unread API exists; `afterAll` is a documented no-op. Restore manually
  via `cd server && yarn seed --clear && yarn seed`.
