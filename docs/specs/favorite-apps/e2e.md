# E2E — Favorite Apps

> Feature: `favorite-apps` · FE behavior: favorite toggle on Apps catalog + Home + Favorites page, backed by `GET/POST/DELETE /users/me/favorites` and `isFavorite` on `GET /apps`.
> Suite: `client/e2e/favorite-apps/*.e2e.ts` · Helper: `client/e2e/helpers/favorites.ts`
> Auth: global `auth.setup.ts` → `e2e/.auth/user.json` storageState (seed user `user@test.com`, `user` role).

This document is the source-of-truth scenario list expanded from the design.md §6 Scenario Matrix (13 groups). Gate column: `A+B` = exercised by the committed Playwright suite (gate A) and safe for the MCP read/render walk (gate B); `A only` = mutation-heavy / persistence / idempotency / API-level — verified by gate A and NOT hammered in parallel by gate B to avoid session/state contamination (`reference_e2e_suite_session_contamination`).

## Test data (server seeder `data/web-apps.ts`)

User-visible ACTIVE apps for the `user` role: **Blog**, **IDMS Portal**, **Notes**. Admin-only (hidden): Analytics Dashboard, Operations Console. Inactive (hidden): Team Calendar. There is **no favorites seeder** → the seed user starts with **zero favorites**; the helper snapshots the user's favorites in `beforeAll` and restores that exact set in `afterAll` (idempotent — `setFavorites` removes extras + adds missing), so shared user state stays clean.

## Scenarios

| # | Scenario | Group | Gate | File |
|---|----------|-------|------|------|
| 1 | `/apps` heart toggles outline → filled (POST 201), aria-pressed flips | 1 happy, 8 data-render | A+B | `toggle.e2e.ts` |
| 2 | Toggled favorite persists across `/apps` reload (isFavorite=true), and outline persists after un-toggle | 11 mutation/ST | A only | `toggle.e2e.ts` |
| 3 | Double-click rapidly → no error, deterministic end state after reload (idempotent POST/DELETE) | 11 mutation/ST | A only | `toggle.e2e.ts` |
| 4 | Favorite on `/apps` → appears on `/favorites`; unfavorite there → heart outline back on `/apps` | 13 cross-page/ST | A only | `toggle.e2e.ts` |
| 5 | `/favorites` lists multiple favorited apps (grid) | 1 happy | A+B | `favorites-page.e2e.ts` |
| 6 | Zero favorites → empty state "You haven't favorited any apps yet." | 5 empty, 6 BVA(0) | A+B | `favorites-page.e2e.ts` |
| 7 | Exactly one favorite → single card, no other user app present | 6 BVA(1) | A+B | `favorites-page.e2e.ts` |
| 8 | Search match / no-match (empty) / clear → re-list | 7 filter/search | A+B | `favorites-page.e2e.ts` |
| 9 | Category chip filters; "All" chip resets (aria-pressed) | 7 filter/search | A+B | `favorites-page.e2e.ts` |
| 10 | Sort Recent (favorited order) vs Name (alphabetical) ordering | 7 / sort | A+B | `favorites-page.e2e.ts` |
| 11 | Toggle heart off on `/favorites` → card disappears (optimistic), other stays | 1 / mutation | A only | `favorites-page.e2e.ts` |
| 12 | `/apps` heart aria-label localized en ("Add to favorites: Blog") + vi ("Thêm vào yêu thích: Blog") | 9 i18n | A+B | `i18n.e2e.ts` |
| 13 | `/favorites` chrome localized: search placeholder + sort label + sort items (Recent/Name ↔ Gần đây/Tên) en + vi | 9 i18n | A+B | `i18n.e2e.ts` |
| 14 | `/favorites` empty state localized en + vi | 9 i18n, 5 empty | A+B | `i18n.e2e.ts` |
| 15 | No raw i18n key (e.g. `favorites.card.add`, `apps.card.`) leaks into rendered DOM | 9 i18n (missing-message) | A+B | `i18n.e2e.ts` |
| 16 | Unauthenticated visit to `/favorites` → gated to login screen (clean context) | 2 authN | A+B | `auth.e2e.ts` |

### Boundary technique tags (design.md §6)

- **BVA** (group 6): favorites count `0` (#6) · `1` (#7) · `many` (#5). Pagination N/A — favorites are not paginated this round (design §8 Q1).
- **DT** (group 7): search × category combinations covered across #8/#9 (search-only, category-only, "All" reset, no-match → empty).
- **ST** (groups 11, 13): toggle on→reload persists (#2); double-click idempotent (#3); cross-page favorite/unfavorite consistency (#4).
- **EP** (group 4 — see deferred): appId param valid/malformed/non-existent/inactive is API-level.

## Deferred / follow-up gaps (no silent gaps)

| Group | What | Why deferred | Where covered instead |
|-------|------|--------------|------------------------|
| 2 authN (API) | `GET/POST/DELETE /users/me/favorites` without token → 401 | No FE UI path issues a tokenless favorites request — the FavoriteButton only renders inside the authed app shell. `page.request` does not carry the Bearer token, so an FE-driven 401 assertion would test the proxy, not the feature. | BE integration tests / Gate-A API suite (`server/`). UI authN gate IS covered (#16). |
| 3 authZ | POST app admin-only / inactive → 404; admin `/admin/apps` has no heart; user only favorites in-catalog apps | Mutation-heavy (`A only`) and not reachable via the user UI — the catalog never renders a heart for an app outside the user's role, so there is no UI affordance to drive a 404. | BE `AppFavoritableGuard.assert` unit/integration tests (design §7). Admin pages excluded from the favorites feature by design. |
| 4 validation | `appId` malformed → 400; valid-but-missing → 404; inactive → 404; GET `sort`/`categoryId` invalid → 400/default | API contract validation; no manual FE form exposes a raw `appId`/`sort` string (sort is a fixed dropdown, categories come from the API). | BE validator tests (`favoriteAppIdParamSchema`, `listFavoritesQuerySchema`, design §7). |
| 10 error/loading | Toggle POST/DELETE 5xx → optimistic rollback + `toast.error` + announce; `GET /favorites` 5xx → error UI; loading skeleton | `A only` (mutation-heavy) and requires `page.route` 5xx injection. Left to Gate-A determinism rather than the live MCP walk (gate B login uses a separate auth context and must not race mutations on the shared user). The error path is well-isolated FE logic (`useToggleFavorite.onError` rollback). | Recommended Gate-A follow-up via `page.route` intercept (pattern: `notifications.e2e.ts` scenario 8). Not yet authored — flagged here. |
| 12 a11y (focus mgmt) | After optimistic remove on `/favorites`, focus moves to grid/next control (not lost to `<body>`) | The current FavoriteButton/grid does not implement explicit focus management on card removal; asserting it would test unimplemented behavior. aria-pressed + keyboard focusability ARE implicit (role-based selectors, `CustomButton`). | Flagged as an **app-code follow-up** (do not modify app code from tests). aria-pressed/label coverage is implicit across #1/#12/#13. |

## Gate-B (MCP walk) guidance

Gate B walks the **read/render** surface in a separate auth context: open `/apps`, `/favorites`, `/` in en + vi; verify hearts render with correct aria-pressed/aria-label, the empty/list states render, search + category + sort chrome is present and localized. Gate B performs **at most one** toggle (single add+remove on Blog) to avoid contaminating the shared user state that the `A only` mutation/persistence tests depend on; rows marked `A only` (#2, #3, #4, #11) are NOT exercised in parallel by gate B.

## Notes / preconditions

- App stack must be running (BE :5000, FE :3000 or worktree port, Mongo, Redis) and seeded (`cd server && yarn seed`). The helper reaches the API via the proxy `baseURL`, logging in fresh (the page storageState cookie is not reusable from a bare request context — `reference_worktree_missing_env`, `helpers/notifications.ts`).
- Suites that mutate favorites run `serial` and self-revert in `afterAll` to the snapshot captured in `beforeAll`.
- Locale switch is URL-prefix based (next-intl `as-needed`): en = no prefix, vi = `/vi` prefix.
