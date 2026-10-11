# LOGHIST — test cases

The user's own sign-in history at `/login-history` and `GET /login-history`:
what a row shows, where the sign-in went (Ducker ID or a satellite app),
filters and paging, and isolation between users (REQ-LOGHIST-01…04).

Source of truth: `client/src/views/LoginHistory/**`,
`client/src/dataSources/LoginHistory/index.tsx`, `client/src/components/LoginAppLabel`,
`client/src/locales/{en,vi}/loginHistory.json`, `server/src/modules/login-history/**`
(`dtos/my-history-item.dto.ts`), `server/src/modules/oauth/services/authorize.ts`,
`server/src/validators/schemas/login-history.ts`.
Converted from `docs/specs/login-history-app-source/e2e.md` and the user-view
rows of `docs/specs/login-history-ip-country/e2e.md` (the admin rows belong to
ADMLOGHIST).

**Test data.** Rendering, filters and i18n stub the list endpoint. Real SSO
rows are produced by authorize round-trips into OAuth clients a spec
registers (`helpers/oidc.ts`); deleting the clients in `afterAll` also deletes
the history and recent-app rows they produced. Exact counts and failed
attempts use throwaway accounts.

**Server facts the cases rely on.** Filters `status` (success / failed),
`method` (password / otp / magic-link / forgot-password / sso), `deviceType`,
`source` (idp / oauth), `webAppId`, `interactive`, `fromDate` / `toDate` (ISO;
a date-only bound covers the whole day; `toDate < fromDate` → 400). Paging
`page` ≥ 1, `limit` 1…100. Unknown keys (e.g. `userId`) are stripped on the
user endpoint. The client maps its "app" filter to `source=idp` or
`webAppId=<id>` and drops filter values that are not one of its options.
Loopback IPs are normalised to `127.0.0.1`; `LOCAL` / `UNKNOWN` locations are
rendered as labels.

### TC-LOGHIST-001 — Loopback IP and the "Local" location label

- **Requirement:** REQ-LOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (country = LOCAL, loopback IP)
- **Preconditions:** list stubbed with a LOCAL row
- **Steps:**
  1. Open `/login-history`.
- **Expected:** `127.0.0.1` and "Local"; never `::1`, `::ffff:` or the raw "LOCAL".
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGHIST-002 — The "Local" label in Vietnamese

- **Requirement:** REQ-LOGHIST-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** same stub
- **Steps:**
  1. Open `/vi/login-history`.
- **Expected:** "Nội bộ (Local)"; no raw "LOCAL".
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGHIST-003 — The summary stat cards moved to Home

- **Requirement:** REQ-LOGHIST-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (regression)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/login-history`.
- **Expected:** the table renders and no "Total Logins:" group exists.
- **Automated:** `tests/e2e/login-history/my-login-history.e2e.ts`

### TC-LOGHIST-004 — Rows show Ducker ID or the app; silent SSO carries "Auto"

- **Requirement:** REQ-LOGHIST-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Decision Table (source idp / oauth × interactive true / false)
- **Preconditions:** list stubbed with an IdP row and a silent SSO row
- **Steps:**
  1. Open `/login-history`.
- **Expected:** the IdP row reads "Ducker ID" without a badge; the SSO row
  names the app, method "SSO" and the "Auto" badge.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-005 — The default list hides nothing

- **Requirement:** REQ-LOGHIST-02, REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (no filter)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/login-history`.
- **Expected:** silent SSO rows are listed and the request has no `interactive` param.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-006 — Method = SSO includes silent sign-ins

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (method = sso)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/login-history?method=sso`.
- **Expected:** `method=sso` and no `interactive` in the request.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-007 — App filter "Ducker ID" maps to `source=idp` and survives reload

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (URL state across reload)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/login-history?app=idp`; reload.
- **Expected:** `source=idp` in the request before and after the reload.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-008 — A filter with no match shows the empty state

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (0 rows)
- **Preconditions:** list stubbed empty
- **Steps:**
  1. Open `/login-history?app=idp`.
- **Expected:** "No login history found".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-009 — App column and badge in Vietnamese

- **Requirement:** REQ-LOGHIST-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** a silent SSO row stubbed
- **Steps:**
  1. Open `/vi/login-history`.
- **Expected:** column "Ứng dụng" and badge "Tự động".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-010 — A real silent SSO is recorded and listed

- **Requirement:** REQ-LOGHIST-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (session → authorize → listed)
- **Preconditions:** a user-visible OAuth client registered by the spec
- **Steps:**
  1. Authorize on the seeded user's session; open `/login-history?method=sso`.
- **Expected:** 302 with a code; a row for the app with "Auto" and "Success".
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-011 — An SSO denied for a missing role is recorded as failed

- **Requirement:** REQ-LOGHIST-02, REQ-LOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (role user × app admin-only)
- **Preconditions:** an admin-only OAuth client registered by the spec
- **Steps:**
  1. Authorize into it; open `/login-history?method=sso`.
- **Expected:** 302 with `error=access_denied`; a "Failed" row for that app.
- **Automated:** `tests/e2e/login-history/app-source.e2e.ts`

### TC-LOGHIST-012 — The status filter from the Filters panel

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (status = failed), State Transition (unfiltered → filtered)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open Filters; pick Status → "Failed".
- **Expected:** `status=failed` in the URL and the request, with `page=1`.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGHIST-013 — Filters combine; foreign values are dropped

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (status × method × device × app), EP (invalid values)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `?status=failed&method=otp&deviceType=MOBILE&app=idp`;
  2. open `?status=maybe&method=telepathy&deviceType=FRIDGE`.
- **Expected:** one request with all four (app as `source=idp`) and the badge
  "4"; the invalid values are not sent at all.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGHIST-014 — A date-range deep link

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (both bounds)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `?fromDate=2026-10-01&toDate=2026-10-05`.
- **Expected:** both dates are forwarded unchanged.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGHIST-015 — The pager

- **Requirement:** REQ-LOGHIST-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (page 1 → last), State Transition
- **Preconditions:** list stubbed with two pages
- **Steps:**
  1. Click "Go to next page".
- **Expected:** Previous disabled on page 1; `page=2` in URL and request; Next
  disabled on the last page.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGHIST-016 — A row shows method, result, device, browser, IP and location

- **Requirement:** REQ-LOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (OTP, mobile, real country/city)
- **Preconditions:** one row stubbed
- **Steps:**
  1. Open `/login-history`.
- **Expected:** "OTP", "Success", "MOBILE · Safari 17", the IP and "Hanoi, VN".
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGHIST-017 — A failed row shows its reason, the OS and the anomaly flag

- **Requirement:** REQ-LOGHIST-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (failed, anomalous), specification check
- **Preconditions:** one failed anomalous row stubbed (reason `invalid_password`, OS Ubuntu 24.04)
- **Steps:**
  1. Open `/login-history`.
- **Expected:** the row shows "Failed", the reason and the OS.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts` — marked
  `test.fail()`: **app bug**, `buildLoginHistoryColumns` has no reason, OS or
  anomaly column although README / REQ-LOGHIST-01 promise them.

### TC-LOGHIST-018 — A guest is sent to the login screen

- **Requirement:** REQ-LOGHIST-04, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/login-history`.
- **Expected:** `/login`; no table.
- **Automated:** `tests/e2e/login-history/filters.e2e.ts`

### TC-LOGHIST-020 — List contract

- **Requirement:** REQ-LOGHIST-01
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** specification check
- **Preconditions:** the seeded user has signed in at least once (setup)
- **Steps:**
  1. `GET /login-history?limit=5`.
- **Expected:** meta page 1 / limit 5; every row has method, status,
  failReason, ip, country, city, deviceType, os, browser, clientType,
  createdAt, source, app, interactive; status and source are known values; no
  raw IPv6 loopback; newest first.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGHIST-021 — A wrong password is a failed row with a reason

- **Requirement:** REQ-LOGHIST-01
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** EP (failed / successful attempt)
- **Preconditions:** fresh account, one wrong password
- **Steps:**
  1. List the account's history.
- **Expected:** exactly one failed `password` row with a `failReason`;
  successful rows have `failReason: null`.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGHIST-022 — Rows carry the anomaly flag

- **Requirement:** REQ-LOGHIST-01
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** specification check
- **Preconditions:** none
- **Steps:**
  1. `GET /login-history`.
- **Expected:** every row has a boolean `isAnomaly`.
- **Automated:** `tests/api/login-history/my-history.api.ts` — marked
  `test.fail()`: **app bug**, `MyHistoryItemDto` omits `isAnomaly` (only the
  admin DTO has it).

### TC-LOGHIST-023 — Filters on the server

- **Requirement:** REQ-LOGHIST-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** EP (status / method / source), Decision Table (method × status), BVA (date bounds)
- **Preconditions:** fresh account with one failed and ≥ 1 successful sign-in
- **Steps:**
  1. Filter by each status, `method=password&status=failed`, `method=otp`,
     `source=oauth|idp`, yesterday…tomorrow, from tomorrow.
- **Expected:** each subset only holds matching rows and failed + success =
  all; the combined filter returns the one row; otp and oauth are empty; idp is
  everything; the date window holds everything; from tomorrow is empty.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGHIST-024 — Validation and page boundaries

- **Requirement:** REQ-LOGHIST-03
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** EP (invalid enums, ids, dates, sort), BVA (page 0, limit 0 / 1 / 100 / 101, last + 1)
- **Preconditions:** none
- **Steps:**
  1. Send each invalid parameter; then `limit=1` at `totalPages + 1`.
- **Expected:** 400 for every invalid value and for `toDate < fromDate`;
  limit 1 / 100 → 200; last + 1 returns `[]` with the same total.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGHIST-025 — A user never sees another user's attempts

- **Requirement:** REQ-LOGHIST-04
- **Layer:** api · **Priority:** P1 · **Role:** two throwaway users, user
- **Technique:** Error Guessing (cross-account leak, tampered `userId`)
- **Preconditions:** Bob has a failed attempt; Alice has none
- **Steps:**
  1. List Alice's history; compare with the seeded user's ids; repeat with
     `userId=<other>`.
- **Expected:** Alice sees only successful rows of her own, none of the seeded
  user's ids; the `userId` param is ignored (same total).
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGHIST-026 — Session required; the admin list needs admin

- **Requirement:** REQ-LOGHIST-04, REQ-AUTHZ-02
- **Layer:** api · **Priority:** P1 · **Role:** guest, user
- **Technique:** Decision Table (no session / user × own / admin endpoint)
- **Preconditions:** none
- **Steps:**
  1. Guest GET `/login-history` and `/login-history/stats`; user GET `/admin/login-history`.
- **Expected:** 401, 401, 403.
- **Automated:** `tests/api/login-history/my-history.api.ts`

### TC-LOGHIST-027 — SSO rows name the app and filter by it

- **Requirement:** REQ-LOGHIST-02, REQ-LOGHIST-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user with an IdP session
- **Technique:** State Transition (authorize → row), EP (webAppId / source / interactive)
- **Preconditions:** a public OAuth client registered by the spec
- **Steps:**
  1. Authorize until a code is issued; list `method=sso`, `webAppId=<app>`,
     `source=idp`, `interactive=false`.
- **Expected:** one row `{ method: sso, status: success, source: oauth,
interactive: false, app: { id, name } }`; `webAppId` and `interactive=false`
  return exactly it; `source=idp` excludes it.
- **Automated:** `tests/api/login-history/my-history.api.ts`
