# E2E — contact-ticket-id-display

Test file: `client/e2e/contact/contact-display.e2e.ts` (runs under the Playwright `admin` project, admin storageState, dependency `admin-setup`). All API calls are stubbed via `page.route` with deterministic fixtures — no DB read/write, no revert needed.

Gate: **A+B** for all covered scenarios below (per `design.md` matrix, none of the covered rows here are mutation-heavy — the mutation-heavy row 11 is deferred, see below).

## Covered scenarios (maps to design.md E2E Scenario Matrix rows 1, 4, 5, 7, 8, 9, 12)

- **Row 1 (Happy) + Row 8 (Data rendering)** — `list renders the ShortId ticket cell, not empty and not the full id`: admin opens `/admin/contact` (stubbed list with `_id = "0123456789abcdef01234567"`); the ticket cell text matches `/^[0-9a-f]{6}\.\.\.$/` and equals `"012345..."`; the full 24-char `_id` never appears verbatim on the page.
- **Row 4 (Validation/removal) + Row 8 (Data rendering)** — `list has no category column header and no leaked i18n key`: no `columnheader` matching `/category|danh mục/i`; the leaked key literal `contactAdmin.form.category` is absent.
- **Row 7 (Filter/search removed)** — `filter panel has no category filter and no ticket-number filter`: opens the Filters popover; asserts the Status filter (retained) is visible while `"Category"`/`"Danh mục"` and `"Ticket Number"`/`"Mã ticket"` filter labels are absent. (A11y note: filter labels have no `htmlFor`/id linkage to their control — see follow-up below — so this asserts on visible text rather than `getByLabel`.)
- **Row 1/8 (Detail)** — `detail page renders the ShortId ticket and has no category field`: navigates to `/admin/contact/0123456789abcdef01234567` (stubbed detail); the "Contact Detail" heading is visible; the ShortId header text is `"012345..."`; no `/category|danh mục/i` text anywhere in the detail card.
- **Row 9 (i18n, en+vi)** — two tests, `en locale: ...` and `vi locale: ...`: repeat the ticket-renders-correctly + category-absent assertions for both `/admin/contact` (en, default) and `/vi/admin/contact` (vi); additionally assert no missing-message / raw-namespace-key leak (`contactAdmin.admin.list...`) appears.
- **Row 12 (Accessibility)** — covered implicitly: `ShortId` renders as a `<span class="font-mono" title="<full _id>">` (title carries the full id for hover/screen-reader access per design), and the table header keeps `scope="col"` (unchanged, verified by the column-header role query in the category-removal test still resolving other headers correctly).

## N/A rows (per design.md, unchanged by this fix)

- **Row 6 (Boundary/pagination)** — pagination/sort logic is untouched by this change (only the ticket cell render + filter/category removal changed).
- **Row 10 (Error/loading)** — list/detail skeleton and error UI are untouched by this change; already covered by other suites (e.g. `admin-login-history` pattern) and not re-verified here.

## Deferred scenario

- **Row 11 (Mutation safety — support-form success ShortId)** — DEFERRED. Reason: submitting the public support form creates a persistent `contacts` document (no stub-only path in the real submit flow) and repeated submissions would hit the BE's contact-creation rate limit, making the test flaky/destructive in a shared environment. This is covered instead by: (a) TypeScript type-safety on the success-view props (build-time), and (b) manual verification / a render-only Gate B (MCP) walk of the success screen without submitting through the mutation path repeatedly. Follow-up: if a stubbed-submit test harness becomes available (e.g. mocking the mutation hook rather than the network), promote this to an automated case.

## Gate assignment

All 6 automated tests in `contact-display.e2e.ts` run under **Gate A** (`yarn e2e contact/`) and are also walkable under **Gate B** (MCP browser walk) since none mutate data — matches the matrix's `A+B` designation for rows 1, 4, 5, 7, 8, 9, 12. Row 11 is excluded from both automated gates per the deferral above; Gate B may still render-only visually spot-check the success screen without submitting.

## A11y follow-ups flagged (not fixed — no app code changed)

1. `ShortId` exposes the full `_id` only via the `title` attribute (mouse-hover tooltip). Keyboard/screen-reader users have no equivalent affordance to discover the full id. Consider adding an `aria-label` with the full id.
2. `ListFilterPanel` renders filter labels as shadcn `<Label>` without `htmlFor`/`id` linkage to their control (select/input) — filters are not programmatically associated with their labels, so `page.getByLabel(...)` cannot resolve them and screen readers won't announce the label on focus. Consider wiring `htmlFor`/`id` or `aria-labelledby`.

## Delta — contact-detail-fullid-cleanup

Follow-up branch to this feature. Full design/rationale: `specs/contact-detail-fullid-cleanup/design.md`. Summary of behavior changes (test file unchanged in location, `client/e2e/contact/contact-display.e2e.ts`, reconciled in place — no new file):

- **Detail card header now shows the FULL `_id`** (24-hex), not the `ShortId` truncated form. `ContactDetailCard`'s `<h2>` renders `contact._id` verbatim. Test: `detail page renders the FULL ticket id in the card heading, breadcrumb shows full id, and has no category field` asserts `getByRole("heading", { level: 2, name: VALID_ID })` is visible and no `ShortId`-pattern text (`/^[0-9a-f]{6}\.\.\.$/`) remains on the detail page.
- **Breadcrumb current (last) item now shows the FULL `_id`** instead of the translated "Detail"/"Chi tiết" label — `buildAdminContactDetailBreadcrumb(id)` sets the current item's `label` directly to the raw `id`, bypassing the `contactAdmin.admin.detail.breadcrumb` namespace for that segment. Test asserts the breadcrumb nav (`getByRole("navigation", { name: "breadcrumb" })`) contains the exact full id and not `/detail|chi tiết/i`. (Note: Playwright's `getByRole(role, { current: "page" })` filter did not narrow to the `aria-current="page"` element on the `role="link"` span in this Playwright version — worked around by scoping to the breadcrumb landmark + exact text instead of fixing/avoiding via app code.)
- **Admin list table no longer has a "Files"/"Tệp" (attachments) column** — `AdminContactTable`'s `<TableHeader>` row is Ticket / Email / Subject / Status / Date / Actions only. New test `list has no Files/attachments column header` asserts `getByRole("columnheader", { name: /files|tệp/i })` has count 0; also added to both the en and vi locale loop tests.
- **Unchanged / still passing**: list ticket cell still renders the shortened `ShortId` (`/^[0-9a-f]{6}\.\.\.$/`), category column/filter still absent, no leaked i18n key.
- Both locales (en `/admin/contact(/:id)` and vi `/vi/admin/contact(/:id)`) verify the breadcrumb full id and Files-column absence, consistent with the existing en/vi loop structure in this suite.
- Gate A (`yarn e2e contact/`): 8/8 passed after reconciliation.
