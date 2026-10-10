# ADMUSERS — test cases

The admin user list at `/admin/users`, locking and unlocking an account, and
resetting a user's password (REQ-ADMUSERS-01…03).

Source of truth: `client/src/views/AdminUsers/**`,
`client/src/dataSources/AdminUsers`, `client/src/hooks/useListQuery.ts`,
`client/src/libs/query-client.ts` (global error toasts),
`client/src/locales/{en,vi}/{adminUsers,list}.json`,
`server/src/modules/user/**` (`set-user-active.ts`, `admin-reset-password.ts`,
`get-admin-users.ts`), `server/src/validators/schemas/user.ts`.
Converted from `docs/specs/admin-users-list/e2e.md`,
`docs/specs/admin-lock-unlock-user/e2e.md`, the admin-side rows of
`docs/specs/admin-reset-password/e2e.md` and the admin-users rows of
`docs/specs/unified-list-experience/e2e.md`. The user's forced password
change after a reset belongs to the password module.

**Test data.** The list is read-only and asserts on the seeded
`admin@test.com`, `user@test.com` and `unverified@test.com` (never signs in,
so `lastLoginAt` stays null). Every lock, unlock and reset targets a
throwaway account from `createAccount()`; pages are opened with
`?search=<email>` so the row is on screen whatever the database holds. The
self-lock case restores the admin in `afterEach` (an access token keeps
working after a lock). A second admin for the decision table is a throwaway
promoted with `helpers/adminUsers.ts → promoteToAdmin`.

**Server facts the cases rely on.** Page size 20; `limit` 1…100; `page` ≥ 1
integer; `search` ≤ 200 characters, matches name or email,
case-insensitive, regex-escaped; `role` ∈ {user, admin}; `status` ∈
{active, locked}; `sortBy` ∈ {createdAt, fullName, lastLoginAt}. A
malformed id answers 400 `VALIDATION_ERROR`, an unknown one 404
`USER_NOT_FOUND`; locking yourself 403 `ADMIN_CANNOT_LOCK_SELF`, resetting
yourself 403 `ADMIN_CANNOT_RESET_SELF`. Admin mutations are rate-limited to
20 / 15 min per IP + admin. The reset's temporary password (16 characters)
only leaves the server by email; the suite reads it from the BullMQ `email`
queue's job data (`readTempPassword`). There is no client-side role guard on
`/admin/*`: a non-admin sees the page shell and the API's 403.

## List — REQ-ADMUSERS-01

### TC-ADMUSERS-001 — Admin sees the account list with search and filters

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (valid admin session)
- **Preconditions:** seeded accounts
- **Steps:**
  1. Open `/admin/users`.
- **Expected:** the search box (in the `search` landmark), the "Filters"
  button and the table render; `admin@test.com` and `user@test.com` are
  listed.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-002 — A guest is sent to sign in

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (unauthenticated → guard → /login)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/users` without a session.
- **Expected:** the browser lands on `/login`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-003 — A non-admin gets a refusal and no account data

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role × route)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/users` as `user@test.com`.
- **Expected:** `GET /admin/users` answers 403, the toast "Forbidden access"
  appears and no email of another account is rendered.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-004 — Tampered URL params are sanitised

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (invalid role), Decision Table (invalid + valid params)
- **Preconditions:** none
- **Steps:**
  1. Open `?role=xyz`, then `?role=xyz&search=admin`, then `?page=abc&role=admin`.
- **Expected:** an unknown role is dropped (all roles shown); a valid search
  next to it still applies; `page=abc` falls back to 1 and keeps `role=admin`
  (`user@test.com` absent).
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-005 — Special characters in search do not break the page

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (emoji, `%`)
- **Preconditions:** none
- **Steps:**
  1. Open `?search=🔍%test`.
- **Expected:** the table or the "No users match" state renders.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-006 — A search with no match shows the empty state

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (no-match class)
- **Preconditions:** none
- **Steps:**
  1. Open `?search=zzznomatch99999`.
- **Expected:** "No users match" and a "Clear filters" button.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-007 — Clear filters restores the full list

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (filtered → cleared)
- **Preconditions:** none
- **Steps:**
  1. Open the no-match search, click "Clear filters".
- **Expected:** the URL loses `search=`, `admin@test.com` is listed again.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-008 — Out-of-range page numbers render safely

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (page 0, −1, 9999)
- **Preconditions:** none
- **Steps:**
  1. Open `?page=9999`, `?page=0`, `?page=-1`.
- **Expected:** 9999 shows the table or an empty state without an error;
  0 and −1 are treated as page 1 (table with `admin@test.com`).
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-009 — Typing a search narrows the list and writes the URL

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (matching search)
- **Preconditions:** none
- **Steps:**
  1. Type "admin" into the list search.
- **Expected:** after the 300 ms debounce the URL carries `search=admin`;
  `admin@test.com` is listed and `user@test.com` is not.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-010 — Emptying the search box restores every account

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (searched → empty search)
- **Preconditions:** none
- **Steps:**
  1. Open `?search=admin`, clear the box.
- **Expected:** `user@test.com` is listed again.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-011 — Changing a filter resets to page 1

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (page 3 → filter change → page 1)
- **Preconditions:** none
- **Steps:**
  1. Open `?page=3`, choose Role = Admin in the Filters panel.
- **Expected:** the URL carries `page=1`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-012 — Role, status and search apply together

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (role × status × search)
- **Preconditions:** none
- **Steps:**
  1. Open `?role=admin&status=active&search=admin`.
- **Expected:** `admin@test.com` is listed, `user@test.com` is not.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-013 — List state survives reload and Back

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (URL as source of truth)
- **Preconditions:** none
- **Steps:**
  1. Open `?search=admin&role=admin`, reload.
  2. From `/admin/users`, type a search, press Back.
- **Expected:** after reload both params and the result remain; Back returns
  to the URL without `search=admin`.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-014 — Roles, statuses and dates render as labels

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (enum and null values)
- **Preconditions:** `unverified@test.com` has never signed in
- **Steps:**
  1. Open `?role=admin`, `?status=active` and `?search=unverified@test.com`.
- **Expected:** badges read "Admin" / "Active"; the unverified account's Last
  Login cell reads "Never"; the text "null" / "undefined" never appears.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-015 — English list chrome, no missing messages

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** i18n (en)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/users`.
- **Expected:** "Filters" button, search named "Search"; no `[list.` /
  `[adminUsers.` placeholder.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-016 — Vietnamese list chrome, no missing messages

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/admin/users`.
- **Expected:** "Bộ lọc" button, search `aria-label` "Tìm kiếm"; no missing
  message placeholder.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-017 — Toolbar is reachable and operable by keyboard

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility
- **Preconditions:** none
- **Steps:**
  1. Locate search and Filters by role; open the Filters panel; press
     Escape; Tab from the search box.
- **Expected:** both controls have accessible names; Escape closes the
  panel; the Filters button stays focusable.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-018 — The table shows the expected columns

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/users`.
- **Expected:** column headers User, Role, Status, Last Login, Created.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-019 — A failed list load is reported, not shown as "no users"

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (5xx)
- **Preconditions:** `GET /admin/users` stubbed to 500
- **Steps:**
  1. Open `/admin/users`.
- **Expected:** after React Query's two retries the toast "Server error.
  Please try again later." appears, and the page shows "Could not load users.
  Please try again." instead of the "No users match" empty state.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts` — the empty-state half is
  `test.fail()`: **BUG** — `AdminUsersTable` has no error branch since the
  unified-list refactor, so a failed load renders "No users match".

### TC-ADMUSERS-020 — A skeleton shows while the list loads

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (slow response)
- **Preconditions:** list response delayed 1.5 s
- **Steps:**
  1. Open `/admin/users`.
- **Expected:** pulse skeleton rows first, then the table; no skeleton left.
- **Automated:** `tests/e2e/admin-users/list.e2e.ts`

### TC-ADMUSERS-021 — A finished load is announced to screen readers

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/users`.
- **Expected:** `#announcer` reads "{total} users loaded".
- **Automated:** `tests/e2e/admin-users/list.e2e.ts` — `test.fail()`: **BUG** —
  the list never announces; `adminUsers.announce.loaded` is unused.

### TC-ADMUSERS-022 — List API contract

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** EP
- **Preconditions:** seeded accounts
- **Steps:**
  1. `GET /api/v1/admin/users`.
- **Expected:** 200 envelope `{ timestamp, path, message, data }`;
  `data.meta` `{ page: 1, limit: 20, total, totalPages = ceil(total/limit) }`;
  each item has a 24-hex `_id`, `role` ∈ {user, admin}, boolean `isActive`,
  `lastLoginAt`, a valid `createdAt`, and never `password` / `authId`.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMUSERS-023 — List query validation

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (limit 0/1/100/101/−1, page 0/1/1.5/abc, search 200/201),
  EP (role, status, sortBy, sortOrder valid/invalid)
- **Preconditions:** none
- **Steps:**
  1. Call the list with each value.
- **Expected:** in-range values answer 200 (and `limit` is honoured);
  out-of-range or unknown values answer 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMUSERS-024 — Search semantics

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (email, name, upper case, no match, regex characters)
- **Preconditions:** none
- **Steps:**
  1. Search `user@test.com`, `ADMIN@TEST.COM`, a first name, a nonsense
     string and `.*`.
- **Expected:** matches by email or name, case-insensitively; no match is
  `items: []`, `total: 0`, `totalPages: 0`; `.*` is literal (no rows).
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMUSERS-025 — Role and status filters combine

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (role × status)
- **Preconditions:** one locked throwaway account
- **Steps:**
  1. List with each of role=admin, role=user, status=active, status=locked
     and the combinations user+locked, admin+active, admin+locked.
- **Expected:** every returned row matches every filter; the locked
  throwaway is in user+locked and not in admin+locked.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMUSERS-026 — Only admins reach the admin user endpoints

- **Requirement:** REQ-ADMUSERS-01, REQ-ADMUSERS-02, REQ-ADMUSERS-03
- **Layer:** api · **Priority:** P1 · **Role:** guest, user
- **Technique:** Decision Table (caller role × endpoint)
- **Preconditions:** none (placeholder id)
- **Steps:**
  1. Call `GET /admin/users`, `PATCH …/:id/lock`, `PATCH …/:id/unlock`,
     `POST …/:id/reset-password` without a token and with a user token.
- **Expected:** guest 401 `AUTH_MISSING_TOKEN`; user 403 `AUTH_ADMIN_ONLY`.
- **Automated:** `tests/api/admin-users/users.api.ts`

### TC-ADMUSERS-027 — A page past the last one is empty

- **Requirement:** REQ-ADMUSERS-01
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (last page, last + 1)
- **Preconditions:** none
- **Steps:**
  1. With `limit=1`, read the last page and the one after.
- **Expected:** `totalPages = total`; the last page has 1 row; the next is
  `items: []` with the real `total`.
- **Automated:** `tests/api/admin-users/users.api.ts`

## Lock and unlock — REQ-ADMUSERS-02

### TC-ADMUSERS-030 — Lock an active account from the row menu

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (active → locked)
- **Preconditions:** an active throwaway account "Lock Target"
- **Steps:**
  1. Row menu "User actions" → "Lock account".
  2. Confirm "Lock account" in the dialog "Lock Lock Target's account?".
- **Expected:** toast "Account locked."; the badge reads "Locked";
  `#announcer` reads "Lock Target's account locked.".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-031 — Unlock a locked account from the row menu

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (locked → active)
- **Preconditions:** a locked throwaway account "Unlock Target"
- **Steps:**
  1. Row menu → "Unlock account" → confirm.
- **Expected:** dialog "Unlock Unlock Target's account?"; toast "Account
  unlocked."; the badge reads "Active".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-032 — A locked account cannot sign in until unlocked

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** api · **Priority:** P1 · **Role:** admin, guest
- **Technique:** State Transition (active → locked → active)
- **Preconditions:** a throwaway account
- **Steps:**
  1. Sign in (succeeds). Lock it. Sign in again. Unlock it. Sign in again.
- **Expected:** the locked sign-in is refused with `LOGIN_ACCOUNT_INACTIVE`;
  after unlock the same password signs in.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMUSERS-033 — Malformed and unknown ids are refused

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (malformed id, unknown id)
- **Preconditions:** none
- **Steps:**
  1. Lock and unlock `not-an-object-id` and `aaaaaaaaaaaaaaaaaaaaaaaa`.
- **Expected:** 400 `VALIDATION_ERROR`; 404 `USER_NOT_FOUND`.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMUSERS-034 — An admin cannot lock themself

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** Error Guessing (lock yourself)
- **Preconditions:** none; `afterEach` unlocks the admin as a backstop
- **Steps:**
  1. `PATCH /admin/users/<own id>/lock`.
  2. In the UI, open your own row → Lock account → confirm.
- **Expected:** 403 `ADMIN_CANNOT_LOCK_SELF`; the UI toasts "You cannot lock
  your own account", shows no success toast, and the row stays "Active".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-035 — Unlocking yourself is allowed

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (self × unlock)
- **Preconditions:** none
- **Steps:**
  1. `PATCH /admin/users/<own id>/unlock`.
- **Expected:** 200 `{ isActive: true }` — unlock has no self-guard.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMUSERS-036 — Lock outcome by target role and actor role

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** api · **Priority:** P1 · **Role:** admin, user
- **Technique:** Decision Table (actor role × target role × self)
- **Preconditions:** throwaway targets; one promoted to admin
- **Steps:**
  1. Admin locks a user → 200. Admin locks another admin (two active admins)
     → 200, then unlocks. A non-admin actor locks a user.
- **Expected:** 200 `{ _id, isActive: false }` for both admin actions;
  the non-admin gets 403 `AUTH_ADMIN_ONLY` and the target stays active.
- **Automated:** `tests/api/admin-users/lock-unlock.api.ts`

### TC-ADMUSERS-037 — A locked account moves between status filters

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (state × status filter)
- **Preconditions:** a throwaway account locked through the API
- **Steps:**
  1. Search it under `status=locked`, then `status=active`.
- **Expected:** listed under locked; "No users match" under active.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-038 — Badge and row menu follow the account state

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (active, locked)
- **Preconditions:** one active and one locked throwaway
- **Steps:**
  1. Open each row's menu.
- **Expected:** active → "Active" badge and only "Lock account"; locked →
  "Locked" badge and "Unlock account"; no raw `true` / `false`.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-039 — English lock dialog and toast

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** i18n (en)
- **Preconditions:** an active throwaway
- **Steps:**
  1. Lock it from `/admin/users`.
- **Expected:** "Lock Lock Target's account?", "The user will be unable to
  sign in until an admin unlocks the account.", toast "Account locked.".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-040 — Vietnamese lock dialog, toast and badge

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** an active throwaway
- **Steps:**
  1. On `/vi/admin/users`, "Thao tác với người dùng" → "Khóa tài khoản" →
     confirm.
- **Expected:** "Khóa tài khoản của Lock Target?", "Người dùng sẽ không thể
  đăng nhập cho tới khi admin mở khóa.", toast "Đã khóa tài khoản.", badge
  "Đã khóa"; no `[adminUsers.` placeholder.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-041 — A failed lock changes nothing on screen

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (5xx)
- **Preconditions:** `PATCH …/lock` stubbed to 500
- **Steps:**
  1. Lock an active throwaway.
- **Expected:** toast "Server error. Please try again later."; the confirm
  button is enabled again; after closing, the badge still reads "Active".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-042 — Lock and unlock are idempotent

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (locked → locked, active → active)
- **Preconditions:** one locked and one active throwaway
- **Steps:**
  1. Lock the locked one; unlock the active one.
- **Expected:** both 200 with the unchanged `isActive`; the locked row still
  reads "Locked".
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-043 — Confirming twice sends one request

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (double submit)
- **Preconditions:** lock response delayed 400 ms
- **Steps:**
  1. Confirm a lock.
- **Expected:** the confirm button is disabled while pending; exactly one
  PATCH is sent; "Account locked." appears.
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-044 — Keyboard confirm; Cancel and Escape send nothing

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility
- **Preconditions:** throwaway targets
- **Steps:**
  1. Open the row menu with Enter, confirm with Enter.
  2. Open the dialog and dismiss with Cancel; again with Escape.
- **Expected:** one request for the keyboard confirm; zero for each dismiss.
  (Known gap, not asserted: focus returns to `<body>`, not the row trigger.)
- **Automated:** `tests/e2e/admin-users/lock-unlock.e2e.ts`

### TC-ADMUSERS-045 — The last active admin cannot be locked

- **Requirement:** REQ-ADMUSERS-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (target = last active admin)
- **Preconditions:** exactly one active admin, who is not the caller
- **Steps:**
  1. Lock that admin.
- **Expected:** 403 `ADMIN_CANNOT_LOCK_LAST_ADMIN`.
- **Automated:** manual — the calling admin is always an active admin
  besides the target, so the only "last admin" is the caller, which the
  self-guard answers first; reaching the branch needs `admin@test.com`
  deactivated, which every other spec depends on. Verified by the server's
  `user.service` unit tests.

## Reset password — REQ-ADMUSERS-03

### TC-ADMUSERS-050 — Reset from the row menu

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (valid target)
- **Preconditions:** throwaway "Reset Target"; reset POST stubbed to 200
- **Steps:**
  1. Row menu → "Reset password" → "Send reset".
- **Expected:** dialog "Reset password for Reset Target?" naming the email;
  toast "Reset email sent."; the dialog closes; `#announcer` reads "Password
  reset email sent to Reset Target.".
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-051 — No dialog before an action is chosen

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (initial state)
- **Preconditions:** none
- **Steps:**
  1. Open the list.
- **Expected:** no dialog in the page.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-052 — Reset guards: format, existence, self

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** Error Guessing (malformed id, unknown id, reset yourself)
- **Preconditions:** a throwaway target
- **Steps:**
  1. Reset `not-an-object-id`, `aaaaaaaaaaaaaaaaaaaaaaaa`, your own id and
     the throwaway.
- **Expected:** 400 `VALIDATION_ERROR`; 404 `USER_NOT_FOUND`; 403
  `ADMIN_CANNOT_RESET_SELF`; 200 `{ _id, email }`.
- **Automated:** `tests/api/admin-users/reset-password.api.ts`

### TC-ADMUSERS-053 — Reset issues a temporary password that must be changed

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** api · **Priority:** P1 · **Role:** admin, guest
- **Technique:** State Transition (own password → temporary → reset again)
- **Preconditions:** a throwaway account that signs in
- **Steps:**
  1. Reset it; read the temporary password from the queued email.
  2. Sign in with the old password, then the temporary one.
  3. Reset again; sign in with the first and the second temporary password.
- **Expected:** the old password is refused (401); the 16-character temporary
  password signs in and its id token carries `mustChangePassword: true`; a
  second reset invalidates the first temporary password.
- **Automated:** `tests/api/admin-users/reset-password.api.ts`

### TC-ADMUSERS-054 — Dialog and toast show names, never keys

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP
- **Preconditions:** reset stubbed
- **Steps:**
  1. Open the reset dialog and send.
- **Expected:** the dialog contains the target email; no `adminUsers.` text.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-055 — English reset dialog and toast

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** i18n (en)
- **Preconditions:** reset stubbed
- **Steps:**
  1. Reset from `/admin/users`.
- **Expected:** "Reset password for Reset Target?", "The user will be
  required to set a new password on next sign-in.", "Reset email sent.".
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-056 — Vietnamese reset dialog and toast

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** reset stubbed
- **Steps:**
  1. On `/vi/admin/users`, "Đặt lại mật khẩu" → "Gửi email".
- **Expected:** "Đặt lại mật khẩu cho Reset Target?", "…phải đặt mật khẩu
  mới khi đăng nhập lần tiếp theo", toast "Đã gửi email đặt lại mật khẩu.".
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-057 — A failed reset keeps the dialog open

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (5xx)
- **Preconditions:** reset stubbed to 500
- **Steps:**
  1. Send a reset.
- **Expected:** "Server error. Please try again later."; "Send reset" enabled
  again; the dialog stays open.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-058 — Sending twice sends one request

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (double submit)
- **Preconditions:** reset stubbed with a 400 ms delay
- **Steps:**
  1. Click "Send reset".
- **Expected:** the button is disabled while pending; one POST.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`

### TC-ADMUSERS-059 — Keyboard send; Cancel and Escape send nothing

- **Requirement:** REQ-ADMUSERS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility
- **Preconditions:** reset stubbed
- **Steps:**
  1. Open the menu with Enter, send with Enter; dismiss with Cancel and
     with Escape.
- **Expected:** one request for the keyboard send, zero for each dismiss.
- **Automated:** `tests/e2e/admin-users/reset-password.e2e.ts`
