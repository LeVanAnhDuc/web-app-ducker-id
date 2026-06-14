# E2E — Admin Users List

Playwright FE E2E for the `GET /admin/users` admin list. Read-only feature → no data mutation, no revert needed.

**Test file:** `client/e2e/admin-users-list/admin-users-list.e2e.ts` (runs under the `admin` Playwright project / admin `storageState` — see CF-1).
**AuthZ deny (row 3):** `client/e2e/admin-authz/admin-authz.e2e.ts` (project `admin-authz` is planned; the file currently runs under `chromium` with user `storageState`). Cross-referenced here, not duplicated in the admin-users-list file.

This file is the scenario source-of-truth and is kept in sync with `design.md` §9 (E2E Scenario Matrix) and the test file. After the backfill it covers all 12 rubric groups (every applicable group has a ✅ scenario or an explicit N/A / DEFER / CF-blocked reason — no silent gaps).

## Run setup (worktree, isolated from the dev's :5000/:3000)

Because the feature lives on a worktree, the running main app (:5000 / :3000) may not have the endpoint. E2E runs against worktree servers:

- **Worktree BE** on `:5001` — `.env` copied from `server/.env` with `APP_PORT=5001`; same Mongo + Redis as main.
- **Worktree FE** on `:3101` — `.env.local` copied from `client/.env.local` with `API_SERVER_URL=http://localhost:5001`; started with `next dev` (webpack, not Turbopack — Turbopack fails to resolve `next` through a junctioned `node_modules`).
- **Auth:** `auth.setup.ts` logs in with the seeded admin (`E2E_USER_EMAIL=admin@test.com`, `E2E_USER_PASSWORD=Admin@123`) → admin `storageState`.

Command:
```bash
cd client/.worktrees/admin-users-list
E2E_BASE_URL=http://localhost:3101 \
E2E_USER_EMAIL=admin@test.com E2E_USER_PASSWORD=Admin@123 \
./node_modules/.bin/playwright test e2e/admin-users-list --project=admin --timeout=60000
```

**Seed reference:** `admin@test.com` (admin, active), `user@test.com` (user, active), `inactive@test.com` (user, `isActive=false`, never logged in).

## Scenarios

Filters/pagination are URL-driven (the table reads `search` / `role` / `status` / `page` from the query string), so tests drive them via `page.goto` query params — more robust than operating the comboboxes. `Gate` column: `A` = `yarn e2e` (deterministic, committed); `B` = MCP walk (visual/UX/console/network). Read-only feature → gate B verifies read/render only.

| # | Matrix row | Scenario (test name) | Technique | Gate | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 Happy path | `admin sees the user list populated from the API` | EP | A+B | ✅ covered |
| 2 | 1 Happy path | `table renders the expected column headers` (E1b) | EP | A+B | ✅ covered |
| 3 | 8 Data render | `renders localized badge labels and formatted dates, not raw values` (E8) | EP | A+B | ✅ covered |
| 4 | 2 AuthN | `unauthenticated visitor is redirected to /login (no list)` (E2) | EP | A+B | ✅ covered |
| 5 | 3 AuthZ deny | `non-admin is denied admin data at /admin/users` | DT | A+B | ✅ covered in `e2e/admin-authz/` (cross-ref) |
| 6 | 4 Validation | `non-numeric page param falls back to page 1` (E4a) | EP | A | ✅ covered |
| 7 | 4 Validation | `out-of-range limit is rejected by the API (400)` (E4b) | EP/BVA | A | ✅ covered |
| 8 | 4 Validation | `invalid role param is dropped by the FE guard` (E4c) | EP | A | ✅ covered |
| 9 | 5 Empty/null | `no-match search shows the empty state` (E5a) | EP | A+B | ✅ covered |
| 10 | 5 Empty/null | `a user that never logged in shows 'Never'` (E5b) | EP | A+B | ✅ covered |
| 11 | 6 Boundary | `limit boundary values are honored by the API` (E6a) | BVA | A | ✅ covered |
| 12 | 6 Boundary | `page param is wired to the API (page 2 ... empty)` (E6b) | BVA | A | ✅ covered |
| 13 | 6 Boundary | visible pager next/prev click-through (E6c) | BVA | A | ⏸ DEFER (seed-gated — see Known caveat) |
| 14 | 6 Boundary | sort toggle UI (E6d) | ST | — | N/A — no sort control in the UI (see below) |
| 15 | 7 Filter | `role filter narrows the list to admins only` | EP | A+B | ✅ covered |
| 16 | 7 Filter | `search narrows the list by email` | EP | A+B | ✅ covered |
| 17 | 7 Filter | `status=locked surfaces deactivated accounts` | EP | A+B | ✅ covered |
| 18 | 7 Filter | `combined role+status filter narrows correctly` (E7a) | DT | A+B | ✅ covered |
| 19 | 7 Filter | `filter state persists across a full page reload` (E7b) | ST | A+B | ✅ covered |
| 20 | 9 i18n | `localized list renders for /admin/users` + `/vi/admin/users` (E9) | DT | A+B | ✅ covered (en + vi, table-driven) |
| 21 | 10 Error | `API 500 surfaces a distinct error state` (E10) | EG | A+B | ✅ covered (CF-2 `role="alert"`) |
| 22 | 10 Loading | `shows the skeleton while the list is loading` (E10b) | — | A+B | ✅ covered |
| 23 | 11 Mutation safety | — | — | — | N/A — list read-only in scope |
| 24 | 12 a11y | `core landmarks expose accessible roles` (E11a) | EP | B | ✅ covered (+ a11y follow-up flagged) |
| 25 | 12 a11y | `list load is announced via #announcer` (E11b) | EP | B | ✅ covered (CF-4 announce) |
| 26 | 12 a11y | `keyboard focus reaches the toolbar search control` (E11c) | EP | B | ✅ covered (toolbar entry point) |

### Code-fix prerequisites (already landed — tests build on them)

- **CF-1** — `playwright.config.ts` routes the `admin-users-list/` suite under the `admin` project (admin `storageState`); AuthZ-deny tests live in `admin-authz/` (user `storageState`). Without CF-1 the suite would run under user `storageState` and the happy-path rows fail.
- **CF-2** — `AdminUsersTable` has an `isError` branch rendering `<p role="alert">` with `adminUsers.table.error` (en: "Could not load users. Please try again." / vi: "Không thể tải danh sách người dùng. Vui lòng thử lại."). Row 21 (E10) asserts this via a `page.route` 500 interception.
- **CF-4** — `AdminUsersTable` announces dynamic changes into `#announcer` via `useAnnounce` (`adminUsers.announce.{loading,loaded,navigating,error}`; en: "Loading users..." / "{total} users loaded" / "Navigating to page {page}" / "Could not load users. Please try again."). Row 25 (E11b) asserts the `#announcer` content matches `/\d+ users loaded/` after load.

## Known caveat — visible pager not exercised by E2E (DEFER, flagged, not silently capped)

The `AdminUsersTable` wires only the `page` query param to the API; it does **not** expose a page-size control, so the default `limit=20` always applies. The seed has <20 users, so everything fits on page 1 and `TablePagination` (which returns `null` when `totalPages <= 1`) stays hidden by design.

Consequently the **visible pager click-through (E6c) is deferred** — driving next/prev would require seeding >20 users (a persistent DB mutation, avoided for a read-only feature). Replacement coverage that does NOT need the extra seed:

- **E6a** asserts the `limit` boundaries (`limit=1` → `meta.limit===1`; `limit=100` → 200; `limit=101`/`-1` → 400 via E4b) at the API level.
- **E6b** asserts the `page` param genuinely reaches the API (page 2 of a single-page dataset is empty).

The pager rendering itself is the shared `TablePagination` component, already covered by the login-history admin table.

**Follow-up (optional):** seed a dedicated >20-user fixture (or add a page-size param) and assert next/prev navigation, plus the per-locale pagination labels (`Page/Trang`, `of//`, `users/người dùng`) which are only visible when `totalPages > 1`.

## Known caveat — no sort UI (E6d, N/A)

`sortBy` / `sortOrder` exist only in the API contract; the table headers are not clickable and there is no sort control. There is also an unresolved param-name drift (`order` ↔ `sortOrder`, design.md §10). No `[ST]` sort-toggle test is written until a sort UI lands and the drift is reconciled.

## a11y follow-up (flagged, not fixed — no app-code edits from tests)

The toolbar Role/Status `<Label>`s are not associated with their `Select` triggers (no `htmlFor` / `id`), and `CustomSelectTrigger` does not forward an `aria-label`, so the comboboxes have no accessible name. E11a therefore asserts the comboboxes by `role` (count) rather than by accessible name, and asserts the search control by its `aria-label` ("Search"). Note the search control is a `textbox` (CustomInput with `aria-label`), not a `searchbox` (it is not `type="search"`). Fixing the label association is a follow-up for the feature owners.
