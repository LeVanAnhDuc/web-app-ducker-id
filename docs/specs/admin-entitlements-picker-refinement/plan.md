# AdminEntitlements Picker Refinement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Chuẩn hoá layout + search input của `/admin/entitlements` theo pattern list chung, thêm role filter (admin/user) vào UI + wire vào API, và làm rõ hành vi hiển thị user (focus → 6 mặc định; search/role → filtered).

**Architecture:** FE-only refactor trong `client/src/views/AdminEntitlements`. Board dùng `PageShell`/`PageHeader`. Picker toolbar = `SearchInput` + Filters-popover(role). Kết quả dropdown anchored vào search, fetch qua `getAdminUsers({search, role, limit})` (API thật, đã có). Entitlement matrix giữ mock. BE không đổi.

**Tech Stack:** Next.js 15, React 19, next-intl, React Query, shadcn/ui, Tailwind 4, lucide-react.

## Global Constraints

- Convention FE: đọc `client/.claude/CLAUDE.md` + rules (`views.md`, `components.md`, `types.md`, `constants.md`, `imports.md`, `accessibility.md`, `mocks.md`).
- Component 1 folder + `index.tsx`, arrow fn, 1 default export; props type INLINE; file ≤ 200 lines.
- UI có hành vi → `CustomInput`/`CustomButton`/`SearchInput`/shadcn; không raw `<input>/<button>`.
- Route/endpoint/key/enum qua `CONSTANTS.*`; role values từ `CONSTANTS.AUTHENTICATION_ROLES` (USER/ADMIN).
- Mọi string mới → i18n en + vi; announce keys en + vi.
- `useQuery` của view → `views/AdminEntitlements/hooks/`; effect → `ghosts/`.
- Green checks trước handover: `yarn format` → `yarn lint` → `npx tsc --noEmit`.
- Đọc `.claude/uiux/` (token/icon-map/ux-copy) khi thêm UI; conflict → uiux thắng.

---

### Task 1: Layout → PageShell + PageHeader

**Files:**
- Modify: `client/src/views/AdminEntitlements/mains/AdminEntitlementsBoard/index.tsx`

**Interfaces:**
- Consumes: `PageShell` (`@/components/PageContainer/PageShell`, prop `fullHeight`), `PageHeader` (`@/components/PageContainer/PageHeader`, props `title`/`description`).
- Produces: Board render `<PageShell fullHeight>` chứa `<PageHeader title={t("title")} description={t("subtitle")} />` + picker toolbar + chips + matrix/empty + revoke dialog.

- [ ] **Step 1:** Thay `<main className="mx-auto w-full max-w-3xl p-8">` + `<div className="mb-6"><h1>…</h1><p>…</p></div>` bằng `PageShell fullHeight` + `PageHeader`. Bỏ padding/max-width custom (layout `#main-content` lo). Giữ `UserMultiSelect`, khối selected/matrix, `AdminEntitlementsRevokeDialog`. Import theo nhóm (`imports.md`).
- [ ] **Step 2:** `cd client && yarn format && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3:** Commit `feat(admin-entitlements): standard PageShell + PageHeader layout`.

---

### Task 2: Search hook — role param + dynamic limit

**Files:**
- Modify: `client/src/views/AdminEntitlements/hooks/useAdminUsersSearch.ts`

**Interfaces:**
- Consumes: `getAdminUsers` (`@/requests/adminUsers`, nhận `{search?, role?, limit?}`), `AuthenticationRole` (`@/types/User`), `CONSTANTS.QUERY_KEYS.ADMIN_USERS`.
- Produces: `useAdminUsersSearch(search: string, role: AuthenticationRole | null, enabled: boolean)` → `useQuery`. `limit = (search === "" && role === null) ? 6 : 20`. queryKey `[ADMIN_USERS, search, role]`. queryFn `getAdminUsers({ ...(search && {search}), ...(role && {role}), limit })`.

- [ ] **Step 1:** Refactor hook theo signature trên. Constant `DEFAULT_LIMIT = 6`, `SEARCH_LIMIT = 20` (khai báo trong hook file).
- [ ] **Step 2:** `cd client && npx tsc --noEmit` → PASS.
- [ ] **Step 3:** Commit `feat(admin-entitlements): search hook supports role filter + default limit`.

---

### Task 3: i18n — role filter labels + announce (en + vi)

**Files:**
- Modify: `client/src/locales/en/adminEntitlements.json`
- Modify: `client/src/locales/vi/adminEntitlements.json`

**Interfaces:**
- Produces (dưới key `picker`):
  - `filtersLabel`: EN "Filters" / VI "Bộ lọc"
  - `role`: `{ label, all, admin, user }` — EN `Role / All / Admin / User`; VI `Vai trò / Tất cả / Quản trị / Người dùng`
  - `emptyDefaultHint` (optional prompt khi focus chưa gõ): EN "Showing recent users — type to search" / VI "Đang hiển thị người dùng gần đây — gõ để tìm"
- Produces (dưới `announce`): `filterChanged`: EN "Filtered by {role}." / VI "Đã lọc theo {role}."

- [ ] **Step 1:** Thêm keys trên vào cả 2 file, giữ JSON hợp lệ + đồng bộ cấu trúc en↔vi.
- [ ] **Step 2:** `cd client && npx tsc --noEmit` → PASS (next-intl type-check messages).
- [ ] **Step 3:** Commit `feat(admin-entitlements): i18n role filter labels`.

---

### Task 4: UserRoleFilter component (Filters popover)

**Files:**
- Create: `client/src/views/AdminEntitlements/components/UserRoleFilter/index.tsx`

**Interfaces:**
- Consumes: `Popover`/`PopoverTrigger`/`PopoverContent` (`@/components/ui/popover`), `CustomButton`, `RadioGroup`/`RadioGroupItem` (`@/components/ui/radio-group` nếu có; nếu chưa có dùng `CustomButton` toggle list), `SlidersHorizontal` (lucide), `CONSTANTS.AUTHENTICATION_ROLES`.
- Produces: `UserRoleFilter({ role, onChange })` — `role: AuthenticationRole | null`, `onChange: (role: AuthenticationRole | null) => void`. Nút Filters (badge "1" khi role ≠ null) mở popover chứa 3 lựa chọn: Tất cả(`null`) / Admin / Người dùng. Copy từ `adminEntitlements.picker.role` + `filtersLabel`.

- [ ] **Step 1:** Kiểm tra tồn tại `@/components/ui/radio-group` (`ls client/src/components/ui/radio-group*`). Có → dùng RadioGroup; không → list `CustomButton variant={selected?"secondary":"ghost"}`.
- [ ] **Step 2:** Viết component (≤200 lines, props inline, 1 default export). Badge active khi `role !== null`. `aria-label` cho nút Filters.
- [ ] **Step 3:** `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 4:** Commit `feat(admin-entitlements): role filter popover component`.

---

### Task 5: SelectedUserChips component (chips row)

**Files:**
- Create: `client/src/views/AdminEntitlements/components/SelectedUserChips/index.tsx`

**Interfaces:**
- Consumes: `UserChip` (`../UserChip`), `AdminUser`.
- Produces: `SelectedUserChips({ users, onRemove, removeLabel })` — `users: AdminUser[]`, `onRemove: (u) => void`, `removeLabel: (name: string) => string`. Render `null` khi `users.length === 0`; ngược lại `<div className="flex flex-wrap gap-1.5">` các `UserChip`. (Board đã có empty state riêng khi chưa chọn.)

- [ ] **Step 1:** Viết component (one markup block; nhánh empty = `return null`, hợp lệ theo `views.md`).
- [ ] **Step 2:** `cd client && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 3:** Commit `feat(admin-entitlements): selected-user chips row component`.

---

### Task 6: UserMultiSelect refactor — SearchInput + Filters + focus-fetch

**Files:**
- Modify: `client/src/views/AdminEntitlements/components/UserMultiSelect/index.tsx`
- Modify: `client/src/views/AdminEntitlements/mains/AdminEntitlementsBoard/index.tsx` (wire chips + role state placement)
- Modify: `client/src/views/AdminEntitlements/ghosts/PickerResultsAnnouncer/index.tsx` (announce theo search+role)

**Interfaces:**
- Consumes: `SearchInput` (`@/components/SearchInput`), `UserRoleFilter`, `useAdminUsersSearch(search, role, enabled)`, `useDebouncedValue`, `Popover`/`PopoverAnchor`/`PopoverContent`, `UserResultsList`, `AuthenticationRole`.
- Produces: `UserMultiSelect({ selectedUsers, onToggle, onRemove })` — bỏ chips khỏi input. Owns local `search`, `role` (`AuthenticationRole | null`), `isFocused`. Toolbar row: `SearchInput` (anchor, role="combobox"/aria) + `UserRoleFilter`. `hasActive = debouncedSearch.trim() !== "" || role !== null`. `isOpen = isFocused` (mở dropdown ngay khi focus, kể cả chưa gõ). `enabled = isFocused`. Gọi `useAdminUsersSearch(debouncedSearch.trim(), role, isFocused)`.

- [ ] **Step 1:** Refactor `UserMultiSelect`: bỏ khối chips + `<CustomInput>` viền tự chế; dùng `SearchInput` (value/onChange/placeholder/ariaLabel), bọc trong `PopoverAnchor`. Thêm `UserRoleFilter` cạnh SearchInput trong 1 row `flex items-center gap-3`. Enable query khi `isFocused` (focus → fetch 6 default). Dropdown `PopoverContent` giữ `UserResultsList`. Announcer nhận `role` để announce khi count đổi (bỏ điều kiện `query` bắt buộc → announce cả khi focus default). Giữ ≤200 lines (tách nếu cần).
- [ ] **Step 2:** `AdminEntitlementsBoard`: render `<SelectedUserChips users={selectedUsers} onRemove={removeUser} removeLabel={(name)=>tPicker("removeUser",{name})} />` NGAY DƯỚI `UserMultiSelect` (chips row dưới toolbar). Import `tPicker = useTranslations("adminEntitlements.picker")`.
- [ ] **Step 3:** `PickerResultsAnnouncer`: announce `results` khi `isOpen` (bỏ ràng buộc `query` không rỗng vì giờ default cũng hiện user); giữ `useUpdateEffect`.
- [ ] **Step 4:** `cd client && yarn format && yarn lint && npx tsc --noEmit` → PASS.
- [ ] **Step 5:** Commit `feat(admin-entitlements): SearchInput + role filter toolbar, focus-default users`.

---

### Task 7: E2E — expand Scenario Matrix (§4.3)

**Files:**
- Create: `docs/specs/admin-entitlements-picker-refinement/e2e.md`
- Create: `client/e2e/admin-entitlements/picker.e2e.ts`

**Interfaces:**
- Consumes: matrix §7 của `design.md`; helpers `client/e2e/helpers/`; auth `auth.setup.ts` (admin storageState).

- [ ] **Step 1:** Viết `e2e.md` từ matrix §7 (final scenarios + follow-up gaps nếu có).
- [ ] **Step 2:** Author `picker.e2e.ts` — 1 test / scenario Applicable (admin project). Case cần >6/>20 user hoặc seed đặc thù → defer ghi rõ lý do trong `e2e.md` (no silent cap).
- [ ] **Step 3:** Chạy §4.3 **dual-gate** (gate A `yarn e2e` scope feature + gate B MCP walk) theo tiền đề app-running. Fail → `systematic-debugging` → `e2e-bugs.md` → fix → lặp (max 3).
- [ ] **Step 4:** Commit `test(admin-entitlements): E2E picker search + role filter`.

---

## Self-Review

- **Spec coverage:** feedback #1 (SearchInput) → T6; #2 (focus→6) → T2+T6; #3 (layout) → T1; #4 (API thật) → sẵn có, T2 giữ; #5 (BE role) → không đổi (design §6); #6 (UI filter) → T3+T4+T6. E2E matrix → T7. ✅
- **Placeholder scan:** không TBD/TODO; interfaces nêu signature cụ thể. ✅
- **Type consistency:** `role: AuthenticationRole | null` xuyên T2/T4/T6; `getAdminUsers({search, role, limit})` khớp `AdminUsersQueryParams`. ✅
