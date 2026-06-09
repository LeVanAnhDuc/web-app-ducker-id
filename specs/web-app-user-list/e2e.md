# E2E — `web-app-user-list` (`/vi/apps` catalog)

> Playwright, per CLAUDE.md §4.3. Test: `client/e2e/web-app-user-list/apps-list.e2e.ts`.
> Auth via global `e2e/auth.setup.ts` (seed user `user@test.com`). Read-only — no data mutation, nothing to revert.

## Preconditions

- App stack running + DB seeded (web-app seeder → 5 active apps: Blog, Analytics Dashboard, IDMS Portal, Notes, Operations Console; `team-calendar` is inactive and must NOT appear). Role-scoped: a `user`-role account sees 3 (Blog, IDMS Portal, Notes); `Analytics Dashboard` and `Operations Console` are admin-only.
- `E2E_BASE_URL` points at the FE under test. When verifying worktree changes, run the worktree BE + FE on alternate ports (e.g. BE `APP_PORT=5001`, FE `--port 3101` with `API_SERVER_URL=http://localhost:5001`) and set `E2E_BASE_URL=http://localhost:3101` — the main `:3000`/`:5000` stack serves `origin/main` and lacks the endpoint.

## Scenarios

1. **Renders role-permitted active apps** — navigate to `/vi/apps`; a `GET /api/v1/apps` 200 fires. The auth user (`user@test.com`, role `user`) sees only apps whose `requiredRoles` include `user`: `Blog`, `IDMS Portal`, `Notes` (exactly 3 "Open"/"Mở" buttons). Admin-only `Analytics Dashboard` and `Operations Console` are **not** present; inactive `team-calendar` is also absent.
2. **Server-side search** — typing `Notes` in the search box triggers a debounced (300ms) `GET /api/v1/apps?...search=Notes`; only `Notes` remains, `Blog` is removed; clearing the box restores `Blog`.
3. **Open launches homeUrl** — the `Open` button for `Blog` calls `window.open(homeUrl, "_blank", "noopener,noreferrer")`; test stubs `window.open` to capture the URL (avoids navigating to the placeholder external host) and asserts `https://blog.example.com`.

## Notes / follow-ups

- Pagination control is not exercised: a `user`-role account sees only 3 apps (< page size 12 → single page). A pagination scenario needs >12 user-visible active apps seeded.
- Locale is `vi` (path `/vi/apps`) → assertions use Vietnamese labels ("Mở", "Tìm ứng dụng…").
- Selectors use role/name (headings, buttons, textbox); no app code was modified for testability.
