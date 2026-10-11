# ADMENT — admin entitlements

Test cases for `REQ-ADMENT-01…04` (`docs/requirements.md`), plus the
launcher side of access control filed under the modules it shows up in
(TC-APPS-060…062, TC-FAV-029, TC-RECENT-029, TC-OIDC-050…052).

**How access works.** With no override a user gets an app when its
`requiredRoles` is empty, lists their role, or they are an admin — the "role
default". `entitlements` stores only exceptions: `allow` beyond the role,
`deny` despite it. `PATCH /admin/entitlements` takes the value the admin wants
and stores an override only when it differs from the role default (sending the
default back deletes it). Every flip of effective access on an active app
notifies the user (ENTITLEMENT_GRANTED / \_REVOKED).

**Test data.** The catalog (`GET /admin/apps`), the user search
(`GET /admin/users`, limit 6 on focus / 20 with a query) and the grants are all
real. Read-only cases use the seeded `user2@test.com` (John Doe: `deny` Notes,
`allow` Operations Console, from `entitlements.ts`). Cases that save do it to a
throwaway account ("Matrix Tester", role `user`) whose overrides are cleared
after every test — a save notifies its target, and the seeded user's inbox is
anchored on by the notifications suite. For a `user` the role default grants
Blog, IDMS Portal, Team Calendar and Notes and withholds Analytics Dashboard
and Operations Console.

**Sources.** `client/src/views/AdminEntitlements/**`,
`client/src/requests/adminEntitlements.ts`, copy in
`client/src/locales/{en,vi}/adminEntitlements.json`,
`server/src/modules/entitlement/**`, `server/src/validators/schemas/entitlement.ts`.
Converted from `docs/specs/admin-entitlements-picker-refinement/e2e.md`,
`docs/specs/admin-entitlements-matrix/e2e.md`, the scenario matrix of
`docs/specs/admin-entitlements-user-options/e2e.md` and
`docs/specs/access-control/e2e.md` (matrix rows 1–12 and §9). Schema
validation of the PATCH body (0 / 1 / 50 / 51 users, 0 / 1 / 200 / 201
changes, duplicates, wrong types) and the rest of the §9 decision table are
server unit tests (`validators/schemas/entitlement.spec.ts`,
`update-matrix.spec.ts`).

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

### TC-ADMENT-012 — A user with no override shows the role default

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (role-granted / role-withheld cells)
- **Preconditions:** throwaway account selected, no override
- **Steps:**
  1. Select the account.
- **Expected:** the six app names as columns; 4 "Granted" and 2 "Not granted"
  icons; no exception marker; no checkbox outside edit mode.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-013 — Cells and headers show readable values

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (raw booleans / enum)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Read the matrix.
- **Expected:** no `true` / `false` / `ADMIN` text; role chips read "Admin".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-014 — Edit reveals checkboxes; Save starts disabled with a reason

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (edit mode × no change)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Press Edit; hover Save.
- **Expected:** one checkbox per app (6), Cancel; Save disabled with tooltip "No changes to save.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-015 — A change enables Save; undoing it or Cancel discards it

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (edit mode × one change), State Transition (dirty → clean / cancelled)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Edit, untick Blog, tick it again.
  2. Untick Blog, Cancel.
- **Expected:** Save enabled after the change and disabled again once it is
  undone; after Cancel no checkbox, 4 "Granted" and no exception marker.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-016 — A cell the role withholds is editable and previews the exception

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (role-withheld cell)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Edit; tick "Grant Analytics Dashboard to Matrix Tester".
- **Expected:** the checkbox is enabled and unchecked, becomes checked, and one
  "Exception — granted beyond the role" marker appears.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-017 — Granting beyond the role is saved as an exception

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** Decision Table (role-withheld × granted), State Transition (read → edit → saved)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Edit, tick Operations Console, Save.
- **Expected:** back to read mode; 5 "Granted" and one "granted beyond the role" marker.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-018 — Grant-all ticks every app and toggles back

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (default → all → none)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Edit; "Grant all apps"; "Revoke all apps".
- **Expected:** all six checked with 2 "granted beyond" markers; then all six
  unchecked with 4 "revoked despite the role" markers.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-019 — The picker is locked while editing

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (edit mode blocks selection changes)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Press Edit.
- **Expected:** the search box and "Remove Matrix Tester" are disabled.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-020 — The user column stays pinned

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (left edge)
- **Preconditions:** throwaway account selected
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
  1. Select the throwaway account.
- **Expected:** no Edit button until the catalog arrives, then it appears.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-022 — The matrix and its exception markers render in English and Vietnamese

- **Requirement:** REQ-ADMENT-01, REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale en / vi)
- **Preconditions:** `user2@test.com` selected (seeded exceptions)
- **Steps:**
  1. Open the page in each locale.
- **Expected:** "User" / one marker each way ("Exception — revoked despite the
  role", "Exception — granted beyond the role"); "Chỉnh sửa" / "Người dùng" /
  "Ngoại lệ — bị thu hồi dù đủ vai trò", "Ngoại lệ — được cấp ngoài vai trò";
  no missing key.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-023 — Cells are named checkboxes that work from the keyboard

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y)
- **Preconditions:** edit mode
- **Steps:**
  1. With John Doe selected, read every cell's name.
  2. With the throwaway account, focus "Grant Blog to Matrix Tester" and press Space.
- **Expected:** a "Grant {app} to John Doe" checkbox per app; Space unticks Blog and enables Save.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-024 — Entering edit, saving and cancelling are announced

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (screen-reader live region)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Edit → change → Save; Edit → change → Cancel.
- **Expected:** `#announcer` reads "Editing app access.", "App access saved.", "Changes discarded.".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

## States the seed cannot produce and multi-user selection

### TC-ADMENT-025 — An empty app catalog shows "No apps found"

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (0 apps, catalog stubbed to `[]`)
- **Preconditions:** stubbed `/admin/apps`
- **Steps:**
  1. Select Test User.
- **Expected:** "No apps found" / "There are no apps to manage yet." and no checkbox.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

### ~~TC-ADMENT-026 — A user eligible for no app cannot use grant-all~~ Removed (2026-10-10)

Access control made every cell editable: grant-all ticks every app whatever
the role (TC-ADMENT-018), so there is no "0 eligible" state any more.

### ~~TC-ADMENT-027 — Saved grants live only in the page~~ Removed (2026-10-10)

Grants are persisted by the real API now; the opposite is TC-ADMENT-035.

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

### TC-ADMENT-032 — A failed save keeps edit mode and shows an error

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (5xx on save)
- **Preconditions:** `PATCH /admin/entitlements` stubbed with 500
- **Steps:**
  1. Edit, untick Blog, Save.
- **Expected:** toast "Something went wrong. Please try again."; Save still
  shown with the change in place; no override stored.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-033 — Role filter and search must both match

- **Requirement:** REQ-ADMENT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (role User × query matching an admin / a user)
- **Preconditions:** none
- **Steps:**
  1. Filters → Role → User; type `admin@test.com`, then `user2@test.com`.
- **Expected:** "No users found"; then John Doe's address listed.
- **Automated:** `tests/e2e/admin-entitlements/matrix-states.e2e.ts`

## Persisted exceptions, API and notifications

### TC-ADMENT-034 — Seeded exceptions show in both directions with a marker

- **Requirement:** REQ-ADMENT-01, REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (deny / allow override)
- **Preconditions:** `user2@test.com` (deny Notes, allow Operations Console)
- **Steps:**
  1. Select John Doe; hover the revoked marker.
- **Expected:** 4 "Granted", 2 "Not granted", one marker each way; the tooltip
  reads "Exception — revoked despite the role".
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-035 — Revoking a role-granted app survives a reload as an exception

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** Decision Table (role-granted × revoked), State Transition (saved → reload)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Edit, untick Blog, Save; reload and select the account again.
- **Expected:** 3 "Granted" and one "revoked despite the role" marker, before and after the reload.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-036 — Setting a cell back to the role default removes the override

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (default → deny → default)
- **Preconditions:** throwaway account selected
- **Steps:**
  1. Revoke Blog and save; tick it again and save.
- **Expected:** the marker is gone and the API holds no override for the
  account (no redundant `allow`).
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-037 — A double-clicked Save sends one request

- **Requirement:** REQ-ADMENT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (double submit)
- **Preconditions:** throwaway account selected; PATCH requests recorded
- **Steps:**
  1. Edit, untick Notes, double-click Save.
- **Expected:** exactly one PATCH; one "revoked" marker.
- **Automated:** `tests/e2e/admin-entitlements/matrix.e2e.ts`

### TC-ADMENT-038 — A non-admin gets 403 from the entitlement API

- **Requirement:** REQ-ADMENT-03, REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (role user × read / write)
- **Preconditions:** none
- **Steps:**
  1. `GET /admin/entitlements?userIds=…` and `PATCH /admin/entitlements` with the user's token.
- **Expected:** 403 both.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMENT-039 — The entitlement API requires a session

- **Requirement:** REQ-ADMENT-03, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token)
- **Preconditions:** none
- **Steps:**
  1. GET and PATCH without a token.
- **Expected:** 401 both.
- **Automated:** `tests/api/admin-entitlements/entitlements.api.ts`

### TC-ADMENT-040 — Revoking and restoring an app notifies the user both times

- **Requirement:** REQ-ADMENT-04, REQ-NOTIF-04
- **Layer:** e2e · **Priority:** P2 · **Role:** throwaway user (+ admin API)
- **Technique:** State Transition (granted → revoked → granted)
- **Preconditions:** throwaway account on the role default
- **Steps:**
  1. Revoke Notes; remove the override; open `/notifications`.
- **Expected:** a new ENTITLEMENT_REVOKED, then ENTITLEMENT_GRANTED, for Notes;
  the page shows "You no longer have access to Notes." and a link "You can now
  open Notes." to `/apps?search=Notes`.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`

### TC-ADMENT-041 — Saving the value the user already has sends nothing

- **Requirement:** REQ-ADMENT-04
- **Layer:** e2e · **Priority:** P3 · **Role:** throwaway user (+ admin API)
- **Technique:** Decision Table (granted × grant, withheld × revoke)
- **Preconditions:** throwaway account on the role default
- **Steps:**
  1. Grant Notes (already granted); revoke Operations Console (already withheld); wait 2 s.
- **Expected:** no new ENTITLEMENT\_\* row for either app.
- **Automated:** `tests/e2e/apps/launcher-access.e2e.ts`
