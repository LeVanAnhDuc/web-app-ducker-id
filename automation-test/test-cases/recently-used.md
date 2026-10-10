# RECENT — test cases

The `/recently-used` history: grouping, open counts, search and paging,
remove with Undo, clear all, and the record an app launch or an OIDC sign-in
leaves (REQ-RECENT-01…05).

Source of truth: `client/src/views/RecentlyUsed/**`, `client/src/utils/recentApps.ts`,
`client/src/hooks/useOpenApp.ts`, `client/src/locales/{en,vi}/recentlyUsed.json`,
`server/src/modules/recent-app/**`, `server/src/modules/oauth/services/authorize.ts`,
`server/src/validators/schemas/recent-app.ts`.
Converted from `docs/specs/recently-used/e2e.md` (scenarios 1–9; its note that
OIDC recording had no E2E is now TC-RECENT-028).

**Test data.** Browser cases run as `user@test.com`: the file snapshots the
visible history in `beforeAll` and replays it in `afterAll`
(`helpers/recentApps.ts`; replaying resets open counts to 1, which nothing
asserts on). Apps are the first catalogue apps by name. Day groups, paging and
failure stub `GET /users/me/recent-apps` and pin the browser clock
(`page.clock`) and timezone (Asia/Ho_Chi_Minh). API cases run on throwaway
accounts; `ageRecentUse()` moves a throwaway's last use back in Mongo to step
across the dedupe window without waiting.

**Server facts the cases rely on.** `POST /:appId` records a launch (204) for
an app the caller can see, else 404; writes within 60 s of the previous one
move `lastUsedAt` but do not add to `useCount`. `DELETE /:appId` hides one row
(soft delete, purged after 30 days), `POST /:appId/restore` un-hides it with
its count, `DELETE /` hides all; recording a hidden app restarts its count at

1. Paging: `page` ≥ 1, `limit` 1…100, `search` ≤ 200. Records are rate
   limited at 60 per user per minute. The OIDC authorize step records the app it
   signs the user into.

### TC-RECENT-001 — Opened apps are listed under Today, newest first

- **Requirement:** REQ-RECENT-01, REQ-RECENT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path, State Transition (record B then A)
- **Preconditions:** history cleared; two catalogue apps
- **Steps:**
  1. Record B, then A; open `/recently-used`.
- **Expected:** a "Today" region lists A then B, with "Opened once".
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-002 — No history shows the empty state with a catalogue link

- **Requirement:** REQ-RECENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (0 rows)
- **Preconditions:** history cleared
- **Steps:**
  1. Open `/recently-used`; click "Browse apps".
- **Expected:** "No recent apps yet"; the button lands on `/apps`.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-003 — Search narrows the history, a miss offers to clear

- **Requirement:** REQ-RECENT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (prefix match / no match), State Transition (cleared)
- **Preconditions:** history = [A]
- **Steps:**
  1. Search A's first four letters; 2. search "zzz-no-such-app"; 3. "Clear filters".
- **Expected:** only A; "No results found"; A again.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-004 — Remove one app, then Undo

- **Requirement:** REQ-RECENT-04
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (listed → removed → restored)
- **Preconditions:** history = [A]
- **Steps:**
  1. Click "Remove from history: A"; click "Undo" on the toast.
- **Expected:** the row leaves at once; Undo brings it back and the API lists A.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-005 — Clear history asks first and the result survives a reload

- **Requirement:** REQ-RECENT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (listed → confirm → cleared → reload)
- **Preconditions:** history = [A]
- **Steps:**
  1. "Clear History" → confirm "Clear history" in the dialog; reload.
- **Expected:** a dialog first; then "No recent apps yet", still after reload.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-006 — Opening an app from the catalogue lands it in the history

- **Requirement:** REQ-RECENT-01, REQ-APPS-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition across pages
- **Preconditions:** history cleared; new tabs closed as they open
- **Steps:**
  1. Click "Open A" on `/apps`; open `/recently-used`.
- **Expected:** `POST /users/me/recent-apps/<id>` → 204; A is listed.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-007 — The heart on a row toggles the favourite

- **Requirement:** REQ-FAV-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (toggle twice)
- **Preconditions:** history = [A]
- **Steps:**
  1. Click the row's heart twice.
- **Expected:** `aria-pressed` flips, then returns to its first value.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-008 — Infinite scroll loads the next page and says when it ends

- **Requirement:** REQ-RECENT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (page 1 → last page)
- **Preconditions:** list stubbed: two pages of one row
- **Steps:**
  1. Open `/recently-used` and let the sentinel / Load more fetch page 2.
- **Expected:** both rows render; "You've reached the end of your history."
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-009 — Vietnamese page

- **Requirement:** REQ-RECENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** history = [A]
- **Steps:**
  1. Open `/vi/recently-used`.
- **Expected:** h1 "Dùng gần đây" and a "Hôm nay" region.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-010 — Day groups switch exactly at local midnight

- **Requirement:** REQ-RECENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (each side of the Today / Yesterday / This Week / Earlier edges)
- **Preconditions:** clock fixed at 07.10.2026 10:00 (UTC+7); list stubbed
- **Steps:**
  1. Serve rows used at 07.10 00:00:00, 06.10 23:59:59, 06.10 00:00:00,
     05.10 23:59:59, 01.10 00:00:00, 30.09 23:59:59; open the page.
- **Expected:** Today = 1; Yesterday = 2, 3; This Week = 4, 5; Earlier = 6.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-011 — A row shows its last-opened time and open count

- **Requirement:** REQ-RECENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (count 1 / many), plural rules
- **Preconditions:** list stubbed (useCount 3, opened 2 h ago; useCount 1)
- **Steps:**
  1. Open `/recently-used`.
- **Expected:** "Opened 3 times" and a relative "… ago" last-opened time;
  "Opened once" on the other row.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-012 — Cancelling the clear dialog keeps the history

- **Requirement:** REQ-RECENT-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (confirm dialog → cancel)
- **Preconditions:** history = [A]
- **Steps:**
  1. "Clear History" → "Cancel".
- **Expected:** the dialog ("Clear your recent history?") closes, A is still
  listed and still in the API.
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-013 — A failing history request shows an error, not the empty state

- **Requirement:** REQ-RECENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (5xx)
- **Preconditions:** list stubbed with 500
- **Steps:**
  1. Open `/recently-used`.
- **Expected:** an alert "Could not load your recent apps."; no "No recent apps yet".
- **Automated:** `tests/e2e/recently-used/recently-used.e2e.ts`

### TC-RECENT-020 — List contract: one row per app, newest first

- **Requirement:** REQ-RECENT-01, REQ-RECENT-02
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** specification check, State Transition (A, B, A)
- **Preconditions:** fresh account
- **Steps:**
  1. Record A, B, A; list.
- **Expected:** 204 each; items `[A, B]`; meta total 2 / page 1 / 1 page;
  each row has a valid `lastUsedAt`, `useCount ≥ 1`, boolean `isFavorite`.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-021 — The dedupe window counts one open per minute

- **Requirement:** REQ-RECENT-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** BVA (59 s / 61 s since the last open)
- **Preconditions:** fresh account
- **Steps:**
  1. Record twice at once; age the row 59 s and record; age it 61 s and record.
- **Expected:** `useCount` 1, 1, 2.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-022 — Hide, restore, clear and re-record

- **Requirement:** REQ-RECENT-04
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** State Transition (visible → hidden → restored → cleared → recorded)
- **Preconditions:** A (count 2) and B recorded
- **Steps:**
  1. DELETE A; POST A/restore; DELETE all; record A.
- **Expected:** list `[B]`; A back with count 2; empty with `total 0,
totalPages 0`; `[A]` with count 1.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-023 — Page and limit boundaries

- **Requirement:** REQ-RECENT-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** BVA (page 1 / last / last+1, limit 0 / 100 / 101, search 201), EP (`abc`)
- **Preconditions:** three apps recorded
- **Steps:**
  1. `limit=1` pages 1, 3, 4; then the invalid values.
- **Expected:** one row on 1 and 3 (different apps), `[]` on 4; page 0 / abc,
  limit 0 / 101, a 201-character search → 400; limit 100 → 200.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-024 — Search over the history

- **Requirement:** REQ-RECENT-03
- **Layer:** api · **Priority:** P3 · **Role:** throwaway user
- **Technique:** EP (match / no match)
- **Preconditions:** A and B recorded
- **Steps:**
  1. `search=<A's name>`; `search=zzz-no-such-app`.
- **Expected:** A is in the result and `total` equals the rows returned; `[]` with total 0.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-025 — Id validation

- **Requirement:** REQ-RECENT-04
- **Layer:** api · **Priority:** P3 · **Role:** throwaway user
- **Technique:** EP (malformed / unknown id)
- **Preconditions:** fresh account
- **Steps:**
  1. Record / hide / restore `not-an-id`; record `ffff…ffff`.
- **Expected:** 400 three times; 404 with an error `code`.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-026 — Every endpoint requires a session

- **Requirement:** REQ-RECENT-01, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token)
- **Preconditions:** none
- **Steps:**
  1. Call list, stats, record, hide, restore and clear without a token.
- **Expected:** 401 each.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-027 — History is private to each user

- **Requirement:** REQ-RECENT-01, REQ-RECENT-04
- **Layer:** api · **Priority:** P1 · **Role:** two throwaway users
- **Technique:** Error Guessing (IDOR across accounts)
- **Preconditions:** Alice recorded A, Bob recorded B
- **Steps:**
  1. Compare lists; Bob hides A and clears his history.
- **Expected:** each sees only their own app; Alice still has A afterwards.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`

### TC-RECENT-028 — Signing in to a satellite app records it as used

- **Requirement:** REQ-RECENT-05
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user with an IdP session
- **Technique:** State Transition (no history → authorize → recorded)
- **Preconditions:** a public OAuth client registered by the spec
- **Steps:**
  1. Run `/oauth/authorize` (PKCE) on the session until a code is issued; list.
- **Expected:** the history becomes exactly `[client app]` with `useCount` 1.
- **Automated:** `tests/api/recently-used/recent-apps.api.ts`
