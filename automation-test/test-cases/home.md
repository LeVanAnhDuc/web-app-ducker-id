# HOME — test cases

The launcher dashboard at `/`: greeting, "Jump back in", the sign-in activity
chart, the method / device breakdown, the most-used ranking and their
drill-down links (REQ-HOME-01…06).

Source of truth: `client/src/views/Home/**`, `client/src/locales/{en,vi}/home.json`,
`server/src/modules/login-history` (`GET /login-history/stats`),
`server/src/modules/recent-app` (`GET /users/me/recent-apps/stats`),
`server/src/validators/schemas/{login-history,recent-app}.ts`.
Converted from `docs/specs/home-activity-insights/e2e.md` (matrix rows 1–13;
row 14 — the date-filter fix — stays a server unit test, see TC-HOME-023).

**Test data.** Browser cases stub both stats endpoints with `page.route` so
every count, threshold and empty state is deterministic, run with
`timezoneId: Asia/Ho_Chi_Minh`, and pin the clock (`page.clock`) for the
greeting. Nothing is written, nothing to revert. API cases read the seeded
user's real stats for shape and consistency, and use throwaway accounts where
exact numbers matter (ranking, empty account, isolation).

**Server facts the cases rely on.** `range` is one of `7d` / `30d` / `90d`
(default `7d`); `tz` must resolve in `Intl` (canonical names and links both
accepted, ≤ 64 characters). `byDay` holds one zero-filled bucket per local
day; `byMethod` has the five methods and `byDevice` the four device types,
always present. The ranking is lifetime `useCount`, not the range; `limit`
1…10, default 5. Client: `SPARSE_THRESHOLD = 3`; greeting morning < 12:00 ≤
afternoon < 18:00 ≤ evening; Quick Access shows 4 tiles and falls back to the
catalogue when the user has no history.

### TC-HOME-001 — The four stat cards are links carrying their value

- **Requirement:** REQ-HOME-05, REQ-HOME-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path
- **Preconditions:** stats stubbed (3 apps used, 3 active, 5 successful, 2 failed)
- **Steps:**
  1. Open `/vi`.
- **Expected:** links "Ứng dụng đã dùng: 3", "Hoạt động 30 ngày: 3",
  "Đăng nhập thành công: 5", "Đăng nhập thất bại: 2".
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-002 — The browser timezone is sent so days are cut locally

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** specification check
- **Preconditions:** browser timezone Asia/Ho_Chi_Minh
- **Steps:**
  1. Open `/vi`; read the stats request.
- **Expected:** `tz` is `Asia/Ho_Chi_Minh` or `Asia/Saigon`.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-003 — The chart has a screen-reader summary and a data table

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y
- **Preconditions:** stats stubbed
- **Steps:**
  1. Open `/vi`.
- **Expected:** an `img` named "Hoạt động đăng nhập 7 ngày qua…" and a table
  "Số lượt đăng nhập theo ngày".
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-004 — One row per day, including days without sign-ins

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (7 buckets, six of them zero)
- **Preconditions:** 7-day stats with one non-zero day
- **Steps:**
  1. Open `/vi`.
- **Expected:** the day table has 7 body rows.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-005 — The range toggle is kept in the URL

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (7d → 30d → reload), BVA (30)
- **Preconditions:** 30-day stats stubbed
- **Steps:**
  1. Click "30 ngày"; reload.
- **Expected:** `range=30d` in the URL; after reload "30 ngày" is
  `aria-pressed="true"` and the table has 30 rows.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-006 — An unsupported range falls back to 7 days

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (invalid value)
- **Preconditions:** stats stubbed
- **Steps:**
  1. Open `/vi?range=999d`.
- **Expected:** "7 ngày" is pressed and the table has 7 rows.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-007 — An empty period is explained

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (0 sign-ins)
- **Preconditions:** stats with zero sign-ins
- **Steps:**
  1. Open `/vi`.
- **Expected:** "Chưa ghi nhận lần đăng nhập nào trong khoảng này."
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-008 — A sparse period is explained up to the threshold

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (3 = threshold, 4 = one over)
- **Preconditions:** stats with 3, then 4 sign-ins
- **Steps:**
  1. Open `/vi`; restub with 4 and reload.
- **Expected:** "Chỉ có 3 lần đăng nhập…" at 3; the day hint
  "Chọn một ngày để xem các lượt đăng nhập của ngày đó." at 4.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-009 — An empty ranking invites the user to open an app

- **Requirement:** REQ-HOME-06
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (0 apps)
- **Preconditions:** app stats with no top apps
- **Steps:**
  1. Open `/vi`.
- **Expected:** "Mở một ứng dụng, nó sẽ được xếp hạng ở đây."
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-010 — A stat card opens the matching filtered list

- **Requirement:** REQ-HOME-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (Home → list)
- **Preconditions:** stats stubbed
- **Steps:**
  1. Click "Đăng nhập thất bại: 2".
- **Expected:** URL `/login-history?status=failed`.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-011 — A method slice opens the list filtered by method

- **Requirement:** REQ-HOME-04, REQ-HOME-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition, Error Guessing (labels, not raw enums)
- **Preconditions:** stats stubbed
- **Steps:**
  1. Click the "Mật khẩu" link.
- **Expected:** URL `/login-history?method=password`.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-012 — A device row filters the list and the filter is applied

- **Requirement:** REQ-HOME-04, REQ-HOME-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition, Error Guessing (dropped query param)
- **Preconditions:** stats stubbed (1 mobile sign-in)
- **Steps:**
  1. Click "Di động: 1".
- **Expected:** URL `/login-history?deviceType=MOBILE` and the Filters button
  badge reads 1.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-013 — A failing stats endpoint degrades one card only

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (5xx)
- **Preconditions:** login stats stubbed with 500
- **Steps:**
  1. Open `/vi` and wait out the retries.
- **Expected:** "Không tải được hoạt động đăng nhập."; the "Ứng dụng dùng
  nhiều nhất" section still renders.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-014 — "Jump back in" falls back to the catalogue for a new user

- **Requirement:** REQ-HOME-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (0 recent apps)
- **Preconditions:** recent apps stubbed empty
- **Steps:**
  1. Open `/vi`.
- **Expected:** "Bạn chưa mở ứng dụng nào — đây là những gì đang có." and the
  section still holds app tiles.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-015 — The explore call-to-action counts the real catalogue

- **Requirement:** REQ-HOME-05
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (hard-coded number)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi`; read `meta.total` from the catalogue response.
- **Expected:** "Hiện có <total> ứng dụng — tìm cái tiếp theo bạn cần."
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-016 — Home in English

- **Requirement:** REQ-HOME-03, REQ-HOME-04, REQ-HOME-06
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (en)
- **Preconditions:** stats stubbed
- **Steps:**
  1. Open `/`.
- **Expected:** headings "Sign-in activity", "Most used apps", "Explore"; link
  "Failed sign-ins: 2"; button "7 days".
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-017 — The removed vanity metrics stay gone

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (regression)
- **Preconditions:** stats stubbed
- **Steps:**
  1. Open `/vi` and `/`.
- **Expected:** no "Thời gian tiết kiệm", "Time Saved" or "Current Streak".
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-018 — A guest is sent to the login screen

- **Requirement:** REQ-AUTHZ-01, REQ-HOME-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi`.
- **Expected:** the URL becomes `/login`.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-019 — The greeting follows the local hour

- **Requirement:** REQ-HOME-01
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (00:00, 11:59 / 12:00, 17:59 / 18:00, 23:59), i18n (vi + en)
- **Preconditions:** browser clock fixed at each time (UTC+7); stats stubbed
- **Steps:**
  1. Open `/vi` at each time; open `/` at 09:00.
- **Expected:** h1 starts "Chào buổi sáng" at 00:00 and 11:59, "Chào buổi
  chiều" at 12:00 and 17:59, "Chào buổi tối" at 18:00 and 23:59; in English
  "Good morning" followed by the user's full name.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-020 — "Jump back in" shows the apps the user opened last

- **Requirement:** REQ-HOME-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (history present), ordering
- **Preconditions:** recent apps stubbed with two apps, newest first
- **Steps:**
  1. Open `/vi`.
- **Expected:** subtitle "Quay lại nơi bạn vừa rời đi"; tiles "Recent Stub 1",
  "Recent Stub 2" in that order; no catalogue-fallback text.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-021 — "Most used apps" ranks by lifetime opens and links to the history

- **Requirement:** REQ-HOME-06, REQ-HOME-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (three ranked apps)
- **Preconditions:** app stats stubbed (9 / 5 / 2 opens)
- **Steps:**
  1. Open `/vi`; click the first row.
- **Expected:** three rows in the given order with their counts; the row
  navigates to `/recently-used`.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-022 — The 90-day range keeps one row per day

- **Requirement:** REQ-HOME-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (largest range)
- **Preconditions:** 90-day stats stubbed
- **Steps:**
  1. Open `/vi?range=90d`.
- **Expected:** "90 ngày" pressed; 90 table rows.
- **Automated:** `tests/e2e/home/home.e2e.ts`

### TC-HOME-023 — A day link includes every sign-in of that local day

- **Requirement:** REQ-HOME-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (sign-ins at 00:00 and 23:59 local time)
- **Preconditions:** login history rows written relative to the run date
- **Steps:**
  1. Click a chart column; compare the list with that day's rows.
- **Expected:** every sign-in of that local day, including late-evening ones.
- **Automated:** manual — needs `login_histories` rows dated relative to the
  run, which the seed does not write; the filter itself is covered by
  `server/src/modules/login-history/helpers/login-history-filter.spec.ts`.

### TC-HOME-030 — Sign-in stats: one bucket per day, totals that add up

- **Requirement:** REQ-HOME-03
- **Layer:** api · **Priority:** P1 · **Role:** user
- **Technique:** BVA (7 / 30 / 90 days), specification check
- **Preconditions:** none
- **Steps:**
  1. `GET /login-history/stats?range=<r>&tz=Asia/Ho_Chi_Minh` for each range.
- **Expected:** `byDay` has exactly `days` consecutive buckets, the first is
  the local day of `range.from`, the last is today (local); `successful +
failed = total`; the buckets sum to `total`.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-031 — Range and timezone validation

- **Requirement:** REQ-HOME-03
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** EP (valid / invalid ranges and zones), BVA (6d / 8d / 91d, 65-char tz)
- **Preconditions:** none
- **Steps:**
  1. No range; `1d`, `6d`, `8d`, `91d`, `999d`, `7`, `week`; tz canonical,
     link, UTC, Europe/Paris; `Mars/Olympus`, `not a zone`, 65 characters.
- **Expected:** default 7 days; every invalid range 400; valid zones 200; invalid zones 400.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-032 — Method and device breakdowns are complete and consistent

- **Requirement:** REQ-HOME-04
- **Layer:** api · **Priority:** P2 · **Role:** user
- **Technique:** specification check
- **Preconditions:** none
- **Steps:**
  1. `GET /login-history/stats?range=30d`.
- **Expected:** `byMethod` keys = password, otp, magic-link, forgot-password,
  sso; `byDevice` keys = DESKTOP, MOBILE, TABLET, UNKNOWN; each sums to
  `total`; `0 ≤ anomalies ≤ total`.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-033 — The ranking orders by opens and honours `limit`

- **Requirement:** REQ-HOME-06
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** BVA (limit 0 / 1 / 10 / 11), EP (`abc`)
- **Preconditions:** three apps opened 3, 2 and 1 times (past the dedupe window)
- **Steps:**
  1. `GET /users/me/recent-apps/stats`, then with each limit.
- **Expected:** `totalApps` 3, active 7 / 30 days 3; `topApps` = a (3), b (2),
  c (1); limit 1 → 1 row, 10 → 3 rows; 0, 11, abc → 400.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-034 — A new account has an empty ranking

- **Requirement:** REQ-HOME-06
- **Layer:** api · **Priority:** P3 · **Role:** throwaway user
- **Technique:** BVA (no history)
- **Preconditions:** fresh account
- **Steps:**
  1. `GET /users/me/recent-apps/stats`.
- **Expected:** all counts 0 and `topApps: []`.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-035 — Both stats endpoints require a session

- **Requirement:** REQ-HOME-03, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token)
- **Preconditions:** none
- **Steps:**
  1. Call both endpoints without a token.
- **Expected:** 401 each.
- **Automated:** `tests/api/home/stats.api.ts`

### TC-HOME-036 — Stats count only the caller's own data

- **Requirement:** REQ-HOME-03, REQ-HOME-06
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user, user
- **Technique:** Error Guessing (cross-account leak)
- **Preconditions:** fresh account
- **Steps:**
  1. Compare its 7-day `total` with its own login-history total; read its ranking.
- **Expected:** the totals are equal (≥ 1), the seeded user's sign-ins are not
  included, and the ranking is empty.
- **Automated:** `tests/api/home/stats.api.ts`
