# E2E Scenarios — frontend-cleanup

Mirrors the `design.md` §7 matrix. Most of the cleanup is pure refactor (no observable behavior change → no E2E). Only three intentional behavior changes are covered. Tests live in `client/e2e/` (see paths below).

## Covered scenarios

### Copy button — admin app secret dialog (`SecretField`)
File: `client/e2e/admin-apps/frontend-cleanup/copy-secret.e2e.ts` · Project: `admin` · Gate: A+B
- **[EP]** Click copy → clipboard contains the field value AND button shows `Check` icon + aria-label "Copied".
- **[BVA ~2000ms]** After the timeout, label reverts to "Copy".
- **[Error Guessing]** Rapid 3× clicks → stays "Copied", single revert (timer reset).
- Setup: POST `/api/v1/admin/apps` intercepted with a fake `AdminAppCreateResult` so the secret dialog opens deterministically (no DB write). Context granted `clipboard-read`/`clipboard-write`.

### NotificationGroups loading skeleton
File: `client/e2e/frontend-cleanup/notifications-loading.e2e.ts` · Project: `chromium` (user) · Gate: B
- **[State Transition]** While `**/notifications**` is pending → `NotificationGroupsSkeleton` (aria-hidden) visible; after resolve → real groups render.
- **[Error Guessing]** Skeleton absent from DOM once data loads (loading vs empty distinct).

### Toast dedup on mutation error
File: `client/e2e/admin-apps/frontend-cleanup/admin-app-status-toast.e2e.ts` · Project: `admin` · Gate: A only
- **[Error Guessing]** Admin app status-toggle PATCH intercepted with 500 → **exactly one** error toast ("Server error. Please try again later."). Verifies the global `MutationCache.onError` is the sole toaster after local handlers were removed. No real mutation (500 short-circuits).

## N/A (justified — no behavior change)
authN, authZ, validation (change-pw msgs only relocated, same text), filter-search & pagination (centralized values unchanged; existing list suites cover), most data-render.

## Skipped with note
- **i18n `list.table.empty` / `list.table.comingSoon`:** keys were added to `list.json` (en+vi) but are **not referenced by any component** — not wired to reachable UI. A test would be brittle against an un-rendered key. Skipped; flagged as a follow-up (either wire these keys to the list empty/coming-soon states or drop them).

## Dual-gate run status — ✅ PASSED (2026-06-21)
Stack: main BE :5000 (local Mongo + cloud Redis) + worktree FE :3100.

- **Gate A (`yarn e2e`, scoped):** 8/8 pass (6 behavior tests + 2 auth setup).
- **Gate B (MCP real-browser walk, fresh user login):** notifications page renders groups correctly (loading→loaded, 13 articles), no console errors attributable to the change (only pre-existing `auth/token/refresh` 403 bootstrap noise). Copy-button covered by Gate A (mutation-heavy create flow not re-walked per §4.3).

### Bug fixed during the run (test-only, no app code touched)
The 3 copy-secret scenarios initially failed for two test-side reasons, both fixed in `copy-secret.e2e.ts`:
1. **Headless clipboard:** `navigator.clipboard.writeText` only resolves with document focus, unreliable in headless → stubbed `navigator.clipboard` (getter) so the test verifies button UX + that the hook writes the right value.
2. **Unstable locator:** two copy buttons share the name "Copy"; a name-based `.first()` re-resolved to the *other* button after the first flipped to "Copied" → switched to a value-anchored locator (`copyButtonFor`).

### Infra note
Before the run, BE login returned 500: a transient DNS blip at BE startup made ioredis exhaust 11 reconnect attempts to the (healthy) cloud Redis and give up permanently. **Fix = restart the BE.** The cloud Redis itself is fine (resolves + TCP-connects).
