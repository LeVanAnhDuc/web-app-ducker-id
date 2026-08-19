# Plan — Unify pagination default size to 20

Branch: `chore/unify-pagination-default` (worktrees in server/, client/, docs/).

## Task BE-1 — remove web-app pagination override (single source of truth)
File: `server/src/modules/web-app/constants/index.ts`
- Remove `WEB_APP_PAGINATION` export and the now-unused `import { PAGINATION }`.

File: `server/src/modules/web-app/web-app.service.ts`
- Import `PAGINATION` from `@/common/pagination`; drop `WEB_APP_PAGINATION` from the `./constants` import.
- `listUserApps`: `const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;`

Result: user apps catalog default 12 → 20 (= shared default).

## Task FE-1 — bump shared default + consolidate literals
File: `client/src/constants/list.ts`
- `DEFAULT_PAGE_SIZE: 12` → `20`. (AppsBoard grid + skeleton auto-follow.)

File: `client/src/views/LoginHistory/mains/LoginHistoryTable/index.tsx`
- Add `import CONSTANTS from "@/constants";`
- `limit: 10` → `limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE`

File: `client/src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`
- `limit: 20` → `limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE` (CONSTANTS already imported)

File: `client/src/views/AdminContact/mains/AdminContactTable/index.tsx`
- Remove local `const DEFAULT_PAGE_SIZE = 20;`
- `limit: DEFAULT_PAGE_SIZE` → `limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE` (CONSTANTS already imported)

File: `client/src/views/Notifications/hooks/useNotifications.ts`
- Remove local `const PAGE_SIZE = 20;`
- `limit: PAGE_SIZE` → `limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE` (CONSTANTS already imported)

## Verification
- BE: `yarn lint && yarn type-check && yarn test && yarn build`
- FE: `yarn lint && npx tsc --noEmit` (and `yarn build` if feasible in worktree)
- Manual sanity: grep shows no remaining divergent page-size literal (excluding Home `HOME_APPS_LIMIT`, Team i18n `limit`, `MAX_*`).
