# NOTIF — test cases

The header bell (unread badge + panel), the `/notifications` page with All /
Unread / Read tabs and a type filter, opening and marking notifications read,
and the real events that produce them (REQ-NOTIF-01…08). Access-change
notifications are REQ-ADMENT-04 (`admin-entitlements.md`, TC-ADMENT-040 / 041).

Source of truth: `client/src/views/Notifications/**`,
`client/src/components/Notification*`, `client/src/hooks/useNotificationText.ts`,
`client/src/utils/notifications.ts`,
`client/src/layouts/AppHeader/components/NotificationPanel*`,
`client/src/locales/{en,vi}/notifications.json` (`types.<TYPE>` templates),
`server/src/modules/notification/**`, `server/src/services/notification/`,
`server/src/validators/schemas/notification.ts`,
`server/src/database/seeders/data/notifications.ts`.
Converted from `docs/specs/notifications-api/e2e.md`, the notification-loading
part of `docs/specs/frontend-cleanup/e2e.md` and `docs/specs/notification-events/e2e.md`
(scenarios 1–13 and §3 "not in E2E").

**Test data.** A row stores `type + category + params + link`, never text: the
client renders `notifications.types.<TYPE>` in the page locale, so cases assert
rendered sentences ("Seed App 10 is now in your launcher."). Browser cases run
as `user@test.com` against its 26 seeded rows — #10 (unread) and #11 (read) are
read-only anchors, #12 and #14 are consumed by the two real `PATCH /:id/read`
cases and put back to unread in `afterAll` (`markUnreadByAppName`; there is no
mark-unread API). States the seed cannot give (empty, two pages, errors, unknown
type, unsafe links, other countries) stub the endpoints with `page.route`.
Producer and API cases use throwaway accounts (`insertNotifications` writes rows
in the real shape), which the cleanup project deletes.

**Server facts the cases rely on.** Newest first by default (`sortOrder`
asc / desc), 20 per page, `limit` 1…100, `page` ≥ 1, `isRead` boolean,
`category` one of `security` / `account` / `app` / `system`. `PATCH /:id/read`
is scoped to the caller (another user's id is 404, not 403) and idempotent;
`PATCH /read-all` returns `{ updated }`. The panel asks for 8 rows. The client
groups by local day (Today / Yesterday / Earlier), shows a numeric badge only
above zero, refetches the count every 60 s, renders a link only for an internal
path, and toasts its own "Could not mark as read." for a failed mark (the
global 5xx toast is suppressed).

### TC-NOTIF-001 — All tab by default, seeded templates, grouped, relative times

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-05, REQ-NOTIF-07
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "All" tab active; "Seed App 10 is now in your launcher." (unread)
  and the Seed App 11 sentence (read) both listed; a Today / Yesterday / Earlier
  header; no ISO timestamp.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-002 — A guest is gated to the login screen

- **Requirement:** REQ-NOTIF-02, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** clean context
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "Continue with email" shows; no "All" tab.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-003 — Empty state

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (0 items)
- **Preconditions:** list stubbed empty
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "You're all caught up" and "No notifications here."
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-004 — Load more appends page 2 and disappears on the last page

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (page 1 → last)
- **Preconditions:** list stubbed: 20 + 5 items
- **Steps:**
  1. Click "Load more notifications".
- **Expected:** page-2 items appear, the button is gone and `#announcer` reads
  "Loading more notifications...".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-005 — Unread rows can be marked; read rows cannot

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (isRead false / true)
- **Preconditions:** one unread and one read row stubbed
- **Steps:**
  1. Open `/notifications`.
- **Expected:** one `article[data-read=false]`, one `article[data-read=true]`,
  exactly one "Mark as read" button.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-006 — Each template is filled from its params

- **Requirement:** REQ-NOTIF-07, REQ-NOTIF-04
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (type × params: anomaly reason device, actor admin / self, lock minutes)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "New sign-in to your account" with "Chrome on Windows — a device
  we haven't seen on your account before."; "Your password was reset by an
  administrator" and "Your password was changed"; "Too many wrong passwords.
  Sign-in was blocked for 30 minutes."; no raw enum or `types.` key.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-007 — English chrome

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-03, REQ-NOTIF-05
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en)
- **Preconditions:** none
- **Steps:**
  1. Open `/notifications`.
- **Expected:** tabs "All" / "Unread" / "Read", "Mark all as read" and the
  "Filter by type" chip group.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-008 — Vietnamese chrome and templates

- **Requirement:** REQ-NOTIF-07, REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/vi/notifications`.
- **Expected:** "Tất cả" / "Chưa đọc" / "Đã đọc", "Đánh dấu tất cả đã đọc",
  "Seed App 10 đã có trong launcher của bạn." and "Có lượt đăng nhập mới vào
  tài khoản"; no English template.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-009 — A failing list shows the error state and Try again recovers

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (error → retry → loaded)
- **Preconditions:** list stubbed with 500, then with one row
- **Steps:**
  1. Open `/notifications`; lift the failure; click "Try again".
- **Expected:** "Couldn't load notifications.", then the row.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-010 — Marking one read moves it out of Unread and lowers the count

- **Requirement:** REQ-NOTIF-03, REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (unread → read)
- **Preconditions:** seeded Seed App 12 unread; restored in afterAll
- **Steps:**
  1. Open the Unread tab; "Mark as read" on the Seed App 12 row.
- **Expected:** the API unread count drops by exactly 1 and the row leaves the Unread tab.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-011 — Mark all empties the Unread tab

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (2 unread → 0)
- **Preconditions:** list, unread-count and read-all stubbed
- **Steps:**
  1. Click "Mark all as read".
- **Expected:** the empty state shows, the items are gone and the bell has no badge.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-012 — Mark all with nothing unread is a no-op

- **Requirement:** REQ-NOTIF-03, REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (0 unread)
- **Preconditions:** stubs with 0 unread, `updated: 0`
- **Steps:**
  1. Click "Mark all as read".
- **Expected:** still empty; no numeric (never negative) badge on the bell.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-013 — A double click sends one PATCH

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (pending guard), Error Guessing (double submit)
- **Preconditions:** one unread item stubbed; PATCH delayed 600 ms
- **Steps:**
  1. Click; while disabled dispatch a second click.
- **Expected:** the button is disabled while pending and exactly one PATCH fires.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-014 — A marked notification stays read after reload

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (read → reload)
- **Preconditions:** seeded Seed App 14 unread; restored in afterAll
- **Steps:**
  1. Mark the Seed App 14 row; reload; open Unread, then Read.
- **Expected:** the row turns `data-read=true`; absent from Unread after reload; present on Read.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-015 — The bell shows the unread badge and the panel asks for 8 rows

- **Requirement:** REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** BVA (panel limit 8)
- **Preconditions:** unread-count stubbed 3; list stubbed
- **Steps:**
  1. On `/` read the bell; open it.
- **Expected:** badge "3"; the panel lists the items, offers "Mark all as read",
  and its list request carries `limit=8`.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-016 — No badge at zero unread; the panel shows its empty state

- **Requirement:** REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (count 0)
- **Preconditions:** unread-count stubbed 0; list stubbed empty
- **Steps:**
  1. On `/` open the bell.
- **Expected:** no numeric badge; the panel reads "You're all caught up".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-017 — Per-tab empty state on Read

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (empty partition)
- **Preconditions:** list stubbed empty for `isRead=true` only
- **Steps:**
  1. Switch to Read.
- **Expected:** "No notifications here." on the active Read tab.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-018 — An unknown type renders its name instead of crashing

- **Requirement:** REQ-NOTIF-07
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (type the client does not know; `readAt: null`)
- **Preconditions:** one row of type `FUTURE_TYPE` stubbed
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "FUTURE_TYPE" shows and no page error is raised.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-019 — Exactly one full page shows no Load more

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (20 items, totalPages 1)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/notifications`.
- **Expected:** no "Load more notifications".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-020 — The Read tab holds only read rows

- **Requirement:** REQ-NOTIF-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (tab × isRead)
- **Preconditions:** seeded Seed App 10 (unread) and 11 (read)
- **Steps:**
  1. Switch to Read.
- **Expected:** the Seed App 11 sentence shows, Seed App 10 does not;
  `#announcer` reads "Showing Read notifications.".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-021 — Vietnamese relative times

- **Requirement:** REQ-NOTIF-07, REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (vi), Error Guessing (locale leak)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/vi/notifications`.
- **Expected:** timestamps contain "trước"; no English "ago" and no English template.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-022 — A failed mark-read gets its own toast and leaves the item unread

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (5xx on the mutation)
- **Preconditions:** one unread item stubbed; PATCH stubbed with 500
- **Steps:**
  1. Click "Mark as read".
- **Expected:** the toast "Could not mark as read." and **not** the global
  "Server error. Please try again later."; the item and its button remain.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-023 — Tab, type filter and Load more are announced

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-05
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (live region)
- **Preconditions:** seeded data; two-page stub for Load more
- **Steps:**
  1. Switch to Read; pick the Security chip; click Load more.
- **Expected:** `#announcer` reads "Showing Read notifications.", "Showing
  Security notifications.", "Loading more notifications...".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-024 — Enter and Space activate Mark as read

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (keyboard)
- **Preconditions:** one unread item stubbed
- **Steps:**
  1. Focus the button; press Enter (and, separately, Space).
- **Expected:** the PATCH fires.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-025 — Each row is an article named by its title; its link takes focus

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-06
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y
- **Preconditions:** one APP_AVAILABLE row stubbed
- **Steps:**
  1. Find the article by name; focus its link.
- **Expected:** `article` "New app available" exists; the link is focusable.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-026 — Skeleton while loading, gone once loaded

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (loading → loaded), Error Guessing (skeleton left behind)
- **Preconditions:** list held, then released
- **Steps:**
  1. Open `/notifications`; release.
- **Expected:** the aria-hidden skeleton while pending; items afterwards and no
  skeleton title bar left.
- **Automated:** `tests/e2e/notifications/loading-state.e2e.ts`

### TC-NOTIF-027 — Day groups switch at local midnight

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (each side of the Today / Yesterday / Earlier edges)
- **Preconditions:** clock fixed 07.10.2026 10:00 (UTC+7); list stubbed
- **Steps:**
  1. Serve items at 07.10 00:00:00, 06.10 23:59:59, 06.10 00:00:00, 05.10 23:59:59.
- **Expected:** Today 1, Yesterday 2, Earlier 1.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-028 — The panel's Mark all and View all

- **Requirement:** REQ-NOTIF-01, REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (2 unread → 0; panel → page)
- **Preconditions:** endpoints stubbed (count 2 → 0 after read-all)
- **Steps:**
  1. On `/` open the bell; "Mark all as read"; "View all notifications".
- **Expected:** the badge disappears; navigation to `/notifications`.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-030 — List contract and sort order

- **Requirement:** REQ-NOTIF-02
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** specification check, EP (sortOrder asc / default)
- **Preconditions:** three seeded rows (one read)
- **Steps:**
  1. GET the list; GET with `sortOrder=asc`.
- **Expected:** newest first by default, oldest first with asc; meta total 3,
  1 page; ids match; each item carries `type` / `category` / `params` and no
  `title`, `message` or `dedupeKey`; `readAt` set only on read rows.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-031 — Read filter and unread count agree

- **Requirement:** REQ-NOTIF-01, REQ-NOTIF-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** EP (isRead true / false)
- **Preconditions:** two unread, one read
- **Steps:**
  1. `isRead=false`, `isRead=true`, `/unread-count`.
- **Expected:** totals 2 and 1 with matching states; count 2.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-032 — Paging boundaries and query validation

- **Requirement:** REQ-NOTIF-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** BVA (21 rows over limit 20; page 3; limit 0 / 1 / 100 / 101), EP (`abc`, `maybe`, `sideways`, `bogus` category)
- **Preconditions:** 21 rows
- **Steps:**
  1. Pages 1–3; each invalid value.
- **Expected:** 20 + 1 + 0 rows, totalPages 2; invalid values 400, limit 1 / 100 → 200.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-033 — Marking one read is idempotent

- **Requirement:** REQ-NOTIF-03
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** State Transition (unread → read → read)
- **Preconditions:** two unread rows
- **Steps:**
  1. PATCH one twice.
- **Expected:** 200 with `isRead: true` and a `readAt`; count 2 → 1 and stays 1.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-034 — Mark all read

- **Requirement:** REQ-NOTIF-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** BVA (2 unread → 0 unread)
- **Preconditions:** two unread, one read
- **Steps:**
  1. PATCH `/read-all` twice.
- **Expected:** `{ updated: 2 }`, count 0; then `{ updated: 0 }`.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-035 — Notifications are private to each user

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-03
- **Layer:** api · **Priority:** P1 · **Role:** two throwaway users
- **Technique:** Error Guessing (IDOR)
- **Preconditions:** one unread row each
- **Steps:**
  1. Bob lists, PATCHes Alice's id, and marks all.
- **Expected:** Bob sees only his row; Alice's id is 404 for him; Alice's row stays unread.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-036 — Id validation

- **Requirement:** REQ-NOTIF-03
- **Layer:** api · **Priority:** P3 · **Role:** user
- **Technique:** EP (malformed / unknown id)
- **Preconditions:** none
- **Steps:**
  1. PATCH `not-an-id/read` and `ffff…/read`.
- **Expected:** 400; 404 with an error `code`.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-037 — Every endpoint requires a session

- **Requirement:** REQ-NOTIF-01, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token)
- **Preconditions:** none
- **Steps:**
  1. Call list, unread-count, read-all and mark-one without a token.
- **Expected:** 401 each.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-038 — The type filter narrows the list and combines with isRead

- **Requirement:** REQ-NOTIF-05
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** EP (`security` / `app` / `system` / invalid), Decision Table (category × isRead)
- **Preconditions:** two APP_AVAILABLE rows (one read), one LOGIN_ANOMALY, one read ACCOUNT_LOCKED
- **Steps:**
  1. List with `category=security`, `app`, `system`; `security` + `isRead=false`; `bogus`, `SECURITY`, empty.
- **Expected:** 2 security rows, the 2 app rows, nothing for system, only the
  LOGIN_ANOMALY when combined; each invalid value 400.
- **Automated:** `tests/api/notifications/notifications.api.ts`

### TC-NOTIF-039 — A new device and country names the country

- **Requirement:** REQ-NOTIF-07
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Decision Table (anomaly reason `both`)
- **Preconditions:** one LOGIN_ANOMALY `{ reason: both, browser: Firefox, os: Linux, country: JP }` stubbed
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "Firefox on Linux, from Japan — a device and a country we haven't seen before."
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-040 — A link that is not an internal path renders no anchor

- **Requirement:** REQ-NOTIF-06
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (absolute URL, protocol-relative `//host`, backslash `/\host`)
- **Preconditions:** one row stubbed per link
- **Steps:**
  1. Open `/notifications` for each.
- **Expected:** the row's text shows and it contains no `<a>`.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-041 — An internal link renders an anchor to that path

- **Requirement:** REQ-NOTIF-06
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (internal path)
- **Preconditions:** one APP_AVAILABLE row stubbed with `/apps?search=…`
- **Steps:**
  1. Open `/notifications`.
- **Expected:** the row's link has `href="/apps?search=Intercepted%20app%201"`.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-042 — Tab and type chip combine into one request

- **Requirement:** REQ-NOTIF-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (tab × category)
- **Preconditions:** list stubbed; requests recorded
- **Steps:**
  1. Open `/notifications`; pick Unread, then the Security chip.
- **Expected:** the first request has neither `isRead` nor `category`; a later
  one has `isRead=false&category=security`; the chip is pressed.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-043 — The Security and Apps chips filter the real list

- **Requirement:** REQ-NOTIF-05
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (security / app)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Pick Security; then Apps.
- **Expected:** Security shows "New sign-in to your account" and no Seed App
  row; Apps shows Seed App 10 and no sign-in row.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-044 — Country names follow the reader's language

- **Requirement:** REQ-NOTIF-07
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (vi), Decision Table (reason `country`)
- **Preconditions:** one LOGIN_ANOMALY with `country: VN` stubbed
- **Steps:**
  1. Open `/vi/notifications`.
- **Expected:** the sentence names "Việt Nam", not "VN".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-045 — Opening an unread row marks it read and follows its link

- **Requirement:** REQ-NOTIF-06, REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (unread → opened)
- **Preconditions:** one unread APP_AVAILABLE row stubbed; PATCH stubbed
- **Steps:**
  1. Click the row.
- **Expected:** navigation to `/apps?search=Intercepted app 7` and the mark-read PATCH sent.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-046 — Opening a read row does not mark it again

- **Requirement:** REQ-NOTIF-06
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (invalid transition read → read)
- **Preconditions:** one read row stubbed; PATCH counted
- **Steps:**
  1. Click the row.
- **Expected:** navigation to `/apps?search=…` and no PATCH.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-047 — "Not you?" on an unusual sign-in leads to the password form

- **Requirement:** REQ-NOTIF-06
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** happy path
- **Preconditions:** one LOGIN_ANOMALY row stubbed
- **Steps:**
  1. Click "Not you? Change your password".
- **Expected:** navigation to `/profile`.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-048 — A sign-in from an unseen device produces a real notification

- **Requirement:** REQ-NOTIF-04
- **Layer:** e2e · **Priority:** P1 · **Role:** throwaway user
- **Technique:** State Transition (known device → new device)
- **Preconditions:** a throwaway account
- **Steps:**
  1. Sign in over the API as browser A (first sign-in: no history), then as browser B (Safari on macOS).
  2. Sign in in the browser and open `/notifications`.
- **Expected:** no LOGIN_ANOMALY after the first sign-in; exactly one after the
  second, with `params.browser` "Safari"; the page shows "Safari on …".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-049 — The panel shows its error state

- **Requirement:** REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (5xx)
- **Preconditions:** list stubbed with 500
- **Steps:**
  1. On `/` open the bell.
- **Expected:** the panel reads "Couldn't load notifications.".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-050 — Opening an item in the panel closes it and navigates

- **Requirement:** REQ-NOTIF-01, REQ-NOTIF-06
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (panel open → closed)
- **Preconditions:** one read row stubbed
- **Steps:**
  1. On `/` open the bell; click the row.
- **Expected:** navigation to `/apps?search=…` and no dialog left.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-051 — Type chips expose their pressed state

- **Requirement:** REQ-NOTIF-05
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y
- **Preconditions:** list stubbed
- **Steps:**
  1. Read the "Filter by type" group.
- **Expected:** "All types" pressed, "Security" not pressed.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-052 — The badge refreshes on its own every minute

- **Requirement:** REQ-NOTIF-08
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (count changes server-side)
- **Preconditions:** none
- **Steps:**
  1. Leave a page open while a notification arrives.
- **Expected:** the badge updates within 60 s without a reload.
- **Automated:** manual — the interval is `refetchInterval: 60_000` in `useUnreadCount`; proving it means waiting a minute per run (or faking timers inside React Query), which the suite does not do. Checked by reading the hook.

### TC-NOTIF-053 — Changing your own password notifies you

- **Requirement:** REQ-NOTIF-04
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** State Transition (event → stored row)
- **Preconditions:** a throwaway account
- **Steps:**
  1. `PATCH /auth/change-password`.
- **Expected:** one PASSWORD_CHANGED row, category `security`, `params.actor`
  `self`, link `/profile`, unread.
- **Automated:** `tests/api/notifications/events.api.ts`

### TC-NOTIF-054 — An admin password reset notifies the user

- **Requirement:** REQ-NOTIF-04
- **Layer:** api · **Priority:** P2 · **Role:** admin + throwaway user
- **Technique:** State Transition (event → stored row)
- **Preconditions:** a throwaway account
- **Steps:**
  1. `POST /admin/users/:id/reset-password`.
- **Expected:** one PASSWORD_CHANGED row with `params.actor` `admin` and link `/profile`.
- **Automated:** `tests/api/notifications/events.api.ts`

### TC-NOTIF-055 — A password lockout notifies the account

- **Requirement:** REQ-NOTIF-04
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** BVA (10th wrong password)
- **Preconditions:** a throwaway account
- **Steps:**
  1. Enter a wrong password 10 times.
- **Expected:** one ACCOUNT_LOCKED row, category `security`, link
  `/login-history`, `params.minutes` a positive number.
- **Automated:** `tests/api/notifications/events.api.ts`

### TC-NOTIF-056 — A new app in the launcher is announced once

- **Requirement:** REQ-NOTIF-04
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (hidden → active → inactive → active)
- **Preconditions:** an app nobody has been told about
- **Steps:**
  1. Create an app inactive, activate it, deactivate, activate again.
- **Expected:** every user its roles allow gets **exactly one** APP_AVAILABLE row.
- **Automated:** manual — the announcement is a broadcast to every eligible account, so automating it would write a row into the seeded `user@test.com` / `admin@test.com` inboxes the other specs anchor on. Checked by hand against the real API on 05.10.2026 (`docs/specs/notification-events/design.md` §9) and by the web-app unit tests.
