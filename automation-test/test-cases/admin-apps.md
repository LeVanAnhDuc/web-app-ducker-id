# ADMAPPS — admin app registry

Test cases for `REQ-ADMAPPS-01` … `REQ-ADMAPPS-05` (`docs/requirements.md`).

**Sources.** Client: `client/src/views/AdminApps/**`,
`client/src/dataSources/AdminApps`, `client/src/forms/AdminApp` (zod rules),
copy in `client/src/locales/{en,vi}/adminApps.json` and `list.json`. Server:
`server/src/modules/web-app/**`, Joi rules in
`server/src/validators/schemas/web-app.ts`, redirect-URI rules in
`isValidRedirectUri` (`server/src/modules/oauth/helpers`).
Converted from `docs/specs/edit-apps/e2e.md` (12 rubric rows),
`docs/specs/list-table-column-controls/e2e.md`, the admin-app parts of
`docs/specs/frontend-cleanup/e2e.md` and `docs/specs/unified-list-experience/e2e.md`,
and the create flow of `docs/specs/web-app-create/design.md`.

**Seed baseline** (`server/src/database/seeders/data/web-apps.ts`): Blog
(content), Analytics Dashboard + Operations Console (internal-tools, admin
only), IDMS Portal (identity), Team Calendar (productivity, the only
**inactive** app) and Notes (productivity). There is no delete endpoint: specs
that edit borrow a seeded app and restore it; specs that create name the app
`e2e-…` and remove it from MongoDB afterwards (`helpers/adminApps.ts`).

**Old-matrix rows not given their own case.** list-table-column-controls #2 / #3 /
#10 (AuthN / AuthZ / loading) are the same guards as TC-ADMAPPS-038 / -039 and
TC-AUTHZ-001; #11 (mutation safety) is N/A — sorting never writes. edit-apps
row 7 (filter / search in the edit sheet) is N/A — the sheet has none; list
filtering is TC-ADMAPPS-011 … -018. unified-list-experience covered
`/admin/users` (ADMUSERS); its admin-apps equivalents are TC-ADMAPPS-010 … -018.

## List, search, filters, column controls (REQ-ADMAPPS-01)

### TC-ADMAPPS-001 — Sorting by App orders ascending then descending

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (unsorted → asc → desc)
- **Preconditions:** ≥ 2 apps (seed has 6)
- **Steps:**
  1. Open `/admin/apps`, click "Sort by App" twice.
- **Expected:** the App header's `aria-sort` goes `ascending` then `descending` and the display names follow (case-insensitive).
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-002 — The sort toggle cycles and only one column is sorted at a time

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (asc → desc → asc; switching column is the invalid transition for the old column)
- **Preconditions:** none
- **Steps:**
  1. Click "Sort by App" three times, then "Sort by Last Updated".
- **Expected:** App walks asc → desc → asc; after switching, App is `none`, Last Updated `ascending`, and exactly one header has a non-`none` `aria-sort`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-003 — The sort lives in the URL and survives a reload

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (sorted → reload → sorted)
- **Preconditions:** none
- **Steps:**
  1. Sort by App, reload.
- **Expected:** URL has `sortBy=app&sortOrder=asc`; after reload the header is still `ascending`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-004 — A deep-linked sort applies on first load

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (pre-set URL state)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/apps?sortBy=app&sortOrder=desc`.
- **Expected:** the table loads sorted descending with `aria-sort="descending"`, no click needed.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-005 — Sorting works inside an active status filter

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (filter × sort)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/apps?status=active&sortBy=app&sortOrder=asc`.
- **Expected:** the filtered rows are sorted ascending; the filter is not reset.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-006 — Invalid sort parameters are ignored without a crash

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (`sortBy` of a column with no accessor / garbage `sortBy` / garbage `sortOrder`)
- **Preconditions:** none
- **Steps:**
  1. Open `?sortBy=status`, `?sortBy=___bogus&sortOrder=asc`, `?sortBy=app&sortOrder=sideways`.
- **Expected:** the table renders every time; the Status header has no `aria-sort`; an invalid order leaves App `none`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-007 — The sort header is keyboard operable

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y)
- **Preconditions:** none
- **Steps:**
  1. Focus "Sort by App", press Enter.
- **Expected:** the button takes focus and the column becomes `ascending`.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-008 — Breakpoint columns hide below their threshold

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (viewport 639 / 640 for Category, 767 / 768 for Redirect URIs)
- **Preconditions:** none
- **Steps:**
  1. Resize to 639, 640, 767, 768 px wide.
- **Expected:** Category is hidden at 639 and shown at 640; Redirect URIs hidden at 767 and shown at 768.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-009 — Sorting works in Vietnamese with localized labels

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/admin/apps`, click the first "Sắp xếp theo …" button.
- **Expected:** URL gains `sortBy=`; exactly one header is sorted.
- **Automated:** `tests/e2e/admin-apps/column-controls.e2e.ts`

### TC-ADMAPPS-010 — The registry lists every app with readable values

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (active / inactive, one role / two roles), Error Guessing (raw enum, ObjectId, ISO date)
- **Preconditions:** seed apps
- **Steps:**
  1. Open `/admin/apps`.
- **Expected:** all 6 seed apps are listed; Team Calendar shows "Paused", its slug and "Productivity"; IDMS Portal shows "Active" plus "User" and "Admin" chips; no cell shows `ACTIVE`/`inactive`, a 24-hex id or an ISO timestamp.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-011 — Search narrows by name, slug or description and lives in the URL

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (display-name match / description-only match / slug in another case)
- **Preconditions:** seed apps
- **Steps:**
  1. Search "calendar", then "restricted", then "IDMS-PORTAL"; reload.
- **Expected:** Team Calendar; Operations Console; IDMS Portal; the URL carries `search=` and the reload keeps both the box value and the result.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-012 — The status filter shows only paused or only active apps

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (Paused / Active / All)
- **Preconditions:** seed apps
- **Steps:**
  1. Filters → Status → Paused, then Active, then All.
- **Expected:** Paused → Team Calendar only (`status=inactive`); Active → the other five; All → six and no `status=` in the URL.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-013 — The category filter shows the apps of that category

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (category with 2 apps)
- **Preconditions:** seed apps
- **Steps:**
  1. Filters → Category → Productivity; reload.
- **Expected:** Team Calendar + Notes, `categoryId=<productivity id>` in the URL, kept after reload.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-014 — Status, category and search combine with AND

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (status × category × search)
- **Preconditions:** seed apps
- **Steps:**
  1. Open each combination by URL: active+productivity, inactive+productivity, inactive+internal-tools, active+internal-tools+"ops", internal-tools+"calendar".
  2. With two filters active, read the Filters badge and press "Clear all".
- **Expected:** Notes; Team Calendar; empty; Operations Console; empty (empty rows show "Clear filters"). Badge reads 2; Clear all removes both from the URL and the full list returns.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-015 — A search with no match offers Clear filters

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (no-match search), State Transition (filtered → cleared)
- **Preconditions:** none
- **Steps:**
  1. Search "zz-no-such-app-zz", press "Clear filters".
- **Expected:** no rows and a "Clear filters" button; clicking it drops `search=` and the six apps return.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-016 — The no-match empty state says nothing matched

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (copy chosen for the wrong state)
- **Preconditions:** none
- **Steps:**
  1. Search "zz-no-such-app-zz".
- **Expected:** "No results found" (`list.noResultsTitle`), not "No apps registered yet.". **Actual:**
  `AdminAppsTable` always passes `emptyTitle` = "No apps registered yet." to
  `PageContent`, so a no-match search claims the registry is empty. Marked
  `test.fail()` until fixed.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-017 — Tampered filter values in the URL do not break the page

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (unknown status), Error Guessing (malformed categoryId)
- **Preconditions:** none
- **Steps:**
  1. Open `?status=bogus`, then `?categoryId=not-an-id`.
- **Expected:** both are ignored like any value that matches no filter option: the full list shows, heading and toolbar stay usable.
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-018 — Filters and status labels render in Vietnamese

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/admin/apps`, "Bộ lọc" → Trạng thái → "Tạm dừng".
- **Expected:** labels "Trạng thái" / "Danh mục"; only Team Calendar, its badge "Tạm dừng".
- **Automated:** `tests/e2e/admin-apps/list.e2e.ts`

### TC-ADMAPPS-019 — The list API returns the admin DTO, filters on the server and never leaks a secret

- **Requirement:** REQ-ADMAPPS-01, REQ-ADMAPPS-03
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** Decision Table (status × categoryId × search), EP (search on name / displayName / description, any case)
- **Preconditions:** seed apps
- **Steps:**
  1. `GET /admin/apps` with no query, `?status=`, `?categoryId=`, `?search=` and combinations.
- **Expected:** every item has exactly the 15 DTO keys; no `clientSecret` or bcrypt hash anywhere; active + inactive = all; category and search results only contain matches; `status=active&search=team-calendar` is empty.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMAPPS-020 — Bad list filters are refused and regex characters are literal

- **Requirement:** REQ-ADMAPPS-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP (unknown status, malformed id), BVA (search 200 / 201 chars), Error Guessing (regex metacharacters)
- **Preconditions:** none
- **Steps:**
  1. `?status=paused`, `?categoryId=garbage`, `?search=` with `(`, `.*`, `[a-z]+`, `\`, 200 and 201 characters.
- **Expected:** 400, 400; regex inputs 200 and `.*` matches nothing; 200 chars → 200, 201 → 400.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Create (REQ-ADMAPPS-02)

### TC-ADMAPPS-021 — An admin registers an app with ordered categories

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (valid create, 2 categories)
- **Preconditions:** none; the app is deleted afterwards
- **Steps:**
  1. "Register App"; fill Name, Display Name, Home URL; pick Identity then Content; add a redirect URI; switch Active off; "Register".
- **Expected:** the chip list reads Identity (Primary) then Content; after Done the row is listed as Paused; the API stores `categoryIds` in that order.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-022 — An empty register form reports every required field

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (all required fields empty; then roles emptied too)
- **Preconditions:** none
- **Steps:**
  1. Open "Register App", press "Register"; untick the default "User" role, press again.
- **Expected:** "Please enter a name.", "Please enter a display name.", "Please enter a home URL.", "Select at least one category.", "Add at least one redirect URI." together, then "Select at least one role."; no POST is sent.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-023 — A taken name is reported on the Name field

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (409 `WEB_APP_NAME_EXISTS`)
- **Preconditions:** seed app `blog`
- **Steps:**
  1. Register an otherwise valid app named `blog`.
- **Expected:** "An app with this name already exists." in the sheet, which stays open.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-024 — A redirect URI only the server refuses keeps the sheet open

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (client rule `http(s)://` is looser than the server's https-or-loopback rule)
- **Preconditions:** none
- **Steps:**
  1. Fill a valid form but with redirect URI `http://e2e.example.com/callback`; "Register".
- **Expected:** the POST answers 400; the sheet stays open with the typed values and no credentials dialog appears.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-025 — The register sheet and its errors render in Vietnamese

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi)
- **Preconditions:** none
- **Steps:**
  1. `/vi/admin/apps` → "Đăng ký ứng dụng" → "Đăng ký" on an empty form.
- **Expected:** title "Đăng ký ứng dụng mới"; "Vui lòng nhập tên.", "Hãy chọn ít nhất một danh mục.", "Thêm ít nhất một redirect URI."; no raw `[adminApps.…]` key.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-026 — Create returns 201 with the given order and the OAuth defaults

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** EP (valid create with post-logout URIs)
- **Preconditions:** none; deleted afterwards
- **Steps:**
  1. `POST /admin/apps` with two categories in a chosen order.
  2. Read the stored document.
- **Expected:** 201; `categoryIds`, status, roles, post-logout URIs as sent; auth method defaults to `client_secret_basic`; stored `grantTypes` include `authorization_code`, `responseTypes` = `["code"]`, `scopes` = `openid profile email`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMAPPS-027 — An app takes 1 to 5 distinct, existing categories

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** BVA (0 / 1 / 5 / 6), EP (duplicate id, malformed id, unknown id, missing)
- **Preconditions:** ≥ 5 categories (a temporary one is added if needed)
- **Steps:**
  1. Create with each `categoryIds` value.
- **Expected:** 1 and 5 → 201; 0, 6, duplicate, malformed, missing → 400; unknown id → 4xx `WEB_APP_CATEGORY_NOT_FOUND`.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMAPPS-028 — Redirect URIs must be absolute https or loopback http, 1–20 of them

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** EP (https / localhost / 127.0.0.1 valid; public http, fragment, wildcard, relative, garbage, ftp invalid), BVA (0 / 20 / 21)
- **Preconditions:** none
- **Steps:**
  1. Create with each URI; with 0, 20 and 21 URIs; with a plain-http post-logout URI.
- **Expected:** valid partitions 201, invalid 400; 0 → 400, 20 → 201, 21 → 400; the post-logout URI follows the same rule (400).
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMAPPS-029 — Name, display name, URLs, roles and auth method are validated

- **Requirement:** REQ-ADMAPPS-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (name 1 / 2 / 64 / 65, display name 1 / 2 / 80 / 81, description 500 / 501), EP (name pattern, upper case, URL scheme, roles, status, auth method)
- **Preconditions:** none
- **Steps:**
  1. Create with each value.
- **Expected:** name 1 → 400, 2 and 64 → 201, 65 → 400; spaces, leading hyphen, underscore → 400; upper case is folded to lower; display name 1 / 81 → 400, 2 / 80 → 201; `ftp://` or empty home URL, `javascript:` icon, 501-char description, empty or unknown roles, status `paused`, auth method `client_secret_post` → 400.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

### TC-ADMAPPS-030 — A taken name is 409 and tampered fields are ignored

- **Requirement:** REQ-ADMAPPS-02, REQ-ADMAPPS-03
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** Error Guessing (mass assignment of `clientId`, `clientSecret`, `clientSecretHash`, `scopes`, `grantTypes`)
- **Preconditions:** seed app `blog`
- **Steps:**
  1. Create `blog` and `BLOG`.
  2. Create a new app whose body also carries the tampered fields.
- **Expected:** 409 `WEB_APP_NAME_EXISTS` for both; the tampered create is 201 with a generated client id and secret, default scopes and no `client_credentials` grant.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Credentials (REQ-ADMAPPS-03)

### TC-ADMAPPS-031 — The client secret is shown once, right after registering

- **Requirement:** REQ-ADMAPPS-03
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (registered → dialog → closed → never again)
- **Preconditions:** none; the app is deleted afterwards
- **Steps:**
  1. Register an app (TC-ADMAPPS-021); read the dialog; press Done; reopen the app in Edit; read it from the list API.
- **Expected:** dialog "App registered — copy your credentials" with Client ID (`client_` + 12 hex), Client Secret (64 hex) and "Store the client secret now — it will not be shown again."; afterwards neither the edit sheet nor the API shows the secret.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-032 — A public client gets no secret

- **Requirement:** REQ-ADMAPPS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (token auth method `none`)
- **Preconditions:** none; deleted afterwards
- **Steps:**
  1. Register with "Public — no client secret (PKCE only)"; also `POST` with `tokenEndpointAuthMethod: none`.
- **Expected:** the dialog shows only Client ID, one Copy button and the PKCE note; the API returns `clientSecret: null` and stores no hash.
- **Automated:** `tests/e2e/admin-apps/create-app.e2e.ts`

### TC-ADMAPPS-033 — Copy puts the value on the clipboard and shows Copied

- **Requirement:** REQ-ADMAPPS-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (copy click)
- **Preconditions:** POST stubbed with a fake create result; clipboard stubbed
- **Steps:**
  1. In the credentials dialog press Copy next to the Client ID.
- **Expected:** `aria-label` and text become "Copied"; the clipboard holds the client id.
- **Automated:** `tests/e2e/admin-apps/copy-secret.e2e.ts`

### TC-ADMAPPS-034 — The Copy button reverts after about two seconds

- **Requirement:** REQ-ADMAPPS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (~2000 ms timer)
- **Preconditions:** as TC-ADMAPPS-033
- **Steps:**
  1. Press Copy and wait.
- **Expected:** "Copied" within 2 s, back to "Copy" within 3.5 s.
- **Automated:** `tests/e2e/admin-apps/copy-secret.e2e.ts`

### TC-ADMAPPS-035 — Rapid copies keep one timer

- **Requirement:** REQ-ADMAPPS-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (timer reset)
- **Preconditions:** as TC-ADMAPPS-033
- **Steps:**
  1. Press Copy three times quickly.
- **Expected:** stays "Copied", then reverts once.
- **Automated:** `tests/e2e/admin-apps/copy-secret.e2e.ts`

### TC-ADMAPPS-036 — Credentials are unique, well-formed and the secret is stored hashed

- **Requirement:** REQ-ADMAPPS-03
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** Error Guessing (secret at rest)
- **Preconditions:** none; deleted afterwards
- **Steps:**
  1. Create two apps; read the first one's document.
- **Expected:** `client_` + 12 hex and a 64-hex secret, different for each app; the document holds a bcrypt `clientSecretHash` and never the secret itself.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Edit (REQ-ADMAPPS-04)

### TC-ADMAPPS-037 — An admin edits an app's display name

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (valid edit) — edit-apps row 1
- **Preconditions:** seed app Blog; restored afterwards
- **Steps:**
  1. Blog → App actions → Edit; change Display Name; "Save Changes".
- **Expected:** toast "App updated." and the new name in the table.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-038 — Without a session the registry is unreachable

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing — edit-apps row 2
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/apps`; `PATCH /admin/apps/:id` with no token.
- **Expected:** redirect to `/login`, no "App Registry" heading; the PATCH is 401.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-039 — A non-admin cannot update apps or see them

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Error Guessing (privilege escalation) — edit-apps row 3
- **Preconditions:** seeded user session and token
- **Steps:**
  1. `PATCH /admin/apps/:id` with the user's token; open `/admin/apps`.
- **Expected:** 403; the page shows "No apps registered yet.", no app row and no "App actions" button.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-040 — Each field reports its own validation error

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (empty display name / `Blog!` / `ftp://x`) — edit-apps row 4
- **Preconditions:** seed app Blog; nothing is saved
- **Steps:**
  1. Edit Blog and save each invalid value in turn.
- **Expected:** "Please enter a display name.", "Use lowercase letters, numbers, and hyphens only.", "Must start with http:// or https://".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-041 — Several errors show at once

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (two invalid fields together, anti-OFAT)
- **Preconditions:** seed app Blog; nothing is saved
- **Steps:**
  1. Empty Display Name and set Name `Blog!`; save.
- **Expected:** both messages render together.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-042 — Renaming onto a taken name is reported on the Name field

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (409)
- **Preconditions:** seed apps Blog and Notes
- **Steps:**
  1. Edit Blog, set Name `notes`, save.
- **Expected:** "An app with this name already exists." inside the Edit App sheet; Blog keeps its name.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-043 — Changing only the display name keeps the categories

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (regression guard for the select-reset bug)
- **Preconditions:** seed app Blog (Content); restored afterwards
- **Steps:**
  1. Edit Blog, change Display Name only, save, reopen.
- **Expected:** the Categories list still contains Content.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-044 — Null description and icon prefill as empty inputs

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (`null` leaking into an input) — edit-apps row 5, formerly deferred
- **Preconditions:** an `e2e-…` app created over the API with empty description and icon (stored as `null`); deleted afterwards
- **Steps:**
  1. Edit that app; save without changes.
- **Expected:** Description and Icon URL are empty (not `"null"`); save succeeds ("App updated.").
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-045 — Name length boundaries

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (1 / 2 / 64 / 65)
- **Preconditions:** seed app Blog; nothing is saved
- **Steps:**
  1. Set Name to 1, 65, 2 and 64 characters.
- **Expected:** 1 → "Name must be at least 2 characters.", 65 → "Name must not exceed 64 characters.", 2 and 64 clear the errors.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-046 — Display name length boundaries

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (2 / 80 / 81)
- **Preconditions:** seed app Blog; nothing is saved
- **Steps:**
  1. Set Display Name to 81, 2 and 80 characters.
- **Expected:** 81 → "Display name must not exceed 80 characters."; 2 and 80 clear it.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-047 — At most 20 redirect URIs

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (21 = max + 1)
- **Preconditions:** seed app Blog; nothing is saved
- **Steps:**
  1. Add URIs until there are 21; save.
- **Expected:** "You can add at most 20 redirect URIs."; no PATCH.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-048 — The edit sheet prefills every field

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (one check per field)
- **Preconditions:** seed app Blog
- **Steps:**
  1. Edit Blog.
- **Expected:** Name `blog`, Display Name `Blog`, Categories "Content" (label, not id), a Home URL, the status switch on, role "User" ticked, ≥ 1 redirect URI pill.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-049 — The edit flow and status badge render in Vietnamese

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (locale vi)
- **Preconditions:** seed app Blog; restored afterwards
- **Steps:**
  1. `/vi/admin/apps` → "Thao tác với ứng dụng" → "Chỉnh sửa"; save an empty Tên hiển thị, then a valid one.
- **Expected:** "Chỉnh sửa ứng dụng"; "Vui lòng nhập tên hiển thị."; toast "Đã cập nhật ứng dụng."; Blog's badge "Đang hoạt động".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-050 — A server error on save shows one generic toast

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (PATCH stubbed 500)
- **Preconditions:** PATCH stubbed; nothing is saved
- **Steps:**
  1. Edit Blog, change Display Name, save.
- **Expected:** toast "Server error. Please try again later." (global MutationCache handler), not a field error.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-051 — Controls are disabled while saving

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (idle → pending)
- **Preconditions:** PATCH stubbed with a 1.5 s delay
- **Steps:**
  1. Save an edit.
- **Expected:** "Save Changes" and the Display Name input are disabled while the request is pending.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-052 — A double-click saves once

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (submit guard)
- **Preconditions:** seed app Blog; restored afterwards
- **Steps:**
  1. Click "Save Changes" twice in the same tick.
- **Expected:** exactly one PATCH; "App updated.".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-053 — Cancel discards unsaved edits

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing
- **Preconditions:** seed app Blog
- **Steps:**
  1. Change Display Name, Cancel, reopen.
- **Expected:** the original "Blog" is back and no PATCH was sent.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-054 — The server trims a trailing space in the name

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (whitespace)
- **Preconditions:** seed app Blog; name restored
- **Steps:**
  1. `PATCH` Blog with name `"blog "`.
- **Expected:** 200 and the stored name is `blog`.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-055 — Focus moves to the first invalid field and success is announced

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (a11y)
- **Preconditions:** seed app Blog; restored afterwards
- **Steps:**
  1. Save an empty Display Name; then a valid one.
- **Expected:** Display Name is focused; the polite `#announcer` reads "App Blog (a11y e2e) updated.".
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-056 — PATCH changes only what it is given; bad targets fail

- **Requirement:** REQ-ADMAPPS-04
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** EP (partial body / empty body / malformed id / unknown id / taken name / tampered client id)
- **Preconditions:** an `e2e-…` app; deleted afterwards
- **Steps:**
  1. `PATCH` display name + reordered categories; then `{}`, `/garbage`, an unknown id, name `notes`, a body with `clientId`.
- **Expected:** 200 with only those fields changed (home URL and client id kept, no secret returned); 400; 400; 404 `WEB_APP_NOT_FOUND`; 409; the client id is unchanged.
- **Automated:** `tests/api/admin-apps/apps.api.ts`

## Status (REQ-ADMAPPS-05)

### TC-ADMAPPS-057 — Hide then Unhide from the row menu

- **Requirement:** REQ-ADMAPPS-05
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (active → inactive → active)
- **Preconditions:** seed app Blog (edited name from TC-ADMAPPS-037); restored afterwards
- **Steps:**
  1. App actions → Hide → "Hide App"; then App actions → Unhide.
- **Expected:** "App hidden." and the row shows Paused; then "App reactivated." and Active.
- **Automated:** `tests/e2e/admin-apps/edit-app.e2e.ts`

### TC-ADMAPPS-058 — A failing status change shows exactly one error toast

- **Requirement:** REQ-ADMAPPS-05
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (duplicate toast paths)
- **Preconditions:** PATCH stubbed with 500; nothing changes
- **Steps:**
  1. Unhide a paused app (or Hide an active one).
- **Expected:** exactly one "Server error. Please try again later." toast.
- **Automated:** `tests/e2e/admin-apps/status-toast.e2e.ts`

### TC-ADMAPPS-059 — The status switch in the edit sheet pauses and reactivates

- **Requirement:** REQ-ADMAPPS-05
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (active → inactive → active via the switch)
- **Preconditions:** an active `e2e-…` app (admin-only role); deleted afterwards
- **Steps:**
  1. Edit, switch off, save; edit again, switch on, save.
- **Expected:** the row turns Paused, the reopened sheet shows the switch off, then the row is Active again.
- **Automated:** `tests/e2e/admin-apps/status.e2e.ts`

### TC-ADMAPPS-060 — The row menu only offers the valid transition

- **Requirement:** REQ-ADMAPPS-05
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (invalid transitions not offered; Cancel keeps state)
- **Preconditions:** an active `e2e-…` app; deleted afterwards
- **Steps:**
  1. Open the menu of the active app; Hide → Cancel; Hide → "Hide App"; open the menu again.
- **Expected:** active offers Hide only; the confirmation asks "Hide <name>?" and Cancel leaves it Active; once Paused the menu offers Unhide only.
- **Automated:** `tests/e2e/admin-apps/status.e2e.ts`

### TC-ADMAPPS-061 — An inactive app leaves users' launcher and returns when reactivated

- **Requirement:** REQ-ADMAPPS-05
- **Layer:** api · **Priority:** P1 · **Role:** admin, user
- **Technique:** State Transition (inactive → active → inactive → inactive again)
- **Preconditions:** an `e2e-…` app with role `user`, created inactive; deleted afterwards
- **Steps:**
  1. As the user, `GET /apps?search=<name>` after each admin `PATCH status`.
- **Expected:** 0 results while inactive, 1 once active, 0 again after deactivating; repeating `inactive` is 200 and changes nothing.
- **Automated:** `tests/api/admin-apps/apps.api.ts`
