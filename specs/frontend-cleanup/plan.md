# Frontend Consistency Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize scattered constants/enums/types, remove redundant code, and tidy a few views to one consistent FE convention — no behavior change except copy-button affordance, notification-group loading, and single-toast-on-error.

**Architecture:** Pure FE refactor in `client/src/**` + test infra. Shared primitives first (constants, enums, generic types, hooks), then consumers. Each task is atomic and self-verifying.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, React Query, next-intl, Tailwind 4, shadcn/ui, Playwright (E2E).

**Working dir:** `client/.worktrees/frontend-cleanup` (branch `refactor/frontend-cleanup`).

**Per-task verification (FE has no unit-test suite):** unless a task says otherwise, "verify" =
```bash
cd client/.worktrees/frontend-cleanup && yarn format && yarn lint && npx tsc --noEmit
```
All three must be clean. Behavior tasks (13, 15, 21) additionally get E2E coverage in Task 21.

**Convention source of truth:** `client/.claude/CLAUDE.md` + skills (`standard-react`, `standard-typescript`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility`) + `.claude/uiux/` (`icon-map.md`, `frontend-reference.md`, `ux-copy.md`) + `project-rules` for path conventions. **Every implementer reads `client/.claude/CLAUDE.md` before touching code.**

**Commit policy:** Stage per task. Do NOT commit per task — the main loop gathers the full diff for one review (§7 commit gate, Review ON), then commits.

---

## G1 — Centralize constants & enums

### Task 1: Pagination default constants

**Files:**
- Modify: `client/src/constants/list.ts`
- Modify (consumers): every view with an inline page-size/limit literal (find them, see Step 2)

- [ ] **Step 1: Add defaults to `LIST`**

Add to the `LIST` object in `src/constants/list.ts`:
```ts
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 100,
```
(Place inside the existing `const LIST = { ... } as const;`.)

- [ ] **Step 2: Find inline literals**

Run from client worktree:
```bash
grep -rn "PAGE_SIZE\|pageSize = \|limit = 12\|= 12\b" src/views src/hooks src/dataSources | grep -iv test
```
Replace inline page/size literals (e.g. `AppsBoard`'s `PAGE_SIZE = 12`, any `limit: 12`, default `page: 1`) with `CONSTANTS.LIST.DEFAULT_PAGE_SIZE` / `DEFAULT_PAGE` / `MAX_PAGE_SIZE` imported from `@/constants`. Do NOT change the numeric values.

- [ ] **Step 3: Verify** (format/lint/tsc per header).

---

### Task 2: `SortOrder` enum

**Files:**
- Modify: `client/src/constants/list.ts` (add enum-like const) OR `src/types/List/index.ts`
- Modify: `src/types/List/index.ts` (replace inline union), plus call-sites

- [ ] **Step 1: Define a single source.** Add to `src/constants/list.ts`:
```ts
export const SORT_ORDER = { ASC: "asc", DESC: "desc" } as const;
export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];
```
(Project uses `as const` object + derived type as its "enum" idiom — match `LIST`. Keep string values `"asc"`/`"desc"` to preserve URL/BE contract.)

- [ ] **Step 2: Replace inline unions.** In `src/types/List/index.ts`, change `sortOrder?: "asc" | "desc"` (field) and `setSort: (sortBy: string, sortOrder: "asc" | "desc")` to use `SortOrder`. Import the type. Then:
```bash
grep -rn '"asc"\|"desc"\|asc" | "desc"' src | grep -iv test
```
Replace each literal with `SORT_ORDER.ASC`/`SORT_ORDER.DESC` (values) or `SortOrder` (types). Update `useListQuery.ts` accordingly.

- [ ] **Step 3: Verify.**

---

### Task 3: `AppStatus` enum

**Files:**
- Modify: `src/types/AdminApps/index.ts`
- Modify: consumers comparing `=== "active"` / `"inactive"` (e.g. `src/views/AdminApps/components/AppStatusBadge/index.tsx`)

- [ ] **Step 1:** In `src/types/AdminApps/index.ts`, replace `export type AppStatus = "active" | "inactive";` with the const-enum idiom:
```ts
export const APP_STATUS = { ACTIVE: "active", INACTIVE: "inactive" } as const;
export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS];
```
Keep string values identical (BE contract). `WebApp.status`, `AdminAppsQueryParams.status`, `AdminAppFormValues.status` keep type `AppStatus` (unchanged).

- [ ] **Step 2:** Find & replace status literals:
```bash
grep -rn '"active"\|"inactive"' src/views/AdminApps src/dataSources | grep -iv test
```
Replace `status === "active"` → `status === APP_STATUS.ACTIVE`, etc.

- [ ] **Step 3: Verify.**

---

### Task 4: Move `NotifGroup` to dataSources as reusable enum

**Files:**
- Modify: `src/dataSources/Notifications/index.ts` (add enum)
- Modify: `src/utils/notifications.ts` (import, stop redefining type)
- Modify: `src/types/Notification/index.ts` if a shared type belongs there (per `project-rules`: types live in `src/types`)

- [ ] **Step 1:** Per `project-rules`, the GROUP **values** + ordering are static UI data → `dataSources`; the **type** → `src/types/Notification`. Add to `src/types/Notification/index.ts`:
```ts
export const NOTIF_GROUP = { TODAY: "today", YESTERDAY: "yesterday", EARLIER: "earlier" } as const;
export type NotifGroup = (typeof NOTIF_GROUP)[keyof typeof NOTIF_GROUP];
```

- [ ] **Step 2:** In `src/utils/notifications.ts`, remove the local `export type NotifGroup = ...`; import `NOTIF_GROUP`/`NotifGroup` and return `NOTIF_GROUP.TODAY` etc. from `groupOf`.

- [ ] **Step 3:** Update all `NotifGroup` importers (`NotificationGroups`, dataSources group-label maps) to import from the new location. Verify no duplicate type remains:
```bash
grep -rn "NotifGroup" src
```

- [ ] **Step 4: Verify.**

---

### Task 5: Consume `ADMIN_APP_CATEGORIES` query key everywhere

**Files:**
- Modify: any hook/component using an inline `"adminAppCategories"` string or constructing the categories query key ad-hoc.

- [ ] **Step 1:** Find sites:
```bash
grep -rn "adminAppCategories\|ADMIN_APP_CATEGORIES\|AppCategories" src/views src/hooks src/requests
```

- [ ] **Step 2:** Ensure every `useQuery`/`invalidateQueries` for admin app categories uses `CONSTANTS.QUERY_KEYS.ADMIN_APP_CATEGORIES` (already exists in `queryKeys.ts`) — no inline strings. If a hook is missing for this fetch, the feedback's intent is "into query common": route it through the constant.

- [ ] **Step 3: Verify.**

---

### Task 6: Co-locate `BUTTON_SIZE_CLASSES` with the button component

**Files:**
- Modify: `src/dataSources/Common/index.ts` (remove `BUTTON_SIZE_CLASSES`)
- Modify: the button component that consumes it (find it) — move the map there
- Modify: importers of `BUTTON_SIZE_CLASSES`

- [ ] **Step 1:** Find consumers:
```bash
grep -rn "BUTTON_SIZE_CLASSES" src
```

- [ ] **Step 2:** Move the `BUTTON_SIZE_CLASSES` const (and its `ButtonSize` type derivation) from `dataSources/Common/index.ts` into the button component module that uses it (e.g. `src/components/CustomButton/` or wherever it's consumed). Keep it exported if other modules import it; otherwise keep module-local. Update imports.

- [ ] **Step 3: Verify.** (`dataSources/Common` keeps `COLOR_VARIANT_CLASSES`, `DISABLED_CLASSES` — only button sizing moves.)

---

### Task 7: Move shared UI copy to `common.json` (en+vi)

**Files:**
- Modify: `src/locales/en/common.json`, `src/locales/vi/common.json`
- Modify: components rendering inline pagination/empty/coming-soon copy

- [ ] **Step 1:** Add keys to both locales (values per `ux-copy.md`; EN shown, add matching VI):
```json
"pagination": { "page": "Page", "of": "of", "results": "results" },
"table": { "empty": "No data", "comingSoon": "Coming soon" }
```
(Reconcile with any existing keys — do not duplicate; if a `pagination`/`list` namespace already holds some, extend it instead.)

- [ ] **Step 2:** Replace inline strings ("of", "results", "Coming soon", empty-table text) in list/table/pagination components with `t(...)` from the right namespace. Find:
```bash
grep -rn "Coming soon\|coming soon\|No data\|results<\|of </" src/views src/components
```

- [ ] **Step 3: Verify.**

---

### Task 8: Remove/verify `GRADIENTS`

**Files:** wherever a `GRADIENTS` const exists (scan finds none currently).

- [ ] **Step 1:**
```bash
grep -rn "GRADIENT" src
```
- [ ] **Step 2:** If found and unused → delete. If used for decorative color, replace with `frontend-reference.md` tokens (semantic color classes) to unify. If truly absent → no-op (note in commit).
- [ ] **Step 3: Verify.**

---

## G2 — Generic types & patterns

### Task 9: `Paginated<T>` generic + consolidate per-domain `*Meta`

**Files:**
- Modify: `src/types/common.d.ts` (or `src/types/index.ts`)
- Modify: `src/types/Apps/index.ts`, `src/types/AdminUsers/index.ts`, `src/types/Notification/index.ts`

- [ ] **Step 1 — INVESTIGATE FIRST (blocking):** The per-domain metas use `{ total, page, limit, totalPages }` but `common.d.ts PaginationMeta` uses `{ page, pageSize, totalItems, totalPages, hasNext, hasPrev }`. Determine the **real BE response shape** for apps/users/notifications by reading `src/requests/apps.ts`, `adminUsers` request, `notification.ts` and the response typing. **If the two shapes genuinely differ in the live API**, do NOT force-unify field names — instead create the generic to match the ACTUAL domain shape and record the divergence in `docs/specs/frontend-cleanup/design.md` §6 and STOP for main-loop note. If they're the same data named differently, unify onto one.

- [ ] **Step 2:** Add a single generic (name `Paginated<T>`):
```ts
interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
interface Paginated<T> {
  items: T[];        // or the actual list field name used by these endpoints
  meta: PaginationInfo;
}
```
Adjust field names to the verified contract from Step 1.

- [ ] **Step 3:** Replace the three duplicated `*Meta` interfaces (Apps/AdminUsers/Notification) with `PaginationInfo`; update list response types to `Paginated<T>`. Let `tsc` enumerate every consumer; fix each.

- [ ] **Step 4: Verify.**

---

### Task 10: `useSearchParamState` hook + refactor `useListQuery` to use it

**Files:**
- Create: `src/hooks/useSearchParamState.ts`
- Modify: `src/hooks/index.ts` (export)
- Modify: `src/hooks/useListQuery.ts` (consume internally — no public API change)

- [ ] **Step 1: Create the hook.** Thin single-param URL state (locale-aware nav, `replace`, scroll preserved):
```ts
// libs
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
// hooks (i18n nav)
import { useRouter, usePathname } from "@/i18n/navigation";

/** Read/write a single URL query param. Returns [value, setValue]. Empty string removes the param. */
const useSearchParamState = (
  key: string,
  defaultValue = ""
): [string, (value: string) => void] => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(key, next);
      else params.delete(key);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, pathname, router, searchParams]
  );

  return [value, setValue];
};

export default useSearchParamState;
```

- [ ] **Step 2:** Export from `src/hooks/index.ts`:
```ts
export { default as useSearchParamState } from "./useSearchParamState";
```

- [ ] **Step 3:** In `useListQuery.ts`, refactor the per-param URL read/write logic to delegate to `useSearchParamState` where it cleanly fits (search/page/sort params). **Public return shape of `useListQuery` must not change** — existing list pages keep working. If delegation doesn't cleanly fit a multi-param batch update, leave that path as-is (YAGNI) and only adopt the hook where it reduces duplication.

- [ ] **Step 4: Verify.** Existing list E2E (filter/search/pagination) must still pass in Task 21 gate.

---

### Task 11: Unify `useMutation` return shape

**Files:** all mutation hooks under `src/views/**/hooks/` and `src/hooks/`.

- [ ] **Step 1:** Find every mutation hook:
```bash
grep -rln "useMutation" src
```
- [ ] **Step 2:** Standardize: each hook **returns the `useMutation(...)` result directly** (`return useMutation({...})`). Remove variants that wrap into a custom `{ mutate, isPending, ... }` object unless a call-site depends on a renamed field — if so, update the call-site to the standard `useMutation` result API. Keep `useToggleFavorite` consistent too if it diverges.
- [ ] **Step 3: Verify.**

---

## G3 — Mutation & error handling

### Task 12: Remove redundant local `onError` toasts; audit `onSuccess`

**Files:** `src/views/AdminApps/hooks/useSetAdminAppStatus.ts`, `useCreateAdminApp.ts`, `useUpdateAdminApp.ts`, and any mutation hook with a local toast in `onError`.

- [ ] **Step 1:** Global `MutationCache.onError` (`src/libs/query-client.ts`) already toasts every mutation error. Find local error toasts:
```bash
grep -rn "onError" src/views src/hooks
```
- [ ] **Step 2:** Remove local `onError` blocks whose ONLY job is toasting (e.g. `toast.error(tToast("error"))`). **Keep** `onError` when it does rollback/`invalidateQueries`/state reset — leave that logic, drop only the duplicate toast line. Ensure exactly one toast still fires (global) — do not also delete the global handler.
- [ ] **Step 3:** Audit `onSuccess` of `useUpdateAdminApp` & `useSetAdminAppStatus`: confirm they invalidate the right query keys (`ADMIN_APPS`, `ADMIN_APP_CATEGORIES`) and that external call-sites don't double-handle success toasts. Make the "update app" hook match the sibling pattern (consistent `onSuccess`/return).
- [ ] **Step 4: Verify.** Toast-count behavior covered by Task 21 scenario #3.

---

## G4 — Copy hook + button

### Task 13: `useCopyToClipboard` + copy button check icon

**Files:**
- Create: `src/hooks/useCopyToClipboard.ts`
- Modify: `src/hooks/index.ts`
- Modify: every copy button (find them)

- [ ] **Step 1: Create hook** (exact implementation from feedback):
```tsx
// libs
import { useState, useCallback, useRef, useEffect } from "react";

const useCopyToClipboard = (timeout = 2000) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<void> => {
      setError(null);
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), timeout);
      } catch (err) {
        const copyError =
          err instanceof Error ? err : new Error("Failed to copy to clipboard");
        setError(copyError);
      }
    },
    [timeout]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { copied, copy, error };
};

export default useCopyToClipboard;
```

- [ ] **Step 2:** Export from `src/hooks/index.ts`.

- [ ] **Step 3:** Find copy buttons:
```bash
grep -rn "clipboard\|writeText\|copy" src/views src/components | grep -iv copyright
```
Refactor each to use `useCopyToClipboard`: show the **check icon when `copied`** (copy + check icons per `icon-map.md`, e.g. `Copy` / `Check` from lucide-react), update `aria-label` to reflect copied state (a11y — label, not icon-only), revert after timeout. Rapid clicks are handled by the hook's `timerRef` reset.

- [ ] **Step 4: Verify.** Behavior covered by Task 21 scenarios #1, #4, #5, #14.

---

## G5 — Notifications cleanup

### Task 14: Notifications rule compliance + endpoint id-format helper

**Files:** `src/dataSources/Notifications/index.ts`, `src/utils/notifications.ts`, `src/constants/endpoints.ts` (+ types).

- [ ] **Step 1:** Read `project-rules` for `src/dataSources/**` and `src/utils/**`. Apply: move any inline types to `src/types/Notification`, ensure `dataSources` holds only static UI data (no business logic), ensure file/folder naming + barrel conventions match. Fix the specific violations flagged (this is the "chưa tuân thủ rule" item).
- [ ] **Step 2:** `NOTIFICATION_READ`/`FAVORITE_TOGGLE` already use `(id) => template`. If the feedback intent is a shared id-path helper, add a tiny builder in `endpoints.ts` and use it for id-bearing endpoints, e.g.:
```ts
const withId = (base: string, id: string, suffix = "") => `${base}/${id}${suffix}`;
// NOTIFICATION_READ: (id) => withId(END_POINTS.NOTIFICATIONS, id, "/read")
```
Only adopt if it reduces real duplication; otherwise document that the current function form is already the standard and skip.
- [ ] **Step 3: Verify.**

---

### Task 15: `NotificationGroups` loading state

**Files:** `src/views/Notifications/components/NotificationGroups/index.tsx` (+ parent passing `isLoading`).

- [ ] **Step 1:** Add an `isLoading` prop (or consume the query's pending state) and render a skeleton/placeholder for groups while fetching (use the project skeleton + `frontend-reference.md` spacing). Empty state stays distinct from loading.
- [ ] **Step 2: Verify.** Behavior covered by Task 21 scenario #2.

---

## G6 — Component extraction & code style

### Task 16: Extract admin-app loading UI component

**Files:**
- Create: `src/views/AdminApps/components/AppsLoading/index.tsx` (or matching folder convention)
- Modify: the admin apps board/table that currently inlines `<Skeleton>`

- [ ] **Step 1:** Move the inline admin-app loading skeleton markup into a dedicated component; render it from the board/table when loading. Follow component-folder convention (`project-rules`).
- [ ] **Step 2: Verify.**

---

### Task 17: AppsBoard destructuring + implicit-return sweep

**Files:** `src/views/Apps/mains/AppsBoard/index.tsx` (+ files touched by the arrow-fn sweep).

- [ ] **Step 1:** In `AppsBoard/index.tsx`, prefer destructuring (props, hook returns, objects) over repeated `obj.x` access.
- [ ] **Step 2:** Convert fast-returnable arrow functions to implicit return across files you touch in this cleanup (drop `{ return x }` → `=> x`). Keep block bodies where there's logic/multiple statements. Do NOT do a repo-wide blind sweep — apply to files already in scope. Lint (`arrow-body-style` if configured) will help.
- [ ] **Step 3: Verify.**

---

### Task 18: Extract effects into named ("ghost") hooks

**Files:**
- `src/views/AdminUsers/mains/AdminUsersTable/index.tsx`
- `src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`

- [ ] **Step 1:** For each, move `useEffect` logic into a co-located named hook (e.g. `useAdminUsersTableEffects` / `useLoginHistoryDetailAnnounce`) so the component body reads declaratively. Keep behavior identical. Place hooks per `project-rules` (co-located `hooks/` or top of view folder).
- [ ] **Step 2: Verify.**

---

## G7 — View fixes

### Task 19: `LoginHistoryDetailCard` error & `!data` handling

**Files:** `src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx`.

- [ ] **Step 1:** Review the `error` and `!data` branches; provide a proper fallback UI consistent with other detail views (error message + retry/empty state, not a blank/crash). Use shared empty/error components if they exist.
- [ ] **Step 2: Verify.**

---

## G8 — Test env

### Task 20: E2E env keys + centralized test defaults + change-pw message check

**Files:**
- Modify/Create: `client/.env.example`
- Create: `client/e2e/helpers/env.ts` (or extend existing helper) — single source for test-env defaults
- Verify: change-password error messages location

- [ ] **Step 1:** Add missing `E2E_*` keys to `client/.env.example` (placeholders only, no secrets) — e.g. `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, admin creds keys used by `auth.setup.ts`. Cross-check against `playwright.config.ts` + `auth.setup.ts` for every `process.env.E2E_*` referenced.
- [ ] **Step 2:** Centralize test-env defaults (base URL, ports, default cred env-keys) into one module imported by `playwright.config.ts` and helpers — replace scattered literals.
- [ ] **Step 3:** Verify change-password error messages are centralized (config/i18n). Find:
```bash
grep -rn "change-password\|changePassword\|CHANGE_PASSWORD" src/views src/locales
```
If any error copy is inline, move it to the i18n config. If already centralized, no-op (note in commit).
- [ ] **Step 4: Verify** (lint/tsc; E2E config still loads).

---

## §4.3 E2E — expand behavior scenarios

### Task 21: E2E tests for behavior surface + `e2e.md`

**Files:**
- Create: `client/e2e/frontend-cleanup/*.e2e.ts`
- Create: `docs/specs/frontend-cleanup/e2e.md` (scenario doc, mirrors design §7 matrix)

- [ ] **Step 1:** Write `e2e.md` from the design §7 matrix (only the ✅ rows; record N/A rationale). Use skill `e2e-scenario-coverage` rubric.
- [ ] **Step 2:** Implement Playwright tests for the ✅ rows:
  - **#1/#5/#14 Copy button:** click → check icon + `aria-label` "copied" appears; reverts after timeout; rapid 3× clicks stays copied once. Selector by role/label.
  - **#2/#9 NotificationGroups loading:** intercept/slow the notifications request → assert loading placeholder, then groups render.
  - **#3 Toast dedup:** admin app status toggle forced error → assert exactly one error toast (`A only` gate, no double-mutation in MCP walk).
  - **#13 i18n:** new `common.json` keys render in `en` and `vi`.
- [ ] **Step 3:** Reuse `client/e2e/helpers/` + global `auth.setup.ts` storageState. Mutation test (#3) reverts/avoids real data change. Do not modify app code from tests.
- [ ] **Step 4:** This task's verification is the §4.3 **dual-gate** run (handled by the main loop after all tasks): `yarn e2e` (Gate A) + Playwright MCP walk (Gate B), both over this matrix.

---

## Post-implementation gates (main loop, not subagents)

1. **§4.7 green checks:** `cd client && yarn lint && yarn build` (FE) — must be green.
2. **§4.3 E2E dual-gate:** Gate A `yarn e2e` (scope: frontend-cleanup) + Gate B MCP walk, both PASS.
3. **Step 4 code review:** `superpowers:requesting-code-review` (FE convention).
4. **§4.5 security review:** likely **skip** (no auth/input/sensitive-data surface — cleanup only); record skip rationale in `security-report.md` if confirmed skip, else dispatch security-audit.
5. **§4.6 CLAUDE.md drift audit:** run if any fact in `client/.claude/CLAUDE.md` changed (new shared hook idioms, constants conventions). Non-blocking.
6. **§7 commit gate:** present full diff for ONE user review → commit per repo (client + docs).
7. **Step 5 PR:** `creating-github-pr` — STOP before merge (autonomous flow halts pre-merge).

## Self-review notes (coverage check)

- Every `feedback.md` frontend line maps to a task: error-msg-config→T20; E2E env→T20; centralize test defaults→T20; onError toast dedup→T12; update-app hook→T11/T12; copy button/useCopyToClipboard→T13; ADMIN_APP_CATEGORIES_QUERY_KEY→T5; admin-app loading component→T16; implicit returns→T17; table page/size→T1; RSC app/category→**deferred**; pagination i18n→T7; sortOrder enum→T2; Pagination<T>→T9; search-param hook→T10; app.status enum→T3; unify useMutation return→T11; onSuccess audit→T12; CustomImage unoptimized→**design §4 (overridable)** implement in T(add); NOTIFICATION_READ format→T14; notifications rule compliance→T14; first-fetch loader→**deferred**; NotifGroup enum→T4; NotificationGroups loading→T15; AppsBoard destructuring→T17; GRADIENTS→T8; prefetch login-history→**deferred**; LoginHistoryDetail error/!data→T19; ghost-effect extraction→T18; BUTTON_SIZE_CLASSES into component→T6.
- **Gap fix:** CustomImage overridable `unoptimized` — add as **Task 17b** below.

### Task 17b: CustomImage overridable `unoptimized`

**Files:** `src/components/CustomImage/index.tsx`.

- [ ] **Step 1:** Keep `unoptimized: true` as default but accept an `unoptimized?: boolean` prop that overrides it; add a short `// WHY` comment (remote/avatar URLs lack configured remotePatterns). No `next.config` change.
- [ ] **Step 2: Verify.**
