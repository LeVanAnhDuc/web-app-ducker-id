# E2E Execution Notes — Admin Lock/Unlock User

> Written by task DOCS-1 (plan.md). Mirrors the `## 6. E2E Scenario Matrix` in
> `design.md`, recording the FINAL scenario list as implemented in
> `client/e2e/admin-users-lock/lock-unlock.e2e.ts` and
> `client/e2e/admin-authz/admin-authz.e2e.ts`, plus what gate B (MCP walk)
> should and should not do.

## Suite location

- New suite: `client/e2e/admin-users-lock/lock-unlock.e2e.ts` — runs under the
  Playwright **`admin`** project (admin storageState). Routed via
  `playwright.config.ts` (`admin-users-lock` added to both the `admin` project
  `testMatch` and the `chromium` project `testIgnore` alternations).
- Extended existing suite: `client/e2e/admin-authz/admin-authz.e2e.ts` — runs
  under the **`chromium`** project (non-admin storageState) + one token-less
  request context, reusing the file's existing `apiContext`/`nonAdminToken`
  pattern (beforeAll login, no extra logins per test).

## Seeded users used

| Email | Password | Seed `isActive` | Role in suite |
|---|---|---|---|
| `admin@test.com` | `Admin@123` | `true` | Actor (admin storageState + bearer token captured once in `beforeAll`) |
| `user2@test.com` | `User@123` | `true` | Lock target — locked/unlocked repeatedly, reverted to `true` after every test and in `afterAll` |
| `inactive@test.com` | `Inactive@123` | `false` | Unlock target — unlocked once, re-locked (`false`) after use and in `afterAll` |

`admin@test.com`'s own `_id` (fetched via `GET /users/me` in `beforeAll`) is
used for the self-lock guard check (row 4 in the matrix) and is restored to
`isActive:true` immediately after that check runs.

`afterAll` in `lock-unlock.e2e.ts` PATCHes both `user2@test.com` → active and
`inactive@test.com` → locked unconditionally; since lock/unlock is idempotent
(200 no-op if already in that state), this is safe to run even if every
individual test already reverted its own mutation — it is a backstop, not the
primary revert mechanism.

## Scenario list (final) — gate tags per design.md §6

| # | Category | Scenario | Gate | Test |
|---|---|---|---|---|
| 1 | Happy path | Lock active user via row menu → toast "Account locked.", badge Active→Locked; revert. Unlock locked user via row menu → toast "Account unlocked.", badge Locked→Active. **[ST]** valid transitions | A only | `lock-unlock.e2e.ts` → "happy path" describe (2 tests) |
| 2 | AuthN | Token-less `PATCH /admin/users/:id/lock` → 401 `AUTH_MISSING_TOKEN` | A+B | `admin-authz.e2e.ts` → "AuthN denial (no token)" |
| 3 | AuthZ | Non-admin `PATCH .../lock` and `.../unlock` → 403 `AUTH_ADMIN_ONLY` on both. **[DT]** role×endpoint; guard order confirmed — `adminGuard` rejects before the self-lock branch (placeholder id used, never reaches `ADMIN_CANNOT_LOCK_SELF`) | A+B | `admin-authz.e2e.ts` → "non-admin authorization (403)" |
| 4 | Validation | **[DT]** precedence via direct admin-API calls: malformed id (not 24-hex) → 400; well-formed but non-existent id → 404 `USER_NOT_FOUND`; admin locking own id → 403 `ADMIN_CANNOT_LOCK_SELF`; admin unlocking own id → 200 (no self-guard on unlock); locking a valid non-self target → 200 | A only | `lock-unlock.e2e.ts` → "validation (admin API)" (5 tests) |
| 5 | Empty / null | N/A — no new empty/null state introduced by this feature (list-level null-render already covered by `e2e/unified-list/admin-users.e2e.ts`) | — | N/A |
| 6 | Boundary / pagination | **DEFERRED** — see below | A only (deferred) | not implemented |
| 7 | Filter / search | Lock `user2@test.com` via API → visible under `?status=locked`, hidden under `?status=active`; revert | A only | `lock-unlock.e2e.ts` → "filter after mutation" |
| 8 | Data rendering | Status badge shows "Active"/"Locked" (not boolean); row-menu item label toggles "Lock account"/"Unlock account" per current `isActive`; raw `true`/`false` never rendered | A+B | `lock-unlock.e2e.ts` → "data rendering" |
| 9 | i18n (en+vi) | EN: dialog title/description + confirm button + toast render English strings. VI: same in Vietnamese (`/vi/admin/users`), plus no `[adminUsers.` missing-message placeholder | A+B | `lock-unlock.e2e.ts` → "i18n" (2 tests) |
| 10 | Error / loading | BE 500 on lock (`page.route` fulfill) → generic error toast, confirm button re-enabled (not stuck), badge stays "Active" (non-optimistic — no flip-then-rollback) | A only | `lock-unlock.e2e.ts` → "error / loading" |
| 11 | Mutation safety | **[DT]** idempotent: lock→lock (still 200, `isActive:false`); unlock on already-active (still 200, `isActive:true`). Double-submit: two near-simultaneous clicks on confirm → exactly 1 PATCH fired (route counter). Login-after-lock: locked account login → `LOGIN_ACCOUNT_INACTIVE`; unlock → login succeeds (fresh request context, not shared with admin session) | A only | `lock-unlock.e2e.ts` → "mutation safety" (4 tests) |
| 12 | Accessibility | Keyboard: focus row-menu trigger + Enter opens menu, Enter on confirm fires exactly 1 request. Dismiss paths: Cancel → dialog closes, 0 requests; Escape → dialog closes, 0 requests | A+B | `lock-unlock.e2e.ts` → "accessibility" (3 tests) |

### BE contract tests (not Playwright — per design.md, covered by BE-2/BE-3 Jest specs)

- Soft-lock capability (access token issued before lock still authorizes until
  refresh) — `authentication.service.spec.ts` / existing guard tests.
- Refresh-after-lock → `REFRESH_TOKEN_INVALID` — existing `AuthActiveGuard`
  coverage (unchanged by this feature).
- `setUserActive` idempotency + self-lock guard — `user.service.spec.ts`.

These are intentionally NOT duplicated as Playwright E2E (design.md rationale:
BE unit/integration tests are more precise and stable than driving a browser
for token-TTL-dependent behavior).

## Deferred / N/A (carried from design.md, unchanged)

1. **Row 6 — Boundary/pagination (lock a row on the current page while
   paginated by `status=active`, or lock the last row of a page)** — deferred
   from the committed E2E suite. Reason: exercising this deterministically
   requires seeding enough active users to fill a full page boundary, which
   this feature's seed data does not provide (only `user2@test.com` and
   `admin@test.com` are active by default, well under one page). Flagged as a
   manual/future follow-up if the seeded user count changes to allow a stable
   page-boundary case (see `design.md` row 6 for the exact scenario:
   post-invalidate row removal must not crash on an empty page and must not
   lose scroll/focus position).
2. **Concurrent 2nd-admin tab / stale target (design.md critic #4)** — N/A,
   no delete-user feature exists yet; lock-after-lock is 200 idempotent so
   there is no lost-update to test.
3. **Admin own-session expiry mid-action (critic #7) / back-forward zombie
   dialog (critic #12)** — deferred from committed E2E per design.md: timing-
   dependent on token TTL, prone to flakiness; the app's generic axios
   refresh-retry interceptor already covers the underlying re-auth path.

## Gate B (MCP walk) instructions

- Walk ALL `A+B` rows (2, 3, 8, 9, 12) with a browser driven via Playwright
  MCP, using its OWN login (admin credentials for the `lock-unlock` rows,
  non-admin/token-less for the `admin-authz` rows) — do NOT reuse gate A's
  storageState.
- For every row tagged `A only` (1, 4, 6\*, 7, 10, 11): **verify render/i18n/
  visual state only — do NOT mutate** (do not click Lock/Unlock confirm to
  completion). If gate B needs to see a "Locked" badge to confirm rendering,
  read the state produced by gate A's run rather than causing a new mutation,
  or navigate to `/admin/users?status=locked` read-only.
  (\* row 6 is deferred, so gate B has nothing to walk for it.)
- Verify i18n row 9 in BOTH `en` (default) and `vi` (`/vi/admin/users`)
  locales — open the lock dialog in each and check title/description/confirm
  button text, and check console/network tabs for errors during the flow.

## Accessibility follow-ups flagged (not fixed here — app code untouched)

- No new a11y issues found specific to lock/unlock: `UserRowActions` already
  exposes an accessible `aria-label` (`adminUsers.table.rowMenuLabel` →
  "User actions" / "Thao tác với người dùng") on the menu trigger, and
  `AdminUsersLockDialog` uses Radix `Dialog` + `DialogTitle`, which wires
  `aria-labelledby` automatically — `getByRole("dialog", { name: ... })`
  resolves correctly without a fallback selector.
- Carried over from `admin-authz.e2e.ts` (pre-existing, not introduced by this
  feature): there is no client-side role guard on `/admin/*` routes — a
  non-admin who navigates there is not redirected; only the BE 403 protects
  the data. This is documented in that file as a tracked FE authorization gap,
  unrelated to lock/unlock specifically.

## Rate-limit awareness (CLAUDE.md §4.3)

- BE login guard: 30 requests/IP/15min. `lock-unlock.e2e.ts` performs at most
  3 real `POST /auth/login` calls total across the whole file: 1 in
  `beforeAll` (admin bearer token) + up to 2 in the login-after-lock test
  (locked-login denial + post-unlock login success). All other assertions
  reuse the admin bearer token or the already-authenticated `page` session.
- `admin-authz.e2e.ts` reuses its existing `beforeAll` non-admin login (no
  additional logins added by the new lock/unlock denial tests — they reuse
  `apiContext` + `nonAdminToken`).
- No new rate limits are hit on the lock/unlock endpoints themselves per the
  plan (BE does not rate-limit `/admin/users/:id/lock|unlock` — admin-only
  routes are not IP-rate-limited the way public auth endpoints are).

## Follow-ups (a11y, flagged — pre-existing, not blocking this feature)
- Radix menu→dialog: on dialog dismiss, focus falls to `<body>` (opener menuitem unmounted) instead of returning to the row trigger.
- vi locale: dialog icon-only Close (X) button keeps an English accessible name (shadcn Dialog primitive-level i18n gap).
