# E2E Coverage Backfill — Implementation Plan (master)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development để thực thi task-by-task.
> Master plan này chứa **Phase 0 (code fixes CF-1..CF-5)** + **sequencing** + **Phase 2 dual-gate**.
> Task E2E từng feature nằm ở `docs/specs/<feature>/plan.md` (section `## E2E Backfill Plan`).

**Goal:** Nâng E2E coverage của 6 feature đã có test lên đạt rubric `e2e-scenario-coverage` (12 nhóm), kèm 5 code fix mà coverage phụ thuộc, rồi verify bằng dual-gate.

**Architecture:** Code fixes trước (unblock test) → per-feature E2E expansion (TDD, mỗi scenario 1 test) → dual-gate (gate A `yarn e2e` + gate B MCP walk) → teardown.

**Tech Stack:** Next.js 15 + React 19, Playwright, next-intl (en/vi), React Query, RHF+Zod. Test ở `client/e2e/<feature>/*.e2e.ts`.

---

## Thứ tự thực thi

1. **Phase 0 — Code fixes** (Task CF-1 → CF-5). Làm trước vì nhiều test phụ thuộc.
2. **Phase 1 — Per-feature E2E** (6 plan con). Có thể chạy sau khi CF tương ứng xong:
   - CF-1 (config) xong → mọi admin suite + AuthZ test chạy đúng.
   - CF-2 (isError) xong → admin-users-list row 10 (error UI).
   - CF-3 (max20) xong → edit-apps row 6 (redirectUris 21).
   - CF-4 (useAnnounce) xong → admin-users-list row 12 + login-history-detail row 12 (announce).
   - CF-5 (doc drift) độc lập.
3. **Phase 2 — Dual-gate** (Task DG). Sau khi toàn bộ test viết xong.

Per-feature plans:
- `docs/specs/change-password/plan.md` → `## E2E Backfill Plan`
- `docs/specs/admin-users-list/plan.md`
- `docs/specs/edit-apps/plan.md`
- `docs/specs/notifications-api/plan.md`
- `docs/specs/web-app-user-list/plan.md`
- `docs/specs/admin-login-history-detail/plan.md`

---

## Phase 0 — Code fixes

### Task CF-1: Playwright project routing cho admin suites + AuthZ

**Files:**
- Modify: `client/playwright.config.ts` (projects array)
- Create: `client/e2e/admin-authz/admin-authz.e2e.ts` (AuthZ deny tests chạy dưới user-context)

**Vấn đề:** `chromium` project (`storageState: user.json`) chỉ `testIgnore: /admin-apps\//`, nên `admin-users-list/` + `admin-login-history/` chạy nhầm dưới user thường → chỉ pass nhờ hack set `E2E_USER_EMAIL=admin` lúc setup.

- [ ] **Step 1: Sửa projects** — gom mọi admin-only suite vào project `admin` (admin.json); `chromium` (user.json) loại trừ nhóm admin nhưng GIỮ `admin-authz/` (test user→admin route→403).

```ts
const ADMIN_SUITES = /(?:admin-apps|admin-users-list|admin-login-history)\//;

projects: [
  { name: "setup", testMatch: /auth\.setup\.ts/ },
  { name: "admin-setup", testMatch: /admin\.setup\.ts/ },
  {
    name: "chromium",
    // user-context: loại admin-only suites, GIỮ admin-authz (cần user storageState)
    testIgnore: ADMIN_SUITES,
    use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
    dependencies: ["setup"]
  },
  {
    name: "admin",
    testMatch: /(?:admin-apps|admin-users-list|admin-login-history)\/.*\.e2e\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
    dependencies: ["admin-setup"]
  }
]
```

- [ ] **Step 2: auth.setup phải login user THƯỜNG, admin.setup login admin** — kiểm tra `auth.setup.ts` dùng `E2E_USER_EMAIL/PASSWORD` (user thường, không phải admin), `admin.setup.ts` dùng admin creds (xem `reference_worktree_missing_env`). Bỏ thói quen set `E2E_USER_EMAIL=admin`.
- [ ] **Step 3: Viết AuthZ deny test** (chạy dưới chromium/user.json):

```ts
// client/e2e/admin-authz/admin-authz.e2e.ts
import { test, expect } from "@playwright/test";

const ADMIN_ROUTES = ["/admin/users", "/admin/apps", "/admin/login-history"];

for (const route of ADMIN_ROUTES) {
  test(`non-admin is denied at ${route}`, async ({ page }) => {
    const res = await page.goto(route);
    // FE: AuthGuard cho qua (đã login) nhưng route admin → redirect về dashboard/403 UI
    await expect(page).not.toHaveURL(new RegExp(route.replace(/\//g, "\\/")));
    // hoặc assert 403 surface tùy implementation thực tế — verify khi chạy
  });
}
```

- [ ] **Step 4: Verify** — `cd client && yarn e2e --project=admin` (admin suites pass) + `--project=chromium e2e/admin-authz` (deny pass). Expected: PASS.
- [ ] **Step 5: Commit** (chờ review gate §7).

> Lưu ý: hành vi deny thực tế (redirect đích nào / 403 component) phải xác minh khi chạy app; chỉnh assertion cho khớp, KHÔNG sửa app code trong test.

### Task CF-2: AdminUsers error state (`isError` branch)

**Files:**
- Modify: component bảng AdminUsers (tìm: `client/src/views/AdminUsers/**` — component render `isLoading`/`data`; grep `useAdminUsersList`)
- Modify: `client/src/locales/en/adminUsers.json` + `client/src/locales/vi/adminUsers.json` (key `states.error`)

**Vấn đề:** component chỉ xử lý `isLoading`; API 5xx → `data=undefined` → `items=[]` → render nhầm empty state.

- [ ] **Step 1: Thêm key locale** `states.error` (en: "Could not load users. Please try again." / vi: "Không thể tải danh sách người dùng. Vui lòng thử lại.").
- [ ] **Step 2: Consume `isError`** từ hook + render error UI (theo pattern `views/Apps/mains/AppsBoard` dùng `role="alert"`):

```tsx
const { data, isLoading, isError } = useAdminUsersList(query);
// ...
if (isError) {
  return (
    <div role="alert" className="...">
      {t("states.error")}
    </div>
  );
}
```

- [ ] **Step 3: Verify** `yarn tsc` + `yarn lint` pass; error UI render khi route-intercept 500 (sẽ test ở admin-users-list plan row 10).
- [ ] **Step 4: Commit** (review gate).

### Task CF-3: edit-apps `redirectUris` max(20) + locale key

**Files:**
- Modify: `client/src/forms/AdminApp/validations.ts:59`
- Modify: `client/src/locales/{en,vi}/adminApps.json` (key `redirectUris.maxItems`)

- [ ] **Step 1: Thêm `.max(20)`**:

```ts
const REDIRECT_URIS_MAX = 20;
// ...
[REDIRECT_URIS]: z
  .array(requiredUrl)
  .min(1, { message: "required" })
  .max(REDIRECT_URIS_MAX, { message: "maxItems" })
```

- [ ] **Step 2: Locale key** `redirectUris.maxItems` (en: "You can add at most 20 redirect URIs." / vi: "Tối đa 20 redirect URI.") — đặt đúng namespace mà form đang đọc (verify key path hiện tại của `redirectUris.required`).
- [ ] **Step 3: Verify** `yarn tsc`/`yarn lint`; 21 URIs → field error (test ở edit-apps row 6).
- [ ] **Step 4: Commit** (review gate).

### Task CF-4: `useAnnounce` cho AdminUsers table + LoginHistoryDetail card

**Files:**
- Modify: component bảng AdminUsers (pagination/filter/search/loading changes)
- Modify: `client/src/views/AdminLoginHistoryDetail/**` `LoginHistoryDetailCard` (announce on load)

**Pattern tham chiếu** (đã dùng ở `views/AdminLoginHistory/mains/AdminLoginHistoryTable`, `views/Apps/mains/AppsBoard`, `views/LoginHistory/mains/LoginHistoryTable`):

```tsx
// hooks
import { useAnnounce } from "@/hooks";
// ...
const announce = useAnnounce();
useEffect(() => {
  if (isLoading) announce(t("announce.loading"));
  else if (isError) announce(t("announce.error"));
  else announce(t("announce.loaded", { count: items.length }));
}, [isLoading, isError, items.length]);
```

- [ ] **Step 1: AdminUsers** — announce khi đổi page/filter/search + loading/loaded (theo `rules/accessibility.md`). Thêm key `announce.*` locale (en+vi).
- [ ] **Step 2: LoginHistoryDetailCard** — announce on load (data về). Thêm key `announce.loaded`/`announce.loading` locale.
- [ ] **Step 3: Verify** `yarn tsc`/`yarn lint`; `#announcer` có nội dung (test ở row 12 của 2 feature).
- [ ] **Step 4: Commit** (review gate).

> Nếu cấu trúc announce hiện tại khác (vd announce theo từng action thay vì effect), follow pattern file tham chiếu — KHÔNG áp template cứng.

### Task CF-5: Doc drift

**Files:**
- Modify: `docs/specs/notifications-api/design.md` (ĐÃ sửa khi author matrix: optimistic→invalidate, bỏ auto-reseed, count=13) — verify lại.
- Modify: `docs/specs/change-password/plan.md` — path `views/Security/...` → `views/AccountSettings/...`; namespace `security.changePassword` → `accountSettings.changePassword`.

- [ ] **Step 1:** Sửa path/namespace stale trong change-password/plan.md.
- [ ] **Step 2:** Verify notifications design.md không còn claim optimistic/auto-reseed.
- [ ] **Step 3: Commit** (review gate).

---

## Phase 2 — Dual-gate verification (Task DG)

> Theo CLAUDE.md §4.3. Chỉ chạy sau khi Phase 0 + Phase 1 xong.

- [ ] **DG-1: Tiền đề app-running** — agent check port BE :5000, FE :3000, Mongo, Redis.
  - Mongo/Redis/BE chưa chạy → agent tự dựng background (BE từ main `server/`, KHÔNG đổi code). Verify `.env`/`.env.local` tồn tại ở main (xem `reference_worktree_missing_env`).
  - FE worktree dev port riêng: `node .claude/scripts/worktree.mjs up e2e-coverage-backfill` (chỉ có client worktree → script start FE; junction node_modules + copy/patch env tự lo).
  - Seed nếu cần (`cd server && yarn seed --clear && yarn seed`).
- [ ] **DG-2: Dispatch 2 gate SONG SONG** (1 message, 2 Agent):
  - **Gate A** — subagent: `cd client/.worktrees/e2e-coverage-backfill && yarn e2e` (scope 6 feature + admin-authz). Auto-target FE port qua `.worktree-state.json`. Report PASS/FAIL + output. Lưu ý session contamination: chạy change-password (revoke token) RIÊNG khỏi user-auth suites (`reference_e2e_suite_session_contamination`).
  - **Gate B** — subagent (general-purpose + Playwright MCP `browser_*`): nhận Scenario Matrix từ mỗi `docs/specs/<feature>/e2e.md`, auth context RIÊNG (login qua browser, không share storageState với A), walk từng scenario `A+B`; scenario `A only` chỉ verify read/render. Report PASS/FAIL per-scenario + evidence (`browser_snapshot`/`browser_console_messages`/`browser_network_requests`). i18n rows verify cả en+vi.
- [ ] **DG-3: Fail ≥1 gate** → `superpowers:systematic-debugging` root cause → ghi `docs/specs/<feature>/e2e-bugs.md` (append/round) → fix (subagent-driven/TDD) → re-run CẢ 2 gate. Max 3 vòng; quá → DỪNG + báo user.
- [ ] **DG-4: Cả 2 PASS** → sang requesting-code-review.
- [ ] **DG-5: Teardown** — `node .claude/scripts/worktree.mjs down e2e-coverage-backfill` + tắt đúng process agent đã bật (Mongo/Redis/BE/FE). KHÔNG tắt service dev/user chạy sẵn từ trước.

---

## Self-review (đã chạy)

- **Spec coverage:** mỗi CF-1..5 ánh xạ tới 1 vấn đề code trong design §3; mỗi feature có plan con expand matrix.
- **Placeholder scan:** không TBD; chỗ "verify khi chạy app" là chủ ý (hành vi deny/announce phải khớp app thật, không bịa assertion).
- **Type/path consistency:** field/locale key tham chiếu file thật (`validations.ts`, `adminApps.json`); component path để implementer grep chính xác (đã nêu hook `useAdminUsersList`).
