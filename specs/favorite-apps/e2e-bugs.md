# E2E Dual-Gate — Bug Log (favorite-apps)

> Append-only. 1 entry per fail round (§4.3). All issues this feature were **environment / test-infra**, NOT app code — the shipped `src/` behavior passed once the harness was correct.

## Round 1 — 2026-06-15

- **Gate fail:** A (`yarn e2e e2e/favorite-apps`).
- **Scenario:** all setup hooks — `getFavoriteIds` / `setFavorites` → `GET /api/v1/users/me/favorites` returned **404**.
- **Triệu chứng:** favorites endpoint 404 on :5100; observed vs expected 200/401.
- **Root cause (systematic-debugging):** a **stale `e2e-followups` stack from a prior session was squatting ports :5100/:3100**. The probes/tests hit that old server (no favorite code) → 404. Confirmed: `/users/me` and `/apps` were 401 (mounted) but `/users/me/favorites` 404 on the squatting server; the favorite route IS wired in the worktree loader.
- **Fix:** `worktree.mjs down favorite-apps` + `down e2e-followups`, killed the port squatters, `up favorite-apps` clean. Verified `/users/me/favorites` → **401** (mounted) on the fresh stack. No code change.

## Round 2 — 2026-06-15

- **Gate fail:** A.
- **Scenario:** favorites helper `login()` → **429**; `auth.setup` login → `res.ok()` false.
- **Triệu chứng:** login rate-limited.
- **Root cause:** (a) `helpers/favorites.ts` logged in **fresh on every call** → exhausted BE login limit (`rate-limit:login:ip:` = 30/15min); (b) helper `BASE_URL` defaulted to `:3000` (process.env `E2E_BASE_URL` not propagated to workers) so its API calls hit the wrong server; (c) accumulated debug-run logins tripped the IP limiter.
- **Fix:** (1) cache the bearer token module-wide in `helpers/favorites.ts` (`withApi` logs in once, reuses); (2) run with `E2E_BASE_URL=http://localhost:3100`; (3) cleared `rate-limit:login*` Redis keys (targeted, login-IP limiter only). Test-code + env fixes; no app change. [[reference_e2e_auth_ratelimit_gotchas]]

## Round 3 — 2026-06-15

- **Gate fail:** A (1 test: "search filters … and clears").
- **Scenario:** `waitForFavorites` timed out after clearing the search box / clicking "All".
- **Triệu chứng:** `page.waitForResponse` 30s timeout.
- **Root cause:** clearing search / "All" reverts to the **initial React Query key**, served from cache within `staleTime` (5min) → **no network GET fires** → the response-wait hangs. (The "Notes"/"zzz" fills DO fetch — new search param.)
- **Fix:** in `favorites-page.e2e.ts`, after the revert-to-initial-key actions, assert the UI directly (Playwright auto-retry) instead of `waitForFavorites`. Test-assertion fix; no app change.

## Result

- **Gate A:** 18/18 passed (all matrix groups: happy, authN, empty, BVA, filter/search, data-render, i18n en+vi, mutation ST/idempotency, cross-page).
- **Gate B (MCP walk):** PASS — /apps render (en+vi aria-labels), toggle add `POST 201` + optimistic flip, cross-page sync, Vietnamese i18n (no key leaks), toggle remove `DELETE 204`, state reverted. 0 favorites-related console errors (only a pre-existing auth `token/refresh` 403, silent-handled, unrelated).
- **Conclusion:** dual-gate green in 3 rounds (≤3 limit). No app-code defects found.
