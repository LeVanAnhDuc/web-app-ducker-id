# ADMLOGHIST — test cases

The admin view of every sign-in attempt at `/admin/login-history`, its
filters, and the detail page of one attempt including where it came from
(REQ-ADMLOGHIST-01…02).

Source of truth: `client/src/views/AdminLoginHistory/**`,
`client/src/views/AdminLoginHistoryDetail/**`,
`client/src/dataSources/LoginHistory`, `client/src/components/CustomTable`
(row links), `client/src/hooks/{useListQuery,useLoginAppOptions}.ts`,
`client/src/locales/{en,vi}/{loginHistory,list}.json`,
`server/src/modules/login-history/**`,
`server/src/validators/schemas/login-history.ts`.
Converted from `docs/specs/admin-login-history-detail/e2e.md` and the admin
rows of `docs/specs/login-history-app-source/e2e.md`; the list filters were a
gap and are new.

**Test data.** The admin session's own sign-in (setup project) guarantees at
least one row. Cases that need known rows sign a throwaway account in over
the API (one success, one wrong password) and filter by it; cases that need
a particular record shape (anomaly, sentinel country, silent SSO, empty
result, failures) stub the list or detail response with `page.route`.
Nothing is written to the database by the browser cases.

**Server facts the cases rely on.** Page size 20 (client constant); `limit`
1…100; `page` ≥ 1; `status` ∈ {success, failed}; `method` ∈ {password, otp,
magic-link, forgot-password, sso}; `deviceType` ∈ {DESKTOP, MOBILE, TABLET,
UNKNOWN}; `source` ∈ {idp, oauth}; `userId` / `webAppId` 24-hex;
`fromDate` ≤ `toDate` (ISO; a bare date means that whole day); text filters
≤ 200 characters. Rows are newest first. **A row's `userId` is the account's
auth id (`auths._id`, the model's ref), not the `users._id` that
`/admin/users` returns.** Attempts are recorded asynchronously, a moment after
the login answers. A malformed detail id answers 400 `VALIDATION_ERROR`, an
unknown one 404. The client maps both to "Login history record not found."
and any other failure to "Could not load this login record. Please try
again.". Each list row is a link named "View details for {username}"
(vi "Xem chi tiết cho {username}").

## List — REQ-ADMLOGHIST-01

### TC-ADMLOGHIST-001 — The list shows attempts from many accounts

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP
- **Preconditions:** login history holds attempts by more than one account
- **Steps:**
  1. Open `/admin/login-history`.
- **Expected:** heading "All Login History"; columns Username Attempted, App,
  Method, Status, IP & Location, Anomaly, Date; row links name at least two
  different usernames.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-002 — Status filter

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (success, failed)
- **Preconditions:** both kinds of attempt exist
- **Steps:**
  1. Open `?status=failed`, then `?status=success`.
- **Expected:** the request carries the same `status`; every row shows that
  status label and none shows the other.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-003 — Method filter

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (password)
- **Preconditions:** password sign-ins exist
- **Steps:**
  1. Open `?method=password`.
- **Expected:** the request carries `method=password`; no row shows OTP,
  Magic Link, SSO or Forgot Password.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-004 — Choosing a filter in the panel writes the URL

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (page 2 → filter → page 1)
- **Preconditions:** none
- **Steps:**
  1. Open `?page=2`, Filters → Status → "Failed".
- **Expected:** URL carries `status=failed` and `page=1`; the next list
  request carries the same.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-005 — The App column shows the satellite app and "Auto"

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (silent SSO row)
- **Preconditions:** list stubbed with one silent SSO row for "Match CV"
- **Steps:**
  1. Open `/admin/login-history`.
- **Expected:** the row shows "Match CV" with the "Auto" badge; the default
  request sends no `interactive` param.
- **Automated:** `tests/e2e/admin-login-history/app-source.e2e.ts`

### TC-ADMLOGHIST-006 — App filter "Ducker ID" maps to source=idp

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (identity provider)
- **Preconditions:** none
- **Steps:**
  1. Open `?app=idp`.
- **Expected:** the request carries `source=idp` and no `webAppId`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-007 — Filters combine; an invalid one is dropped alone

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (status × method × app × date; valid/invalid)
- **Preconditions:** list stubbed empty
- **Steps:**
  1. Open `?status=failed&method=password&app=idp&fromDate=2026-01-01&toDate=2026-01-31`.
  2. Open `?status=bogus&method=otp`.
  3. Open `?status=success&method=telepathy&app=idp`.
- **Expected:** (1) all five params reach the API; (2) no `status`, `method=otp`;
  (3) `status=success`, no `method`, `source=idp`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-008 — A date-range preset sends a date window

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (preset last 7 days)
- **Preconditions:** none
- **Steps:**
  1. Filters → "Date range" → "Last 7 days".
- **Expected:** URL carries `dateRange=last7`; the request carries `fromDate`
  and `toDate` about 7 days apart.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-009 — Device filter reaches the API

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (MOBILE)
- **Preconditions:** none
- **Steps:**
  1. Open `?deviceType=MOBILE` (the Device filter offered in the panel).
- **Expected:** the list request carries `deviceType=MOBILE`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts` —
  `test.fail()`: **BUG** — `AdminLoginHistoryTable` offers the Device filter
  but never puts `deviceType` into the request (the user-side table does).

### TC-ADMLOGHIST-013 — No match shows the empty state

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (empty result)
- **Preconditions:** list stubbed empty
- **Steps:**
  1. Open `?status=failed`, click "Clear filters".
- **Expected:** "No login history found"; after clearing, the URL has no
  `status`.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-028 — Vietnamese list

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/admin/login-history`.
- **Expected:** heading "Toàn bộ lịch sử đăng nhập", button "Bộ lọc", column
  "Trạng thái", row links "Xem chi tiết cho …"; no `loginHistory.` key.
- **Automated:** `tests/e2e/admin-login-history/list-filters.e2e.ts`

### TC-ADMLOGHIST-030 — List API contract

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** EP
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/admin/login-history?limit=100`.
- **Expected:** 200 envelope; `meta` `{ page: 1, limit: 100, total,
totalPages }`; items carry `_id`, `status`, `source`, `interactive`,
  `usernameAttempted`, `app`; newest first; more than one username.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMLOGHIST-031 — Filters return exactly the matching attempts

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (userId × status / method / source / ip / date)
- **Preconditions:** a throwaway with one successful and one failed password
  sign-in
- **Steps:**
  1. Filter by its auth id alone and combined with each other filter; with a
     date window in 2020 and one around today.
- **Expected:** userId alone → its 2 rows; + success → 1; + failed → 1 (with a
  `failReason`); + password → 2; + otp → 0; + idp → 2; + oauth → 0; + its ip →
  2; 2020 window → 0; today's window → its rows.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMLOGHIST-032 — List query validation

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (page 0/1, limit 0/1/100/101, ip 201 chars, fromDate =
  toDate, fromDate > toDate), EP (each enum valid/invalid, ids, boolean)
- **Preconditions:** none
- **Steps:**
  1. Call the list with each value.
- **Expected:** valid values 200; invalid ones 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMLOGHIST-035 — Pagination boundaries

- **Requirement:** REQ-ADMLOGHIST-01
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** BVA (limit 1, page 2, past the end)
- **Preconditions:** at least two attempts
- **Steps:**
  1. Read page 1 and 2 with `limit=1`, then a page past the end.
- **Expected:** one distinct row per page, `totalPages = total`; past the end
  `items: []`.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

### TC-ADMLOGHIST-034 — Only admins reach the endpoints

- **Requirement:** REQ-ADMLOGHIST-01, REQ-ADMLOGHIST-02
- **Layer:** api · **Priority:** P1 · **Role:** guest, user
- **Technique:** Decision Table (role × endpoint)
- **Preconditions:** none
- **Steps:**
  1. Call the list and a detail without a token and with a user token.
- **Expected:** 401 `AUTH_MISSING_TOKEN`; 403 `AUTH_ADMIN_ONLY` (there is no
  client-side role guard on `/admin/*`; this is the gate — old detail-spec
  row 3).
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`

## Detail — REQ-ADMLOGHIST-02

### TC-ADMLOGHIST-010 — Clicking a row opens its detail page

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (existing record)
- **Preconditions:** at least one row
- **Steps:**
  1. Open the list, click the first row link.
- **Expected:** URL `/admin/login-history/<24-hex>`; heading "Login Attempt
  Detail"; field "IP Address".
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-011 — A detail URL can be opened directly

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (deep link)
- **Preconditions:** a detail URL
- **Steps:**
  1. Go to the list, then straight to the detail URL.
- **Expected:** the detail heading renders.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-012 — Each row is a named link to its detail

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility
- **Preconditions:** at least one row
- **Steps:**
  1. Open the list.
- **Expected:** a link named "View details for …" with
  `href` `/admin/login-history/<24-hex>`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-014 — Detail shows source, app and sign-in type

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (silent SSO from a satellite)
- **Preconditions:** detail stubbed: source oauth, app "Match CV",
  interactive false
- **Steps:**
  1. Open the detail.
- **Expected:** "Satellite app (OIDC)", "Match CV", "Automatic SSO (existing
  session)".
- **Automated:** `tests/e2e/admin-login-history/app-source.e2e.ts`

### TC-ADMLOGHIST-015 — Detail values render as labels

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (enum / boolean / date → label)
- **Preconditions:** detail stubbed with a failed anomalous password attempt
- **Steps:**
  1. Open the detail.
- **Expected:** "Failed", "Password" — never `failed`, `password`, `true`,
  `false` or an ISO timestamp.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-016 — Empty fields are hidden

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Decision Table (null → hidden, present → shown, [] → "None")
- **Preconditions:** detail stubbed with null userId / timezoneOffset and no
  anomaly reasons
- **Steps:**
  1. Open the detail.
- **Expected:** fail reason shown; "User ID" and "Timezone" absent; anomaly
  reasons "None"; "Failed" badge.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-017 — Local and unknown locations get labels

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (LOCAL, UNKNOWN sentinels), i18n (en, vi)
- **Preconditions:** detail stubbed with each sentinel
- **Steps:**
  1. Open the detail for LOCAL (en, vi) and UNKNOWN (en).
- **Expected:** "Local" + `127.0.0.1`, "Unknown", vi "Nội bộ (Local)"; the raw
  `LOCAL` / `UNKNOWN` never shows.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-018 — A malformed id shows "not found"

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (malformed id → 400)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/login-history/not-a-valid-id`.
- **Expected:** "Login history record not found."
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-019 — An unknown id shows "not found"

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (unknown id → 404)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/login-history/000000000000000000000000`.
- **Expected:** "Login history record not found."
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-020 — A failed load shows the error state

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (5xx, network abort)
- **Preconditions:** detail stubbed to 500 / aborted
- **Steps:**
  1. Open a detail with each stub; for the abort, dismiss the toast with OK.
- **Expected:** 500 → "Could not load this login record…"; abort → "Unable to
  connect to server…" toast, then the same error state.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-021 — A skeleton shows while the detail loads

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Error Guessing (slow response)
- **Preconditions:** detail delayed 800 ms
- **Steps:**
  1. Open a detail.
- **Expected:** pulse skeleton, then the heading, then no skeleton.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-022 — Vietnamese detail, not-found and error

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. From `/vi/admin/login-history` open a row; open a malformed id; open a
     detail stubbed to 500.
- **Expected:** "Địa chỉ IP"; "Không tìm thấy bản ghi lịch sử đăng nhập";
  "Không thể tải bản ghi đăng nhập này"; no `loginHistory.admin.detail` key.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-023 — A row opens from the keyboard

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility, State Transition (focus → Enter → detail)
- **Preconditions:** at least one row
- **Steps:**
  1. Focus the first row link, press Enter.
- **Expected:** the detail page opens.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-024 — Back returns to the filtered list

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (list?query → detail → back)
- **Preconditions:** a failed attempt exists
- **Steps:**
  1. Open `?status=failed&page=1`, open a row, press Back.
- **Expected:** the URL still carries `status=failed` and `page=1`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-025 — The loaded detail is announced

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** Accessibility
- **Preconditions:** detail stubbed
- **Steps:**
  1. Open a detail.
- **Expected:** `#announcer` contains "Login attempt detail loaded".
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-026 — A guest is sent to sign in

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (unauthenticated → /login)
- **Preconditions:** none
- **Steps:**
  1. Open a detail URL without a session.
- **Expected:** the browser lands on `/login`.
- **Automated:** `tests/e2e/admin-login-history/detail.e2e.ts`

### TC-ADMLOGHIST-033 — Detail API contract and id errors

- **Requirement:** REQ-ADMLOGHIST-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP, Error Guessing (malformed id, unknown id)
- **Preconditions:** at least one row
- **Steps:**
  1. Read the newest row's detail; read `not-an-id` and
     `000000000000000000000000`.
- **Expected:** 200 with the same `_id` / `usernameAttempted` plus
  `userAgent`, `source`, `app`, `interactive`; 400 `VALIDATION_ERROR`; 404.
- **Automated:** `tests/api/admin-login-history/login-history.api.ts`
