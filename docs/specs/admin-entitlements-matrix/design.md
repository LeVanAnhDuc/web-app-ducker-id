# Design — AdminEntitlements user×app matrix (rows = user)

**Feature:** `admin-entitlements-matrix` · **Branch:** `feat/admin-entitlements-matrix`
**Repos đụng tới:** `client/` (UI) + `docs/` (spec). **KHÔNG đụng `server/`.**
**Ngày:** 2026-07-16

## 1. Bối cảnh & phạm vi

Tiếp nối feature **AdminEntitlements** (`/admin/entitlements`). Hiện tại phần content khi đã chọn user là **ma trận rows = app** (mỗi hàng 1 app + nút Grant/Revoke-all cho toàn bộ user đã chọn), chạy trên mock `@/mocks/AdminEntitlements`.

Slice này **lật lại layout content** thành **ma trận rows = user, columns = app** với chế độ edit/save/cancel, checkbox theo ô, dirty tracking, và cột user cố định (sticky) khi scroll ngang các cột app.

**Phạm vi (đã chốt với user):**

- ✅ **UI-only, giữ mock** — không wire BE thật. Endpoint entitlement thật (GET matrix + batch update + seeder) + quyết định ADR-006 (`INSUFFICIENT_ROLE` chặn cứng vs ngoại lệ) → **slice sau**.
- ✅ **Edit mode global** — 1 nút Edit/Save/Cancel cho cả bảng.
- ✅ **Thay thế hoàn toàn** ma trận app-rows cũ (bỏ Grant/Revoke-all-per-app + RevokeDialog).
- ✅ **Cột = toàn bộ app catalog** (fetch 1 lần, cột ổn định, không re-render khi đổi user).
- ✅ **Khóa picker khi edit** (không thêm/bớt user giữa lúc có thay đổi chưa lưu).
- ✅ **Check-all per row = toggle** (chưa full → check hết app khả thi; đã full → uncheck hết).

**SuperDesign step 1.5 — SKIP (có chủ đích):** user yêu cầu "chạy đến khi merge" (autonomous). Step 1.5 là **gate BLOCKING đợi user duyệt visual** → mâu thuẫn autonomous. Theo tiền lệ slice 1.1 của feature này: bỏ 1.5, đảm bảo đúng visual bằng (1) bám design system `.claude/uiux/` (token `frontend-reference.md`, icon `icon-map.md`, copy `ux-copy.md`) + (2) **E2E gate B (MCP visual walk)** verify giao diện thật.

## 2. Quyết định thiết kế chính

### 2.1 Cách dựng bảng — bespoke table (không dùng `CustomTable`)

`CustomTable` generic gắn với `useListQuery`/pagination/sort và chỉ sticky `thead` top (không sticky cột trái). Ma trận cần **freeze cột user + scroll ngang app** ⇒ dựng **bảng chuyên dụng** trên primitive `ui/table`:

- Container `div.overflow-x-auto` bọc `<table>`.
- Cột user (cell đầu mỗi hàng + ô header góc): `sticky left-0 z-* bg-*` để giữ cố định khi scroll ngang.
- Header row: `sticky top-0` (khi bảng cao). Ô góc trên-trái: `sticky top-0 left-0` z cao nhất.
- Checkbox qua `ui/checkbox` (chưa có `Custom*` wrapper — hợp lệ). Nút qua `CustomButton`. Tooltip qua `CustomTooltip`.

### 2.2 Data & form model

- **Cột** = `useAppCatalog()` — fetch **tất cả app** (mock `getAdminApps()` đã trả full catalog). Query key riêng, **không phụ thuộc `selectedUsers`** ⇒ cột không re-render khi đổi user.
- **Hàng** = `selectedUsers: AdminUser[]` (state ở Board, từ picker — giữ nguyên).
- **Grant state** = `useUserGrants(userIds)` → `Record<userId, string[]>` (granted appIds per user, từ mock).
- **Eligibility tính client-side**: `eligible(user, app) = app.requiredRoles.length === 0 || app.requiredRoles.includes(user.role)`. Không cần server — đã có `user.role` + `app.requiredRoles`.
- **Form (RHF)**: `values = { grants: Record<userId, Record<appId, boolean>> }`. Key = ObjectId hex (an toàn làm object key).
- **Dirty**: `formState.isDirty` so với `defaultValues` (state server hiện tại). Save `disabled` khi `!isDirty` → `CustomTooltip` giải thích.
- **Non-edit KHÔNG bind form** — render trực tiếp từ `userGrants` (icon). Form chỉ "sống" khi edit ⇒ nhẹ.

### 2.3 Trạng thái & hành vi

| Trạng thái | Hiển thị mỗi ô | Control |
| --- | --- | --- |
| **Non-edit** (default) | granted → icon `Check` (`text-success`); not-granted → icon `X` (`text-muted-foreground`); insufficient-role → `Minus`/"—" (`text-muted-foreground`) + tooltip "Không đủ quyền" | read-only |
| **Edit** | Checkbox (checked = granted). Insufficient-role → checkbox **disabled** + tooltip lý do | Checkbox + nút check-all mỗi row |

- **Bấm Edit**: `reset(buildDefaults())` → `isEditing = true` (đảm bảo `isDirty=false` lúc mở). Toolbar đổi Edit → **Save + Cancel**.
- **Check-all (toggle)**: chưa full quyền *eligible* → `setValue` check hết app eligible (`shouldDirty: true`); đã full → uncheck hết. Nhãn/icon đổi theo trạng thái. Row có 0 app eligible → nút disabled.
- **Save**: tính diff (chỉ ô đổi) → `useUpdateUserGrants` (mock mutate) → onSuccess: `reset` theo state mới + `isEditing=false` + toast + `announce`.
- **Cancel**: `reset(defaultValues)` + `isEditing=false`.
- **Picker khóa khi edit**: Board disable `UserMultiSelect` + `SelectedUserChips` remove khi `isEditing`.
- **Thêm user** (ngoài edit): picker → `selectedUsers` thêm phần tử → 1 row mới; form đồng bộ defaults qua ghost.

### 2.4 API contract (mock hiện tại; BE tương lai)

Mock đóng vai server, **in-memory per browser context** (không persist ra ngoài, giống picker slice). Contract mock:

- `getUserGrants(userIds: string[]): Promise<Record<string, string[]>>` — granted appIds per user.
- `updateUserGrants(changes: { userId: string; appId: string; granted: boolean }[]): Promise<void>` — mutate store, idempotent.

BE thật (slice sau, ghi nhận để không drift): dự kiến `GET /admin/entitlements?userIds=` trả matrix + `PATCH /admin/entitlements` nhận batch changes. Không implement ở slice này.

## 3. Kiến trúc component (client)

```
views/AdminEntitlements/
  mains/
    AdminEntitlementsBoard/       (sửa) lift state isEditing → khóa picker + chips khi edit
    AdminEntitlementsMatrix/      (viết lại) orchestrator: FormProvider + toolbar + table + branch loading/empty
  components/
    EntitlementMatrixToolbar/     Edit ↔ Save/Cancel; Save disabled + CustomTooltip khi !isDirty
    EntitlementMatrixTable/       bảng sticky (overflow-x-auto), thead app + body rows
    EntitlementAppHeader/         header cột app (icon + displayName + RoleChip)
    EntitlementUserRow/           1 row: user cell (sticky) + nút check-all + các cell
    EntitlementCell/              edit→Checkbox / non-edit→icon; disable nếu !eligible
    EntitlementMatrixSkeleton/    loading
    EntitlementMatrixEmpty/       khi catalog app rỗng
  ghosts/
    MatrixFormSyncEffect/         reset form theo defaults khi userGrants/selectedUsers/catalog đổi (chỉ khi !editing)
    MatrixAnnouncer/              announce enter-edit / save / cancel / check-all
  hooks/
    useAppCatalog.ts              fetch TẤT CẢ app 1 lần (cột ổn định)
    useUserGrants.ts              grant state per user (mock) + export QUERY_KEY
    useUpdateUserGrants.ts        mutation lưu diff (mock) + invalidate useUserGrants
  index.tsx                      (giữ) render AdminEntitlementsBoard
```

**Xóa (thuộc mô hình app-rows cũ):** `components/AppAccessRow`, `AppAccessAction`, `AppAccessStatus`, `AppAccessIcon`, `AppAccessSkeleton`; `mains/AdminEntitlementsRevokeDialog`; `hooks/useBulkEntitlements`, `useGrantBulk`, `useRevokeBulk`; mock `getBulkEntitlements`/`grantEntitlementBulk`/`revokeEntitlementBulk`; type `BulkEntitlementRow`/`BulkEntitlementInput`. Rà `constants/entitlementStatus` + i18n key cũ (`status.*`, `actions.*`, `revoke.*`) — bỏ nếu không còn dùng.

**Ràng buộc convention (client `.claude`):** file view ≤200 dòng; mỗi component 1 folder `index.tsx`; type props inline; mọi `useEffect` → ghosts; mọi `useQuery`/`useMutation` → `hooks/`; 1 markup block/component (tách loading/empty ra component riêng); dùng `CustomButton`/`CustomTooltip`, không raw; string qua i18n; icon tra `icon-map.md`.

## 4. Mock layer

`@/mocks/AdminEntitlements.ts` viết lại: giữ `MOCK_ENTITLEMENTS` làm store; thay 3 hàm bulk cũ bằng `getUserGrants` + `updateUserGrants` (§2.4). Giữ mô phỏng latency + role-eligibility helper (dùng lại cho eligible check nếu cần, nhưng eligibility chính tính ở FE từ `user.role`).

## 5. i18n (en + vi) — namespace `adminEntitlements`

Bổ sung/điều chỉnh (bỏ key thuộc mô hình cũ nếu không dùng):

- `matrix.title` / `matrix.subtitle` (điều chỉnh nội dung cho layout mới).
- `matrix.edit` = "Edit" / "Chỉnh sửa"; `matrix.save` = "Save" / "Lưu"; `matrix.cancel` = "Cancel" / "Hủy".
- `matrix.saveDisabledTooltip` = "No changes to save." / "Chưa có thay đổi nào để lưu.".
- `matrix.checkAll` / `matrix.uncheckAll` (label/aria cho nút check-all toggle).
- `matrix.userColumn` = "User" / "Người dùng".
- `cell.granted` / `cell.notGranted` / `cell.insufficientRole` (+ aria-label `cell.grantAria` = "Grant {app} to {user}").
- `matrix.insufficientRoleTooltip` = "This user lacks the required role." / "Người dùng này không đủ quyền.".
- `toast.saveSuccess` / `toast.error`.
- `announce.editStart` / `announce.saved` / `announce.canceled` / `announce.checkAll` / `announce.uncheckAll`.

Copy theo `.claude/uiux/ux-copy.md` (tone + EN/VI). Không hardcode string.

## 6. Accessibility

- Checkbox: `aria-label` "Grant {app} to {user}"; disabled + `aria-disabled` khi insufficient role.
- Bảng: `<caption class="sr-only">`; header app `scope="col"`; cell user `scope="row"`.
- `useAnnounce` cho: enter-edit, save, cancel, check-all/uncheck-all, loading→data (rule `accessibility.md` bắt buộc). Announce keys thêm cả en+vi.
- Sticky cột user không phá thứ tự đọc; keyboard: Tab tới Edit → checkbox toggle bằng Space → Save/Cancel reachable.
- Insufficient-role non-edit: icon kèm tooltip text (không chỉ màu) — không dựa mỗi màu để truyền nghĩa.

## 7. Out of scope (YAGNI)

BE thật/persist/seeder; ADR-006; check-all theo cột (1 app cho tất cả user); phân trang/sort user trong bảng; bulk cross-user "grant app X for all rows".

---

## E2E Scenario Matrix

Test file: `client/e2e/admin-entitlements/matrix.e2e.ts` (project `admin`, storageState `admin.json`). Entitlement = **mock in-memory per browser context** → không mutate server, không cần revert. User search = REAL `/admin/users` (để chọn user tạo row). Cột `Gate`: `A+B` = cả 2 gate chạy; `A only` = mutation-heavy, gate B chỉ verify read/render.

| # | Nhóm | Scenario + expected | Kỹ thuật | Gate |
| - | ---- | ------------------- | -------- | ---- |
| 1 | Happy | Admin chọn ≥1 user → ma trận render: rows = user đã chọn, cols = TẤT CẢ app catalog; non-edit hiện icon (Check/X/—) đúng grant state; toolbar có nút "Edit". | — | A+B |
| 2 | AuthN | Chưa đăng nhập vào `/admin/entitlements` → redirect `/login`. | — | A+B |
| 3 | AuthZ | Admin truy cập + thao tác matrix OK. Non-admin denial → **defer** (`test.fixme`, cần non-admin storageState; `admin-authz/` suite đã phủ /admin/* denial). | [DT] role×route | A+B (phần admin) |
| 4 | Validation / expected-error | **[DT]** `isEditing × isDirty × eligible`: (edit + chưa đổi) → Save **disabled** + tooltip; (edit + đổi ≥1 ô) → Save **enabled**; ô `!eligible` → checkbox **disabled**, click không đổi state. Không có free-form input để tamper → phần input-injection **N/A** (chỉ checkbox nhị phân). | [DT] | A+B |
| 5 | Empty / null | Chưa chọn user → empty state "No users selected". App catalog rỗng → `EntitlementMatrixEmpty`. App `iconUrl=null` → fallback icon (không vỡ). | [EP] catalog {rỗng, có} | A+B |
| 6 | Boundary | Nhiều app → container scroll ngang, **cột user vẫn sticky** (đo `getBoundingClientRect` cột user không đổi sau scroll). **[BVA]** eligibleCount của row: `0` → nút check-all disabled; `≥1` → enabled. 1 app (min cột). Không có pager trong matrix → pagination **N/A**. | [BVA] | A+B (B đo sticky visual) |
| 7 | Filter / search | Trong matrix **N/A** — search/filter thuộc picker (đã phủ ở `picker.e2e.ts`); matrix không có filter riêng. | — | — |
| 8 | Data rendering | Ô hiện icon (Check/X) không phải raw `true/false`; header app hiện `displayName` + `RoleChip` (không raw enum `requiredRoles`); không lộ ISO/null. | — | A+B |
| 9 | i18n (en+vi) | Nhãn Edit/Save/Cancel/checkAll + tooltip + header render đúng ở **EN** và **VI**; không có key thiếu `[adminEntitlements.*]`. | — | A+B |
| 10 | Error / loading | Đang tải catalog/userGrants → `EntitlementMatrixSkeleton`. Mock `updateUserGrants` lỗi → toast error + không thoát edit (khó force qua mock → verify skeleton + happy-save; error path ghi follow-up). | Error Guessing | A+B (loading); error → note |
| 11 | Mutation safety | **[ST]** enter-edit → toggle ô → **Save** → thoát edit + non-edit phản ánh grant mới (valid transition); **Cancel** sau khi đổi → revert về state cũ (discard). Double-click Save → lần 2 no-op (đã hết dirty). Mock in-memory per-context → idempotent, không cần revert server. | [ST] | **A only** (B verify read/render, không mutate song song) |
| 12 | a11y | Checkbox có `aria-label` "Grant {app} to {user}"; header app `scope=col`, cell user `scope=row`; `<caption sr-only>`. Keyboard: Tab→Edit, Space toggle checkbox, Save/Cancel reachable. `announce` khi enter-edit/save/cancel/check-all (không im lặng với screen reader). | — | A+B |

### Follow-up / defer (no silent gap)

- **Non-admin AuthZ** (#3): `test.fixme` — cần dedicated non-admin project; `admin-authz/` đã phủ denial /admin/*.
- **Mock error path** (#10): mock `updateUserGrants` luôn success → không có nhánh lỗi để assert; verify loading skeleton + happy save. Error UI verify sâu khi BE thật (slice sau).
- **Sticky đo chính xác** (#6): gate B dùng `browser_evaluate` đo `getBoundingClientRect` cột user trước/sau scroll ngang; gate A assert `position: sticky` class + scroll container.

### Dual-gate (§4.3)

- **Gate A** — `cd client && yarn e2e --project=admin -g "Admin Entitlements Matrix"` trên app thật.
- **Gate B** — MCP browser walk cùng matrix (auth context riêng); walk mọi row `A+B`, SKIP mutation của row `A only` (#11) — chỉ verify read/render.
- Fail → `systematic-debugging` → `e2e-bugs.md` → fix → re-run (max 3 vòng).
