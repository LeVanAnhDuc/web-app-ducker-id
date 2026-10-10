# SUPPORT — test cases

Submitting a support request from the support dialog (guest and signed in),
the user's own list at `/contacts/me` with ticket id and status, and the
read-only detail page (REQ-SUPPORT-01…03).

Source of truth: `client/src/components/SupportDialog/**`, `client/src/components/UserMenu`,
`client/src/views/Logins/LoginAlternative/mains/LoginOptionContactAdmin`,
`client/src/views/{MyContacts,MyContactDetail}/**`, `client/src/components/ShortId`,
`client/src/locales/{en,vi}/{support,contactAdmin,common}.json`,
`server/src/modules/contact-admin/**`, `server/src/validators/schemas/contact-admin.ts`.
Converted from `docs/specs/my-contacts/e2e.md` (matrix rows 1–12) and the
user side of `docs/specs/contact-ticket-id-display/e2e.md` (its deferred row 11,
the ticket code on the success screen, is now TC-SUPPORT-030).

**Test data.** The list and detail cases read the three sample requests the
seeder attaches to `user@test.com` (one per status). Every request a spec
files has a subject under `E2E support request` (or the older `E2E MyContacts
submit`) and is deleted in `afterAll` (`helpers/support.ts`); requests are not
covered by the throwaway-account cleanup. Signed-in submits other than the
one legacy list case use throwaway accounts signed into the browser.

**Server facts the cases rely on.** `POST /contact/submit` is public
(`optionalAuthGuard`: a valid token attaches `userId`, a bad token is
rejected), rate limited to 5 per IP per 15 minutes; subject 5…200 and message
20…5000 characters after sanitising; email optional. `GET /contacts` and
`/contacts/:id` are owner-scoped — another user's or a guest's request is 404,
never 403. Client: zod mirrors the length rules; a signed-in user's email is
read-only, a guest's is pre-filled from the login screen; the success view
shows the id as a ShortId (`first 6 hex + "..."`).

### TC-SUPPORT-001 — My Requests lists own requests and opens the detail

- **Requirement:** REQ-SUPPORT-02, REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path
- **Preconditions:** seeded sample requests
- **Steps:**
  1. Open `/contacts/me`; click a row.
- **Expected:** ShortId ticket, subject, "New" badge, "High" priority, a
  `<time>`; the row opens `/contacts/me/<id>` with "Request Detail" and no
  status control.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-002 — A guest is sent to login

- **Requirement:** REQ-SUPPORT-02, REQ-AUTHZ-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no session)
- **Preconditions:** none
- **Steps:**
  1. Open `/contacts/me`.
- **Expected:** URL `/login`.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-003 — The list endpoint without a token

- **Requirement:** REQ-SUPPORT-02
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (no token)
- **Preconditions:** none
- **Steps:**
  1. `GET /api/v1/contacts` without a token.
- **Expected:** 401.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-004 — Guest and other users' requests never appear

- **Requirement:** REQ-SUPPORT-02, REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Error Guessing (data leak)
- **Preconditions:** seeded guest request "Cannot login with Google OAuth"
- **Steps:**
  1. Open `/contacts/me`.
- **Expected:** own requests shown; the guest request absent.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-005 — Tampered status / page params are sanitised

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** EP (`status=xyz`, `page=abc`)
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `?status=xyz`, then `?page=abc`.
- **Expected:** the unfiltered table renders both times.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-006 — No-match search and Clear filters

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (no match), State Transition (cleared)
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `?search=zzznomatch99999`; click "Clear filters".
- **Expected:** empty state with "Clear filters"; afterwards no `search` and the list is back.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-007 — Page boundaries in the URL

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** BVA (page 0, -1, 9999)
- **Preconditions:** seeded requests (one page)
- **Steps:**
  1. Open `?page=0`, `?page=-1`, `?page=9999`.
- **Expected:** 0 and -1 render page 1; 9999 settles on a table or empty state, no crash.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-008 — Status filter

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (status = resolved)
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `?status=resolved`.
- **Expected:** only the resolved sample.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-009 — Search by subject, persisted in the URL

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (partial match)
- **Preconditions:** seeded requests
- **Steps:**
  1. Type "dark mode".
- **Expected:** `search=dark` in the URL after the debounce; only the dark-mode request.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-010 — Status and search combine

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Decision Table (status × search)
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `?status=processing&search=billing`.
- **Expected:** only the billing request.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-011 — Filters survive a reload

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (URL state across reload)
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `?search=billing&status=processing`; reload.
- **Expected:** both params and the row stay.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-012 — Status badge and date are rendered for people

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (raw enum / ISO)
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `?status=new`; read the date column.
- **Expected:** "New", never the bare "new"; the date is not an ISO timestamp.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-013 — The ticket id is the ShortId form

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** specification check
- **Preconditions:** seeded requests
- **Steps:**
  1. Open `/contacts/me`.
- **Expected:** ticket cells match `^[0-9a-f]{6}\.\.\.$`, never a 24-hex id.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-014 — My Requests in English

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en)
- **Preconditions:** none
- **Steps:**
  1. Open `/contacts/me`.
- **Expected:** "My Requests", column "Ticket", "Submit new request"; no `[contactAdmin.` key.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-015 — My Requests in Vietnamese

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/contacts/me`.
- **Expected:** "Yêu cầu của tôi", "Mã ticket", "Gửi yêu cầu mới"; no raw key.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-016 — Loading skeleton and a failing list

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (loading → loaded), Error Guessing (5xx)
- **Preconditions:** list delayed / stubbed with 500
- **Steps:**
  1. Open the page with a delayed response; then with a 500.
- **Expected:** a pulse skeleton, then data; after retries the page settles on
  the empty state without crashing.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-017 — A request submitted from My Requests appears in the list

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** State Transition (form → success → list refetch)
- **Preconditions:** none (the request is deleted in afterAll)
- **Steps:**
  1. "Submit new request", fill subject and message, send, close.
- **Expected:** a ShortId on the success view; the new subject is listed.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-018 — My Requests accessibility

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y
- **Preconditions:** seeded requests
- **Steps:**
  1. Check search and Filters names, focus a row link, read the badge, open/Escape Filters.
- **Expected:** named controls; focusable "View details for ticket …"; text
  badge; Escape closes the popover.
- **Automated:** `tests/e2e/support/my-requests-list.e2e.ts`

### TC-SUPPORT-019 — The detail page is read-only

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** happy path
- **Preconditions:** an own request (read via the API)
- **Steps:**
  1. Open `/contacts/me/<id>`.
- **Expected:** title, subject, "Message", a date, breadcrumb; no status
  combobox or update button.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-020 — A request owned by nobody else is not reachable

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** Error Guessing (IDOR)
- **Preconditions:** a fresh guest request
- **Steps:**
  1. Open `/contacts/me/<guest id>`; `GET /api/v1/contacts/<guest id>` with the user's token.
- **Expected:** "This request could not be found." and none of its content; API 404.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-021 — Absent and malformed ids render not-found

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (well-formed absent id / malformed id)
- **Preconditions:** none
- **Steps:**
  1. Open `/contacts/me/ffff…ffff`, then `/contacts/me/not-a-valid-object-id`.
- **Expected:** the not-found alert both times, no crash.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-022 — Detail page in English and Vietnamese

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (en + vi)
- **Preconditions:** an own request
- **Steps:**
  1. Open the detail at `/` and `/vi`.
- **Expected:** "Request Detail" / "My Requests" / "Message"; "Chi tiết yêu
  cầu" / "Yêu cầu của tôi" / "Tin nhắn"; no raw key.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-023 — Not-found in Vietnamese

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/contacts/me/ffff…ffff`.
- **Expected:** "Không tìm thấy yêu cầu này."
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-024 — Detail accessibility

- **Requirement:** REQ-SUPPORT-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** a11y
- **Preconditions:** an own request
- **Steps:**
  1. Check headings, focus the breadcrumb link, open an absent id.
- **Expected:** page title then an h2; the breadcrumb link takes focus; the
  not-found state is a `role=alert`.
- **Automated:** `tests/e2e/support/my-request-detail.e2e.ts`

### TC-SUPPORT-030 — A guest submits from the support dialog

- **Requirement:** REQ-SUPPORT-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** happy path, State Transition (form → success)
- **Preconditions:** a throwaway address
- **Steps:**
  1. `/login/alternative?email=<address>` → "Contact administrator"; fill
     subject and message; "Send request".
- **Expected:** the email is pre-filled and editable ("Email pre-filled —
  change it if needed."); POST → 201; "Thanks for reaching out", "Request
  code" and the ShortId of the returned id.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-031 — A signed-in user submits from the user menu

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P1 · **Role:** throwaway user
- **Technique:** happy path, State Transition (dialog → list)
- **Preconditions:** throwaway account signed into the browser
- **Steps:**
  1. User menu → "Support"; fill; send; close; open `/contacts/me`.
- **Expected:** the email is the account's and read-only ("We'll reply to
  your account email."); a ShortId; the request is the only row of My Requests.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-032 — Message length rules and exact minimums

- **Requirement:** REQ-SUPPORT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (message 0 / 19 / 20, subject 5)
- **Preconditions:** none (the accepted case stubs the POST)
- **Steps:**
  1. Send with an empty and a 19-character message; then 5 / 20 characters.
- **Expected:** "Please enter message" / "Message must be at least 20
  characters", `aria-invalid="true"`, nothing sent; at the minimums the
  counter reads "20 characters" and the success view appears.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-033 — Submit another and close

- **Requirement:** REQ-SUPPORT-01
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** State Transition (success → form → closed)
- **Preconditions:** POST stubbed
- **Steps:**
  1. Submit; "Submit another request"; Escape.
- **Expected:** an empty form; the dialog closes.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-034 — A rate-limited submit keeps the form and says why

- **Requirement:** REQ-SUPPORT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (429)
- **Preconditions:** POST stubbed with 429
- **Steps:**
  1. Submit.
- **Expected:** `#announcer` reads "Too many requests. Please wait before
  trying again."; the subject is kept; no success view.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-035 — The dialog in Vietnamese

- **Requirement:** REQ-SUPPORT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** i18n (vi)
- **Preconditions:** none
- **Steps:**
  1. `/vi/login/alternative?email=…` → "Liên hệ quản trị viên".
- **Expected:** dialog "Liên hệ hỗ trợ" with "Email phản hồi", "Tiêu đề",
  "Mô tả chi tiết", "Tối thiểu 20 ký tự", "Gửi yêu cầu"; no raw key.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-036 — Subject length errors are shown

- **Requirement:** REQ-SUPPORT-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (subject 0 / 4 / 201)
- **Preconditions:** none
- **Steps:**
  1. Send with each invalid subject and a valid message.
- **Expected:** nothing is sent and "Please enter subject" / "Subject must be
  at least 5 characters" / "Subject must not exceed 200 characters" is shown.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts` — marked
  `test.fail()`: **app bug**, the submit is blocked silently — `SubjectField`
  is not a `FormField`, so its zod error never renders and the input keeps
  `aria-invalid="false"`; only focus moves to the field.

### TC-SUPPORT-037 — An account with no requests sees the empty state

- **Requirement:** REQ-SUPPORT-02
- **Layer:** e2e · **Priority:** P3 · **Role:** throwaway user
- **Technique:** BVA (0 requests)
- **Preconditions:** a fresh account signed into the browser
- **Steps:**
  1. Open `/contacts/me`; click "Submit new request".
- **Expected:** "No requests submitted yet", no table and no "Clear filters";
  the support dialog opens.
- **Automated:** `tests/e2e/support/support-dialog.e2e.ts`

### TC-SUPPORT-040 — A guest submit is accepted and owned by nobody

- **Requirement:** REQ-SUPPORT-01
- **Layer:** api · **Priority:** P1 · **Role:** guest, user
- **Technique:** EP (guest)
- **Preconditions:** none
- **Steps:**
  1. POST with subject, message and email; GET the id as the seeded user.
- **Expected:** 201, a 24-hex id, status "new", the email echoed; 404 for the user.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-041 — A signed-in submit is attached to the caller

- **Requirement:** REQ-SUPPORT-01, REQ-SUPPORT-02
- **Layer:** api · **Priority:** P1 · **Role:** throwaway user
- **Technique:** State Transition (submit → list → detail)
- **Preconditions:** fresh account
- **Steps:**
  1. POST with a token; list; GET the id.
- **Expected:** 201; the list is exactly that request (total 1); the detail returns it.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-042 — Submit validation boundaries

- **Requirement:** REQ-SUPPORT-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (subject 4 / 5 / 200 / 201, message 19 / 20 / 5000 / 5001), EP (missing fields, invalid / empty email, whitespace subject)
- **Preconditions:** none
- **Steps:**
  1. POST each body.
- **Expected:** 4, 201, 19, 5001 chars, missing fields, invalid email and a
  whitespace-only subject → 400 with a `code`; 5, 200, 20, 5000 and an empty
  email → 201.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-043 — Submits are rate limited per IP

- **Requirement:** REQ-SUPPORT-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (5th / 6th request)
- **Preconditions:** rate-limit counters cleared at the start (`keepRateLimits`)
- **Steps:**
  1. POST six valid requests.
- **Expected:** five 201s, then 429 with an error `code`.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-044 — My-requests paging, filters and validation

- **Requirement:** REQ-SUPPORT-02
- **Layer:** api · **Priority:** P2 · **Role:** throwaway user
- **Technique:** BVA (limit 2 over 3 rows: pages 1 / 2 / 3), EP (status, search, invalid params)
- **Preconditions:** three own requests
- **Steps:**
  1. Page through; filter `status=new|resolved`; search one subject; invalid values.
- **Expected:** 2 + 1 + 0 rows, total 3 / 2 pages; new = 3, resolved = 0; the
  search returns exactly one; page 0, limit 0 / 101, unknown status / sortBy /
  sortOrder and a 201-character search → 400.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-045 — Another user's request is not listed or reachable

- **Requirement:** REQ-SUPPORT-03
- **Layer:** api · **Priority:** P1 · **Role:** two throwaway users
- **Technique:** Error Guessing (IDOR), EP (malformed / unknown id)
- **Preconditions:** Alice has one request
- **Steps:**
  1. Bob lists, GETs Alice's id, a malformed id, an unknown id, and the admin inbox.
- **Expected:** empty list; 404 without Alice's content; 400; 404; 403.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-046 — My requests need a session; submitting does not

- **Requirement:** REQ-SUPPORT-02, REQ-AUTHZ-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Decision Table (endpoint × token none / garbage)
- **Preconditions:** none
- **Steps:**
  1. GET list and detail without a token; POST submit with `Bearer garbage`.
- **Expected:** 401, 401; the garbage token is rejected (401 / 403), not treated as a guest.
- **Automated:** `tests/api/support/contact.api.ts`

### TC-SUPPORT-047 — The own-request detail contract

- **Requirement:** REQ-SUPPORT-03
- **Layer:** api · **Priority:** P3 · **Role:** throwaway user
- **Technique:** specification check
- **Preconditions:** one own request
- **Steps:**
  1. GET `/contacts/<id>`.
- **Expected:** `_id`, subject, message, status "new", a priority of
  low / medium / high and a valid `createdAt`.
- **Automated:** `tests/api/support/contact.api.ts`
