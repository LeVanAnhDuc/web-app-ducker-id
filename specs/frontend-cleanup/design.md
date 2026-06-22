# Design — Frontend Consistency & Centralization Cleanup

**Feature:** `frontend-cleanup`
**Date:** 2026-06-20
**Side:** FE only (`client/src/**`) + test infra (`client/.env.example`, E2E env)
**Source:** `feedback.md` (frontend section)
**Scope decision:** Tidy cleanup only. Architectural items (RSC migration, prefetch, shared first-fetch loader) are **deferred** — see §Deferred.

## 1. Goal & Non-Goals

**Goal:** Remove scattered constants/enums/patterns, delete redundant code, and tidy a few views to a single consistent convention. **No behavior change** except two intentional UX improvements (copy-button affordance, notification-group loading) and one correctness fix (single toast on mutation error).

**Non-goals:**
- No data-fetching layer changes (client→server/RSC) — deferred.
- No prefetch / `generateStaticParams` work — deferred.
- No new features, no visual redesign (no Pencil step — no new screens/large UI change).
- No backend changes (the `feedback.md` backend section is out of scope here).

## 2. Reuse / current-state notes (from codebase scan)

- `useListQuery` (`src/hooks/useListQuery.ts`) already owns URL-driven search/filter/page/sort for list pages — the new search-param hook is **extracted from / reused by** it, not a parallel system.
- Global `MutationCache.onError` in `src/libs/query-client.ts` already calls `errorToast(message)` for **all** mutations → local `onError` toasts are redundant.
- `PaginationMeta` exists in `src/types/common.d.ts`; per-domain `*Meta` (Apps/AdminUsers/Notification) duplicate it.
- `BUTTON_SIZE_CLASSES` currently lives in `src/dataSources/Common/index.ts` (wrong home).
- `ADMIN_APP_CATEGORIES` query key exists in `src/constants/queryKeys.ts` (generic string), but feedback wants it consumed via the constant everywhere.
- `NOTIFICATION_READ: (id) => `/notifications/${id}/read`` already a function in `src/constants/endpoints.ts` — feedback wants a consistent id-format helper pattern.
- `NotificationGroups` component already exists — only needs a loading state.
- `GRADIENTS`: not found in codebase → verify & remove any stragglers / unify to tokens.
- `CustomImage` defaults `unoptimized: true` — keep default, make overridable.

## 3. Work groups

Each group is an independent unit. Order is by dependency: shared primitives (G1, G2) first, then consumers.

### G1 — Centralize constants & enums
- **Pagination defaults**: add `DEFAULT_PAGE`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` to `src/constants/list.ts` (or a `pagination` constant). Replace all inline `PAGE_SIZE = 12` / page literals across tables & boards with imports.
- **`SortOrder` enum** (`asc` | `desc`) in a common location (`src/constants` or `src/types/List`); replace the inline union in `src/types/List/index.ts` and usages.
- **`AppStatus` enum** (`active` | `inactive`) replacing the string-literal type in `src/types/AdminApps`; update `=== "active"` comparisons (e.g. `AppStatusBadge`).
- **`NotifGroup`** moved from `src/utils/notifications.ts` to `src/dataSources/Notifications/` as a reusable enum; update `groupOf()` and consumers.
- **`ADMIN_APP_CATEGORIES_QUERY_KEY`**: ensure the query key constant is used at every call-site (no inline strings).
- **`BUTTON_SIZE_CLASSES`**: move from `dataSources/Common` **into** the button component module (co-locate with the component that uses it).
- **i18n strings to `common.json`** (en+vi): pagination labels (`page`, `of`, `results`), `table empty`, `coming soon`, and similar shared UI copy. Follow `ux-copy.md`.
- **`GRADIENTS`**: confirm none referenced; remove dead constant / unify colors to `frontend-reference.md` tokens.

### G2 — Generic types & patterns
- **`Pagination<T>` generic** in `src/types`: one canonical paginated-response shape; collapse duplicated per-domain `*Meta` interfaces onto it (keep field names backward-compatible or update consumers consistently).
- **`useSearchParamState`**: thin hook reading/writing a single URL query param (`router.replace`, scroll preserved). Refactor `useListQuery` internals to consume it — **no API change** to list pages.
- **Unify `useMutation` return shape**: every mutation hook returns the `useMutation()` result object directly (remove the mixed "return custom `{}`" variants).

### G3 — Mutation & error handling
- Remove redundant local `onError` toasts where the global `MutationCache` already toasts (e.g. `useSetAdminAppStatus`, `useCreateAdminApp`). Keep `onError` only when it does non-toast work (optimistic rollback / targeted invalidation).
- Audit `onSuccess` of `useUpdateAdminApp` & `useSetAdminAppStatus` and their call-sites; bring the "update app" mutation into the standard hook pattern (consistent with siblings).

### G4 — `useCopyToClipboard` + copy button
- Add `src/hooks/useCopyToClipboard.ts` (exact implementation from `feedback.md`: `copied`/`copy`/`error`, `timerRef` reset, cleanup on unmount). Export via barrel.
- Copy buttons use the hook: swap to a **check icon when `copied`** (icon per `icon-map.md`), revert after timeout; rapid repeated clicks handled by `timerRef` reset.

### G5 — Notifications cleanup
- Make `src/dataSources/Notifications/index.ts` + `src/utils/notifications.ts` rule-compliant (apply `project-rules` for those paths — types in `src/types`, no business logic in `dataSources`, etc.).
- `NOTIFICATION_READ`: use/extract a consistent endpoint id-format helper so id-bearing endpoints share one pattern.
- `NotificationGroups`: add a **loading** state (skeleton/placeholder while fetching).

### G6 — Component extraction & code style
- Extract admin-app **loading UI** into a dedicated component (replace inline `<Skeleton>` usage).
- `src/views/Apps/mains/AppsBoard/index.tsx`: prefer destructuring.
- Convert fast-returnable arrow functions to implicit return (drop `{ return … }`).
- Extract effects into named ("ghost") hooks in `src/views/AdminUsers/mains/AdminUsersTable/index.tsx` and `src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`.

### G7 — View fixes
- `src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`: review `error` & `!data` branches — proper fallback UI (consistent with other detail views).

### G8 — Test env
- Add missing `E2E_*` keys to `client/.env.example` (create file section if absent; placeholders only, no secrets).
- Centralize E2E/test-env defaults into one reusable module (single source for base URL, default creds keys, ports) instead of scattered literals across config/helpers.
- Verify change-password error messages are centralized in config/i18n; align if any are inline.

## 4. CustomImage decision

Keep `unoptimized: true` as the **default** (safe for remote/avatar URLs without configured `remotePatterns`), but allow per-use override via `unoptimized?: boolean` prop. Add a short WHY comment to prevent future drift. No `next.config` changes.

## 5. Conventions to follow (per `client/.claude/CLAUDE.md`)

- Constants for paths/keys via `CONSTANTS.<DOMAIN>.<KEY>`; never hard-code strings.
- All types in `src/types`; never inline in components.
- i18n nav imports from `@/i18n/navigation`; new strings go through i18n (en+vi), copy per `ux-copy.md`.
- `Custom*` wrappers over raw shadcn primitives; icons via `icon-map.md`; tokens via `frontend-reference.md`.
- After every code task: `yarn format && yarn lint && npx tsc --noEmit` must pass.

## 6. Risks

- **Type consolidation (G2 `Pagination<T>`)**: touching shared `*Meta` types can ripple across many consumers → do as one atomic change, lean on `tsc` to find every site.
- **Toast dedup (G3)**: must verify exactly one toast still shows (not zero) after removing local handlers.
- **Enum migration (G1)**: string-literal → enum changes value sites; keep enum string values identical to current literals to avoid serialization drift with the BE contract.

## 7. E2E Scenario Matrix

Most groups are **pure refactors → no observable behavior change → no E2E**. Behavior surface is limited to G3 (toast count), G4 (copy affordance), G5 (notifications loading). Matrix walks all 12 rubric groups; N/A entries are justified (no silent gaps). Full E2E run is the §4.3 dual-gate step after implementation.

| # | Group | Scenario | Gate |
|---|-------|----------|------|
| 1 | happy | Copy button: click → icon becomes check, tooltip/aria reflects "copied", reverts after timeout `[BVA: t=2000ms boundary]` | A+B |
| 2 | happy | NotificationGroups: while fetch pending → loading placeholder shown; after resolve → groups render `[state-transition: loading→loaded]` | B |
| 3 | mutation-safety | Admin app status toggle error → **exactly one** error toast (no duplicate) `[decision-table: global onError × local onError removed]` | A only |
| 4 | error-loading | Copy fails (clipboard rejects) → no check icon, `error` set, no crash `[error-guessing: clipboard denied]` | B |
| 5 | boundary | Copy button clicked rapidly 3× → single timer, stays "copied", one reset `[BVA: rapid re-entry]` | B |
| 6 | authN | N/A — no auth surface changed by cleanup | — |
| 7 | authZ | N/A — no authorization logic changed | — |
| 8 | validation | N/A — no form/validation behavior changed (change-pw msgs only relocated, same text) | — |
| 9 | empty-null | Covered by #2 (notifications empty/loading) + existing list empty-state (unchanged) | B |
| 10 | filter-search | N/A — `useSearchParamState` extraction preserves `useListQuery` behavior; existing list E2E already covers | — |
| 11 | pagination | N/A — defaults centralized but values unchanged (12); existing pagination E2E unaffected | — |
| 12 | data-render | Covered by #1/#2 — copy + notification rendering | A+B |
| 13 | i18n (en+vi) | New `common.json` keys (pagination/empty/coming-soon) render correctly in both locales `[EP: locale en, vi]` | A+B |
| 14 | a11y | Copy button: `aria-label` updates on copied; check icon not the sole signal (label too) | B |

**Notes:** Scenarios touching mutations (#3) are `A only` (deterministic suite, avoid double-mutation in MCP walk). Copy/clipboard scenarios are MCP-walk friendly (`browser_*`). Defer rationale for N/A rows is recorded above; `writing-plans` expands ✅ rows into concrete tests in `e2e.md`.

## 8. Deferred (separate follow-up feature)

- Move app/category/notification API calls to **server (RSC)** instead of client axios.
- **Prefetch** admin login-history detail pages via `generateStaticParams`.
- Gather first-fetch APIs (e.g. `useUnreadCount`) into a shared loader.

These are architectural; they change the data-fetching layer and warrant their own design + broader E2E.
