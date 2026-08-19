# Design — Unify pagination default size to 20

## Goal

Make the **default page size = 20** consistent across **every FE table/list** and **every BE paginated endpoint**, so user-facing lists and server defaults agree. Consolidate scattered literals into the single source of truth on each side.

## Current state (audit)

### Backend (`server/src`)
- `common/pagination/index.ts` → `PAGINATION.DEFAULT_LIMIT = 20` ✅ (drives admin-users, login-history, contacts, notifications)
- `modules/web-app/constants/index.ts` → `WEB_APP_PAGINATION = { ...PAGINATION, DEFAULT_LIMIT: 12 }` ⚠️ — the only divergence; consumed only by `web-app.service.ts#listUserApps`.
- All validators clamp with `LIMIT_MAX = 100` (= `MAX_LIMIT`); no defaults there. **Unchanged.**

### Frontend (`client/src`)
- `constants/list.ts` → `CONSTANTS.LIST.DEFAULT_PAGE_SIZE = 12` ⚠️ (drives Apps catalog grid + skeleton)
- `views/LoginHistory/.../LoginHistoryTable` → hardcoded `limit: 10` ⚠️
- `views/AdminLoginHistory/.../AdminLoginHistoryTable` → hardcoded `limit: 20`
- `views/AdminContact/.../AdminContactTable` → local `const DEFAULT_PAGE_SIZE = 20`
- `views/Notifications/hooks/useNotifications` → local `const PAGE_SIZE = 20` (infinite query)
- `views/Apps/.../AppsBoard` → already uses `CONSTANTS.LIST.DEFAULT_PAGE_SIZE`
- AdminUsers table passes no `limit` → inherits BE default (20). **Unchanged.**

## Decisions (confirmed with user)
1. **Everything → 20**, including the Apps catalog card grid (FE `DEFAULT_PAGE_SIZE` + BE web-app override).
2. **Consolidate** all FE page-size literals to `CONSTANTS.LIST.DEFAULT_PAGE_SIZE`; on BE remove the redundant `WEB_APP_PAGINATION` override and use shared `PAGINATION`.
3. **Full git-worktree isolation** (per-repo, branched from `origin/main`).

## Out of scope
- `views/Home/hooks/useHomeApps` (`HOME_APPS_LIMIT = 8`) — curated dashboard section (split 4+4), not a paginated table. **Left as-is.**
- `views/Team/.../TeamMembersCard` `limit: 10` — i18n text interpolation, not pagination.
- Validator `LIMIT_MAX`/`MAX_PAGE_SIZE = 100` (ceiling, not default). Unchanged.

## Risk / gates
- Pure constant change; **no attack surface** → security review (§4.5) skipped.
- No CLAUDE.md/techstack fact states the page-size value → drift audit (§4.6) N/A.
- Behavior change is row-count only (no new field/filter/flow/outcome to assert) → E2E dual-gate (§4.3) borderline-skip; rely on green checks (lint/type-check/build). Flag to user.
