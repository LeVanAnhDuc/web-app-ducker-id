# E2E — Admin Users List

Playwright FE E2E for the `GET /admin/users` admin list. Read-only feature → no data mutation, no revert needed.

**Test file:** `client/e2e/admin-users-list/admin-users-list.e2e.ts`

## Run setup (worktree, isolated from the dev's :5000/:3000)

Because the feature lives on the `feat/admin-users-list` worktree, the running main app (:5000 / :3000) does not have the endpoint. E2E ran against worktree servers:

- **Worktree BE** on `:5001` — `.env` copied from `server/.env` with `APP_PORT=5001`; same Mongo + Redis as main.
- **Worktree FE** on `:3101` — `.env.local` copied from `client/.env.local` with `API_SERVER_URL=http://localhost:5001`; started with `next dev` (webpack, not Turbopack — Turbopack fails to resolve `next` through a junctioned `node_modules`).
- **Auth:** `auth.setup.ts` logged in with the seeded admin (`E2E_USER_EMAIL=admin@test.com`, `E2E_USER_PASSWORD=Admin@123`) → admin `storageState`.

Command:
```bash
cd client/.worktrees/admin-users-list
E2E_BASE_URL=http://localhost:3101 \
E2E_USER_EMAIL=admin@test.com E2E_USER_PASSWORD=Admin@123 \
./node_modules/.bin/playwright test e2e/admin-users-list --project=chromium --timeout=60000
```

Result: **6 passed** (1 setup + 5 scenarios).

## Scenarios

Filters are URL-driven (the table reads `search` / `role` / `status` / `page` from the query string), so tests drive them via `page.goto` query params — more robust than operating the comboboxes.

1. **List loads from the API** — admin opens `/admin/users`; table shows seeded accounts (`admin@test.com`, `user@test.com`).
2. **Role filter** — `?role=admin` → admin rows present, regular-user row (`user@test.com`) absent.
3. **Search** — `?search=inactive` → `inactive@test.com` present, `admin@test.com` absent.
4. **Status filter** — `?status=locked` → deactivated account (`inactive@test.com`, `isActive=false`) present.
5. **Page param wiring** — `?page=2` on a single-page dataset returns empty (admin row no longer shown), proving `page` flows from URL → API.

## Known caveat — visible pager not exercised by E2E (flagged, not silently capped)

The `AdminUsersTable` wires only the `page` query param to the API; it does **not** expose a page-size control, so the default `limit=20` always applies. The seed has <20 users, so everything fits on page 1 and `TablePagination` (which returns `null` when `totalPages <= 1`) stays hidden by design.

Consequently the **visible pager click-through is not E2E-verified** — doing so would require seeding >20 users (a persistent DB mutation, avoided for a read-only feature). Instead, scenario 5 verifies the `page` param genuinely reaches the API. The pager rendering itself is the shared `TablePagination` component already covered by the login-history admin table.

**Follow-up (optional):** if visible-pager E2E coverage is wanted, seed a dedicated >20-user fixture (or add a page-size param) and assert next/prev navigation.
