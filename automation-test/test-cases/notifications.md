# NOTIF — test cases

The header bell (unread badge + panel), the `/notifications` page grouped by
day with Unread / Read tabs, and marking one or all notifications read
(REQ-NOTIF-01…03).

Source of truth: `client/src/views/Notifications/**`, `client/src/utils/notifications.ts`,
`client/src/layouts/AppHeader/components/NotificationPanel`,
`client/src/libs/query-client.ts` (global error toast),
`client/src/locales/{en,vi}/{notifications,dashboard}.json`,
`server/src/modules/notification/**`, `server/src/validators/schemas/notification.ts`.
Converted from `docs/specs/notifications-api/e2e.md` (scenarios 1–11 and backfill
rows 1b–12) and the notification-loading part of `docs/specs/frontend-cleanup/e2e.md`.

**Test data.** Browser cases run as `user@test.com` against its seeded
notifications, or stub the endpoints with `page.route` where a state cannot be
guaranteed (empty, two pages, errors, mark all). The two cases that fire the
real `PATCH /:id/read` record the titles they marked and put them back to
unread in `afterAll` directly in Mongo (`markUnreadByTitle`) — there is no
mark-unread API. API cases seed rows for throwaway accounts
(`insertNotifications`), which the cleanup project deletes.

**Server facts the cases rely on.** The list is newest first by default
(`sortOrder` asc / desc), 20 per page, `limit` 1…100, `page` ≥ 1, `isRead`
boolean. `PATCH /:id/read` is scoped to the caller (another user's id is 404,
not 403) and idempotent; `PATCH /read-all` returns `{ updated }`. The client
groups by local day (Today / Yesterday / Earlier), shows a numeric badge only
when the unread count is above zero, and a failed mutation is toasted by the
global handler ("Server error. Please try again later." for every 5xx).

### TC-NOTIF-001 — Unread tab by default, grouped, with relative times

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "Unread" tab active; articles; a Today / Yesterday / Earlier
  header; a relative timestamp.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-002 — A guest is gated to the login screen

- **Requirement:** REQ-NOTIF-02, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** clean context
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "Continue with email" shows; no "Unread" tab.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-003 — Empty state

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (0 items)
- **Preconditions:** list stubbed empty
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "No notifications here."
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-004 — Load more appends page 2 and disappears on the last page

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (page 1 → last)
- **Preconditions:** list stubbed: 20 + 5 items
- **Steps:**
  1. Click "Load more notifications".
- **Expected:** page-2 items appear and the button is gone.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-005 — Unread rows can be marked; read rows cannot

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (tab × isRead)
- **Preconditions:** seeded notifications in both states
- **Steps:**
  1. Look at the Unread tab; switch to Read.
- **Expected:** "Mark as read" buttons on Unread; none on Read (tab active).
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-006 — Titles are literal, times are relative

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (raw ISO / keys)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/notifications`.
- **Expected:** the seeded title "Unusual sign-in detected (#22)" verbatim; no
  ISO timestamp; each article has its icon container.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-007 — English chrome

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en)
- **Preconditions:** none
- **Steps:**
  1. Open `/notifications`.
- **Expected:** tabs "Unread" / "Read" and "Mark all as read".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-008 — Vietnamese chrome

- **Requirement:** REQ-NOTIF-02, REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/notifications`.
- **Expected:** "Chưa đọc" / "Đã đọc" and "Đánh dấu tất cả đã đọc".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-009 — A failing list shows the error state

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (5xx)
- **Preconditions:** list stubbed with 500
- **Steps:**
  1. Open `/notifications`.
- **Expected:** "Couldn't load notifications."
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-010 — Marking one read moves it out of Unread and lowers the badge

- **Requirement:** REQ-NOTIF-03, REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (unread → read)
- **Preconditions:** at least one unread seeded notification; restored in afterAll
- **Steps:**
  1. Click the first "Mark as read".
- **Expected:** the API unread count drops by exactly 1 and the title leaves the Unread tab.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-011 — Mark all empties the Unread tab

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** State Transition (2 unread → 0)
- **Preconditions:** list, unread-count and read-all stubbed
- **Steps:**
  1. Click "Mark all as read".
- **Expected:** the Unread tab shows the empty state and the items are gone.
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
- **Preconditions:** an unread seeded notification; restored in afterAll
- **Steps:**
  1. Mark the first one; reload; open Read.
- **Expected:** absent from Unread after reload; present on Read.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-015 — The bell shows the unread badge and the panel

- **Requirement:** REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path
- **Preconditions:** unread-count stubbed 3; list stubbed
- **Steps:**
  1. Read the bell; open it.
- **Expected:** badge "3"; the panel lists the items and offers "Mark all as read".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-016 — No badge at zero unread

- **Requirement:** REQ-NOTIF-01
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (count 0)
- **Preconditions:** unread-count stubbed 0
- **Steps:**
  1. Open any page.
- **Expected:** the bell has no numeric badge.
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

### TC-NOTIF-018 — A null `readAt` renders without errors

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (null field)
- **Preconditions:** one unread item with `readAt: null` stubbed
- **Steps:**
  1. Open `/notifications`.
- **Expected:** the title renders and no page error is raised.
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

### TC-NOTIF-020 — Each tab holds only its own state

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (tab × isRead)
- **Preconditions:** seeded unread "(#22)" and read "Password changed"
- **Steps:**
  1. Compare both tabs.
- **Expected:** Unread shows the unread title only; Read shows the read title only.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-021 — Vietnamese relative times

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (vi), Error Guessing (locale leak)
- **Preconditions:** seeded notifications
- **Steps:**
  1. Open `/vi/notifications`.
- **Expected:** timestamps contain "trước"; no English "ago".
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-022 — A failed mark-read is toasted and leaves the item unread

- **Requirement:** REQ-NOTIF-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (5xx on the mutation)
- **Preconditions:** one unread item stubbed; PATCH stubbed with 500
- **Steps:**
  1. Click "Mark as read".
- **Expected:** the global toast "Server error. Please try again later."; the
  item and its button remain.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-023 — Tab change and Load more are announced

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y (live region)
- **Preconditions:** two-page stub for Load more
- **Steps:**
  1. Switch to Read; click Load more.
- **Expected:** `#announcer` reads "Showing Read notifications.", then
  "Loading more notifications...".
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

### TC-NOTIF-025 — Controls are named and focusable

- **Requirement:** REQ-NOTIF-03, REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y
- **Preconditions:** seeded data; two-page stub for Load more
- **Steps:**
  1. Focus "Mark as read" and "Load more notifications".
- **Expected:** both found by role and name and take focus.
- **Automated:** `tests/e2e/notifications/notifications.e2e.ts`

### TC-NOTIF-026 — Skeleton while loading, gone once loaded

- **Requirement:** REQ-NOTIF-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (loading → loaded), Error Guessing (skeleton left behind)
- **Preconditions:** list held, then released
- **Steps:**
  1. Open `/notifications`; release.
- **Expected:** the aria-hidden skeleton while pending; items afterwards and no
  skeleton group headers.
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
  1 page; ids match; `readAt` set only on read rows.
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
- **Technique:** BVA (21 rows over limit 20; page 3; limit 0 / 1 / 100 / 101), EP (`abc`, `maybe`, `sideways`)
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
