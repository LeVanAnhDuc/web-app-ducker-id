# ADMCONTACT — test cases

The admin support inbox at `/admin/contact`: the list with search and
filters, the detail view of one request, and its status workflow
`new → processing → resolved` (REQ-ADMCONTACT-01…03).

Source of truth: `client/src/views/AdminContact/**`,
`client/src/views/AdminContactDetail/**`,
`client/src/dataSources/{ContactAdmin,AdminContactDetail}`,
`client/src/components/ShortId`, `client/src/hooks/useListQuery.ts`,
`client/src/locales/{en,vi}/{contactAdmin,list}.json`,
`server/src/modules/contact-admin/**`,
`server/src/validators/schemas/contact-admin.ts`.
Converted from the admin rows of `docs/specs/contact-ticket-id-display/e2e.md`
and its `contact-detail-fullid-cleanup` delta (`docs/specs/contact-detail-fullid-cleanup/`).
List search and filters, the detail view, the status workflow and the API
contract were gaps and are new. The public support form belongs to the
support module.

**Test data.** No test reads or changes a request somebody else filed. Each
test files its own through the public `POST /contact/submit` (as a guest, or
as `user@test.com` when the submitter matters) with a subject starting
"E2E support ticket", works on that request only, and `afterAll` deletes every
request carrying the prefix (`helpers/adminContact.ts`). The id-display cases
stub list and detail with `page.route`.

**Server facts the cases rely on.** Page size 20; `limit` 1…100; `page` ≥ 1;
`status` ∈ {new, processing, resolved}; `priority` ∈ {low, medium, high} (new
requests are `medium`); `search` (≤ 200 characters) matches subject or email,
case-insensitive and regex-escaped; `email` is a partial, case-insensitive
match; `fromDate` ≤ `toDate`; `sortBy` ∈ {createdAt, priority, status}. Newest
first. A new request starts `new`. `PATCH /admin/contacts/:id/status` accepts
any of the three states from any state — **there is no transition guard**, so
reopening a resolved request or skipping `processing` is accepted; anything
else is 400 `VALIDATION_ERROR` and leaves the status unchanged. Malformed id
→ 400, unknown id → 404 `CONTACT_NOT_FOUND`. The client's global error
handler toasts the server message ("Contact request not found",
"Validation failed") and the detail card renders nothing.

## List — REQ-ADMCONTACT-01

### TC-ADMCONTACT-001 — The list shows a short ticket id

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (24-hex id → first 6 + "...")
- **Preconditions:** list stubbed with `_id` `0123456789abcdef01234567`
- **Steps:**
  1. Open `/admin/contact`.
- **Expected:** the ticket cell reads `012345...`; the full id is not shown.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-002 — No category column, no leaked key

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (removed column)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/admin/contact`.
- **Expected:** no "Category"/"Danh mục" column header; no
  `contactAdmin.form.category` text.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-003 — No attachments column

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (removed column)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open `/admin/contact`.
- **Expected:** no "Files"/"Tệp" column header.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-004 — The filter panel has no category or ticket filter

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (removed filters)
- **Preconditions:** list stubbed
- **Steps:**
  1. Open the Filters panel.
- **Expected:** "Status" is offered; "Category", "Danh mục", "Ticket Number",
  "Mã ticket" are not.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-006 — English list and detail id display

- **Requirement:** REQ-ADMCONTACT-01, REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** i18n (en)
- **Preconditions:** list and detail stubbed
- **Steps:**
  1. Open `/admin/contact`, then the detail.
- **Expected:** `012345...` in the list, no category / files columns, no
  `contactAdmin.admin.list` key; full id in the detail h2 and breadcrumb (not
  "Detail").
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-007 — Vietnamese list and detail id display

- **Requirement:** REQ-ADMCONTACT-01, REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** list and detail stubbed
- **Steps:**
  1. Open `/vi/admin/contact`, then the detail.
- **Expected:** as TC-ADMCONTACT-006 with "Danh mục"/"Tệp" absent and the
  breadcrumb not "Chi tiết".
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-010 — A filed request appears in the inbox as New

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (fresh request)
- **Preconditions:** one request filed by a guest with a reporter email
- **Steps:**
  1. Open `/admin/contact`.
- **Expected:** heading "Contact Requests"; columns Ticket, Email, Subject,
  Status, Date; the request's row shows its email, "New" and its short id.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-011 — Search by subject or email

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (subject fragment, email in upper case, no match with
  regex characters)
- **Preconditions:** own requests filed
- **Steps:**
  1. Type the tail of the subject into the search.
  2. Open `?search=<EMAIL IN CAPS>`.
  3. Open `?search=zzz-no-such-ticket-(.*)`, click "Clear filters".
- **Expected:** (1) URL gets `search=`, exactly that row is listed; (2) the
  request is listed; (3) "No contact requests found", then the list is back
  without `search=`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-012 — Status filter

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (new, processing, resolved)
- **Preconditions:** own request set to processing
- **Steps:**
  1. Open `?search=<subject>&status=` processing / new / resolved.
- **Expected:** listed (badge "Processing") only under processing; the empty
  state under the other two.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-013 — Email filter matches part of the address

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (partial local part)
- **Preconditions:** own request with a unique reporter email
- **Steps:**
  1. Open `?email=<local part>`.
- **Expected:** the request carries `email=`; exactly that row is listed.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-014 — Search and status combine

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (search × status)
- **Preconditions:** own request in status new
- **Steps:**
  1. Open `?search=<subject>&status=new`, then `…&status=resolved`.
- **Expected:** listed; empty state.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-015 — Panel status choice writes the URL; junk is dropped

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition (page 2 → filter → page 1), EP (invalid status)
- **Preconditions:** none
- **Steps:**
  1. Open `?status=closed&page=2`.
  2. Filters → Status → "Resolved".
- **Expected:** (1) the request has no `status`; (2) URL `status=resolved`,
  `page=1`, and the request carries `status=resolved`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-016 — A date-range preset sends a window

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP (preset today)
- **Preconditions:** none
- **Steps:**
  1. Filters → "Date range" → "Today".
- **Expected:** URL `dateRange=today`; the request carries `fromDate` and
  `toDate`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-017 — A row opens its request

- **Requirement:** REQ-ADMCONTACT-01, REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP
- **Preconditions:** own request
- **Steps:**
  1. Click the row link "View details for ticket <id>".
- **Expected:** URL `/admin/contact/<id>`; heading "Contact Detail"; the
  subject is shown.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-018 — A guest is sent to sign in

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (unauthenticated → /login)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/contact` without a session.
- **Expected:** the browser lands on `/login`.
- **Automated:** `tests/e2e/admin-contact/list.e2e.ts`

### TC-ADMCONTACT-030 — List API contract

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** EP
- **Preconditions:** one own request
- **Steps:**
  1. `GET /api/v1/admin/contacts`.
- **Expected:** 200 envelope; `meta` `{ page: 1, limit: 20, total, totalPages }`;
  the request is on page 1 with its subject, status `new`, priority `medium`;
  newest first; list items carry no `message`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMCONTACT-031 — List filters return exactly the matching requests

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Decision Table (search × status × email × priority × date)
- **Preconditions:** one own request in status processing with a unique email
- **Steps:**
  1. Filter by subject (as typed and upper case), email fragment, and each
     combination with a matching / non-matching status, priority and date
     window; search `.*`.
- **Expected:** matching combinations return exactly that request; any
  non-matching filter returns `[]`; `.*` returns `[]`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMCONTACT-032 — List query validation

- **Requirement:** REQ-ADMCONTACT-01
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** BVA (page 0/1, limit 0/1/100/101, search 200/201, fromDate >
  toDate), EP (status, priority, sortBy, dates)
- **Preconditions:** none
- **Steps:**
  1. Call the list with each value.
- **Expected:** valid values 200; invalid ones 400 `VALIDATION_ERROR`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMCONTACT-034 — Only admins reach the inbox endpoints

- **Requirement:** REQ-ADMCONTACT-01, REQ-ADMCONTACT-02, REQ-ADMCONTACT-03
- **Layer:** api · **Priority:** P1 · **Role:** guest, user
- **Technique:** Decision Table (role × endpoint)
- **Preconditions:** none (placeholder id)
- **Steps:**
  1. Call list, detail and status change without a token and with a user
     token.
- **Expected:** 401 `AUTH_MISSING_TOKEN`; 403 `AUTH_ADMIN_ONLY`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

## Detail — REQ-ADMCONTACT-02

### TC-ADMCONTACT-005 — Detail shows the full id in heading and breadcrumb

- **Requirement:** REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (24-hex id)
- **Preconditions:** detail stubbed
- **Steps:**
  1. Open `/admin/contact/0123456789abcdef01234567`.
- **Expected:** heading "Contact Detail"; h2 is the full id; the breadcrumb's
  last item is the full id (not "Detail"); no short id; no category field.
- **Automated:** `tests/e2e/admin-contact/display.e2e.ts`

### TC-ADMCONTACT-020 — Detail shows the request

- **Requirement:** REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** EP (request with email and a two-line message)
- **Preconditions:** own request
- **Steps:**
  1. Open its detail.
- **Expected:** h2 = full id; Email, Subject, Message, Updated At labels; the
  reporter email, subject and second message line; badge "New"; "No
  attachments"; breadcrumb link "Contact Inbox".
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMCONTACT-024 — Unknown and malformed ids

- **Requirement:** REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (unknown id, malformed id)
- **Preconditions:** none
- **Steps:**
  1. Open `/admin/contact/000000000000000000000000` and `/admin/contact/not-a-ticket`.
- **Expected:** toast "Contact request not found" / "Validation failed"; no
  detail card (no status select).
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMCONTACT-026 — Vietnamese detail and status update

- **Requirement:** REQ-ADMCONTACT-02, REQ-ADMCONTACT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** i18n (vi)
- **Preconditions:** own request
- **Steps:**
  1. Open `/vi/admin/contact/<id>`, set status "Đang xử lý".
- **Expected:** heading "Chi tiết liên hệ"; labels "Tiêu đề", "Tin nhắn",
  "Cập nhật lần cuối"; badge "Mới" then "Đang xử lý"; toast "Cập nhật trạng
  thái thành công"; no `contactAdmin.` key.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMCONTACT-027 — Detail shows who filed a signed-in request

- **Requirement:** REQ-ADMCONTACT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** EP (request with an owner)
- **Preconditions:** a request filed by `user@test.com` while signed in
- **Steps:**
  1. Open its detail.
- **Expected:** a "User ID" field with the submitter's id.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts` —
  `test.fail()`: **BUG** — the request stores `userId`, but
  `toContactDetailItemDto` drops it (and the card's "IP Address" field is
  always blank: no `ipAddress` is stored or returned).

### TC-ADMCONTACT-033 — Detail API contract and id errors

- **Requirement:** REQ-ADMCONTACT-02
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** EP, Error Guessing (malformed id, unknown id)
- **Preconditions:** own request with an email
- **Steps:**
  1. Read its detail; read `not-a-ticket` and `000000000000000000000000`.
- **Expected:** 200 with `_id`, subject, message, email, status `new`; 400
  `VALIDATION_ERROR`; 404 `CONTACT_NOT_FOUND`.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

## Status workflow — REQ-ADMCONTACT-03

### TC-ADMCONTACT-021 — new → processing → resolved

- **Requirement:** REQ-ADMCONTACT-03
- **Layer:** e2e · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (valid path)
- **Preconditions:** own request in status new
- **Steps:**
  1. On its detail, choose "Processing", then "Resolved".
  2. Search it in the list under `status=resolved`.
- **Expected:** each choice sends `PATCH …/status` `{ status }` → 200, toasts
  "Status updated successfully", updates the badge and announces "Status
  updated successfully."; the list shows "Resolved". The API test reads the
  state back after each step.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMCONTACT-022 — The select offers exactly the three states

- **Requirement:** REQ-ADMCONTACT-03
- **Layer:** e2e · **Priority:** P3 · **Role:** admin
- **Technique:** EP
- **Preconditions:** own request in status new
- **Steps:**
  1. Open the status select.
- **Expected:** it reads "New"; options New, Processing, Resolved in that
  order; New is selected.
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMCONTACT-023 — Invalid status changes are refused

- **Requirement:** REQ-ADMCONTACT-03
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (invalid targets), Error Guessing (unknown
  / malformed id)
- **Preconditions:** own request in status processing
- **Steps:**
  1. PATCH status `closed`, `NEW`, `""`, `null`, missing, `["resolved"]`.
  2. PATCH an unknown id and a malformed id.
- **Expected:** each invalid body → 400 `VALIDATION_ERROR` and the request is
  still `processing`; unknown id → 404 `CONTACT_NOT_FOUND`; malformed → 400.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`

### TC-ADMCONTACT-025 — A failed status change leaves the status as it was

- **Requirement:** REQ-ADMCONTACT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (5xx)
- **Preconditions:** own request; status PATCH stubbed to 500
- **Steps:**
  1. Choose "Processing"; reload.
- **Expected:** "Server error. Please try again later."; `#announcer` "Failed
  to update status."; after reload the badge still reads "New".
- **Automated:** `tests/e2e/admin-contact/detail-status.e2e.ts`

### TC-ADMCONTACT-028 — Reopening and skipping are accepted

- **Requirement:** REQ-ADMCONTACT-03
- **Layer:** api · **Priority:** P3 · **Role:** admin
- **Technique:** State Transition (resolved → new, new → resolved, new → new)
- **Preconditions:** own request in status new
- **Steps:**
  1. Set resolved (skipping processing), then new, then new again.
- **Expected:** every step 200 and persisted. Current behaviour: the workflow
  in REQ-ADMCONTACT-03 is not enforced by the server or the UI — the select
  offers all three states at all times. Recorded so a future guard is a
  deliberate change.
- **Automated:** `tests/api/admin-contact/contacts.api.ts`
