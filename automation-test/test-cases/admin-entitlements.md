# ADMENT — admin entitlements

Test cases for `REQ-ADMENT-01` (`docs/requirements.md`).

**What is real and what is mock.** The app catalog (`GET /admin/apps`) and the
user search (`GET /admin/users`, limit 6 on focus / 20 with a query) are real
endpoints. Grants are **mock**: `client/src/mocks/AdminEntitlements` keeps them
in page memory keyed by the mock's own ids, so every real user starts with
nothing granted and a reload forgets any save. The cases below test what the
UI really does today; persisting grants is out of scope (`docs/requirements.md`).

**Sources.** `client/src/views/AdminEntitlements/**`, copy in
`client/src/locales/{en,vi}/adminEntitlements.json`. Eligibility is an exact
role match: Test User (role `user`) is eligible for Blog, IDMS Portal, Team
Calendar and Notes, not for Analytics Dashboard or Operations Console.
Converted from `docs/specs/admin-entitlements-picker-refinement/e2e.md`,
`docs/specs/admin-entitlements-matrix/e2e.md` and the scenario matrix of
`docs/specs/admin-entitlements-user-options/e2e.md` (which had no tests yet).
Rows those files deferred — non-admin denial, empty catalog, 0 eligible apps,
more matches than the limit, a failing search — are now automated with role
fixtures or stubbed reads (TC-ADMENT-004, -025, -026, -029, -030).

## Picker (user search, role filter)

### TC-ADMENT-001 — The page shows its header, picker, Filters and the empty prompt

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (first visit)
- **Preconditions:** admin session
- **Steps:**
  1. Open `/admin/entitlements`.
- **Expected:** heading "Entitlements", the "Search users…" combobox, a "Filters" button, "No users selected".
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-002 — Focusing the search lists up to 6 users without typing

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (default limit 6)
- **Preconditions:** seeded users
- **Steps:**
  1. Click the search box.
- **Expected:** a listbox with 1–6 options.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-003 — Without a session the page sends you to login

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (no session → login)
- **Preconditions:** a context with no cookies
- **Steps:**
  1. Open `/admin/entitlements`.
- **Expected:** the URL ends on `/login`.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-004 — A non-admin can neither find users nor open the matrix

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role user × user search / app catalog)
- **Preconditions:** seeded user session and token
- **Steps:**
  1. Open the page as the user, focus and type in the search.
  2. `GET /admin/apps` with the user's token.
- **Expected:** `/admin/users` answers 403, the picker says "No users found" and lists no one (never `admin@test.com`), no Edit button or matrix column appears; the catalog call is 403.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-005 — A search with no match says so

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (no-match)
- **Preconditions:** none
- **Steps:**
  1. Type `zzznomatch99999`.
- **Expected:** "No users found".
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-006 — Typing filters the results

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (partial email match)
- **Preconditions:** seeded users
- **Steps:**
  1. Type `admin`.
- **Expected:** `admin@test.com` listed, `user@test.com` not.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-007 — Clearing the query brings the default list back

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (filtered → default)
- **Preconditions:** none
- **Steps:**
  1. Type `admin`, then clear the box.
- **Expected:** options are listed again.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-008 — The Admin role filter keeps only admins

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (role = Admin × no query)
- **Preconditions:** none
- **Steps:**
  1. Filters → Role → Admin; focus the search.
- **Expected:** `admin@test.com` listed, `user@test.com` not.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-009 — Picking a user adds a chip and reveals the matrix

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (none selected → one selected)
- **Preconditions:** none
- **Steps:**
  1. Search `admin`, pick `admin@test.com`.
- **Expected:** a "Remove …" chip control, the matrix's "Edit" button, and "No users selected" gone.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-010 — The picker renders in English and Vietnamese with no missing keys

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale en / vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/entitlements` and `/vi/admin/entitlements`.
- **Expected:** "Entitlements" + "Filters"; "Phân quyền truy cập" + "Bộ lọc"; no raw `[adminEntitlements.…]` key.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

### TC-ADMENT-011 — The search is an autocomplete combobox and Filters closes on Escape

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y)
- **Preconditions:** none
- **Steps:**
  1. Read the search's attributes; open Filters and press Escape.
- **Expected:** `aria-autocomplete="list"`; the popover opens and closes.
- **Automated:** `tests/e2e/admin-entitlements/picker.e2e.ts`

## Matrix

### TC-ADMENT-012 — A selected user gets a column per app and read-only status icons

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (eligible / ineligible cells)
- **Preconditions:** seed apps; Test User selected
- **Steps:**
  1. Select `user@test.com`.
- **Expected:** the six app names as columns; 4 "Not granted" and 2 "Role required" icons; no checkbox outside edit mode.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-013 — Cells and headers show readable values

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (raw booleans / enum)
- **Preconditions:** Test User selected
- **Steps:**
  1. Read the matrix.
- **Expected:** no `true` / `false` / `ADMIN` text; role chips read "Admin".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-014 — Edit reveals checkboxes; Save starts disabled with a reason

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (edit mode × no change)
- **Preconditions:** Test User selected
- **Steps:**
  1. Press Edit; hover Save.
- **Expected:** checkboxes, Save and Cancel; Save disabled with tooltip "No changes to save.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-015 — A change enables Save; Cancel discards it

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (edit mode × one change), State Transition (dirty → cancelled)
- **Preconditions:** Test User selected
- **Steps:**
  1. Edit, tick Blog, Cancel.
- **Expected:** Save enabled after the tick; after Cancel no checkbox and still 4 "Not granted".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-016 — A cell the user's role does not allow cannot be granted

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (ineligible cell)
- **Preconditions:** Test User selected
- **Steps:**
  1. Edit; hover "Grant Analytics Dashboard to Test User".
- **Expected:** disabled, unchecked, tooltip "This user lacks the required role.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-017 — Save leaves edit mode and shows the new grant

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (read → edit → saved)
- **Preconditions:** Test User selected
- **Steps:**
  1. Edit, tick Blog, Save.
- **Expected:** back to read mode; 1 "Granted", 3 "Not granted", 2 "Role required".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-018 — Grant-all ticks every eligible cell and toggles back

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (eligible count ≥ 1), State Transition (none → all → none)
- **Preconditions:** Test User selected
- **Steps:**
  1. Edit; "Grant all eligible apps"; "Revoke all apps".
- **Expected:** the 4 eligible cells checked, the 2 ineligible still disabled and unchecked; then all unchecked.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-019 — The picker is locked while editing

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (edit mode blocks selection changes)
- **Preconditions:** Test User selected
- **Steps:**
  1. Press Edit.
- **Expected:** the search box and "Remove Test User" are disabled.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-020 — The user column stays pinned

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (left edge)
- **Preconditions:** Test User selected
- **Steps:**
  1. Read the computed style of the User header and row cell.
- **Expected:** `position: sticky`, `left: 0px` on both.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-021 — The matrix waits for the app catalog

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (loading → loaded; catalog delayed 800 ms)
- **Preconditions:** delayed `/admin/apps`
- **Steps:**
  1. Select Test User.
- **Expected:** no Edit button until the catalog arrives, then it appears.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-022 — The matrix renders in English and Vietnamese

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale en / vi)
- **Preconditions:** Test User selected
- **Steps:**
  1. Open the page in each locale.
- **Expected:** "Edit" / "User"; "Chỉnh sửa" / "Người dùng"; no missing key.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-023 — Cells are named checkboxes that work from the keyboard

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y)
- **Preconditions:** Test User selected, edit mode
- **Steps:**
  1. Focus "Grant Blog to Test User", press Space.
- **Expected:** the checkbox exists by that name, becomes checked and Save is enabled.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-024 — Entering edit, saving and cancelling are announced

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (screen-reader live region)
- **Preconditions:** Test User selected
- **Steps:**
  1. Edit → change → Save; Edit → change → Cancel.
- **Expected:** `#announcer` reads "Editing app access.", "App access saved.", "Changes discarded.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

## States the seed cannot produce, multi-user and mock grants

### TC-ADMENT-025 — An empty app catalog shows "No apps found"

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (0 apps, catalog stubbed to `[]`)
- **Preconditions:** stubbed `/admin/apps`
- **Steps:**
  1. Select Test User.
- **Expected:** "No apps found" / "There are no apps to manage yet." and no checkbox.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-026 — A user eligible for no app cannot use grant-all

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (eligible count 0 — catalog stubbed to the admin-only apps)
- **Preconditions:** stubbed `/admin/apps`
- **Steps:**
  1. Select Test User, press Edit.
- **Expected:** "Grant all eligible apps" disabled and every checkbox disabled.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-027 — Saved grants live only in the page

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (saved → reload → reset) — documents the mock
- **Preconditions:** none
- **Steps:**
  1. Grant Blog and save; reload; select Test User again.
- **Expected:** after the reload no "Granted" icon and 4 "Not granted" — nothing reached the server.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-028 — Several users get one row each, and removing a chip removes the row

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (1 → 2 → 1 → 0 selected users)
- **Preconditions:** seeded `user@test.com`, `user2@test.com`
- **Steps:**
  1. Select both; remove John Doe; remove Test User.
- **Expected:** two row headers, then one (Test User) with `#announcer` "Removed John Doe.", then "No users selected".
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-029 — More matches than the limit shows a refine hint

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (total > shown; `meta.total` stubbed to 25)
- **Preconditions:** stubbed `/admin/users` total
- **Steps:**
  1. Type `test.com`.
- **Expected:** "Showing N of 25 — refine your search", N = options listed.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-030 — A failing user search leaves the picker usable

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (`/admin/users` stubbed 500, then restored)
- **Preconditions:** stub
- **Steps:**
  1. Type `admin`; lift the stub; type `user@test.com`.
- **Expected:** no options and the page intact while failing; afterwards the user is found.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-031 — Regex and markup characters are searched literally

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (`.*`, `(`, `<b>x</b>`, `%`)
- **Preconditions:** none
- **Steps:**
  1. Type each value.
- **Expected:** "No users found" each time; the markup is never rendered as HTML.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### TC-ADMENT-032 — A failed grant save keeps edit mode and shows an error

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing
- **Preconditions:** a grant store that can fail
- **Steps:**
  1. Edit, change a cell, Save while the store fails.
- **Expected:** toast "Something went wrong. Please try again." and the matrix stays in edit mode with the change.
- **Automated:** manual — the grant store is the in-page mock `updateUserGrants`, which always resolves; there is no request to stub and no way to make it fail without changing app code. Automate when grants get a real endpoint.

### TC-ADMENT-033 — Role filter and search must both match

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (role User × query matching an admin / a user)
- **Preconditions:** none
- **Steps:**
  1. Filters → Role → User; type `admin@test.com`, then `user2@test.com`.
- **Expected:** "No users found"; then John Doe's address listed.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`
