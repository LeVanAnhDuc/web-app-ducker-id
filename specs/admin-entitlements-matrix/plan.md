# AdminEntitlements user×app matrix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thay ma trận entitlement app-rows bằng ma trận **rows = user × cols = app** với edit/save/cancel global, checkbox dirty-tracked, cột user sticky + scroll ngang app. UI-only trên mock.

**Architecture:** Bảng bespoke trên `ui/table` + `position: sticky` (không dùng `CustomTable`). Cột = app catalog fetch 1 lần (React Query, độc lập user). Hàng = `selectedUsers`. RHF form `{ grants: Record<userId, Record<appId, boolean>> }`, `isDirty` gate nút Save. Non-edit render icon từ server state; edit render checkbox từ form. Mutation lưu diff qua mock.

**Tech Stack:** Next.js 15 / React 19, React Hook Form + Zod (dirty), TanStack Query, shadcn `ui/table` + `ui/checkbox`, Tailwind v4, next-intl, lucide-react.

## Global Constraints

- Convention client bắt buộc (đọc `client/.claude/CLAUDE.md` + rules): file `src/views/**` ≤200 dòng; mỗi component = folder `index.tsx` (1 default export); type props **inline**; type dùng chung ở `src/types/AdminEntitlements/`; mọi `useEffect`/`useUpdateEffect` → `ghosts/`; mọi `useQuery`/`useMutation` → `views/<Page>/hooks/`; 1 markup-block/component (tách loading/empty ra component); dùng `CustomButton`/`CustomTooltip` (không raw `<button>`); string qua i18n (en+vi), không hardcode; icon tra `.claude/uiux/icon-map.md`; import groups theo `rules/imports.md`; navigation từ `@/i18n/navigation`.
- Icon: granted=`Check` (`text-success`), not-granted=`X` (`text-muted-foreground`), insufficient=`Minus` (`text-muted-foreground`), Edit=`Pencil`, Save=`Save`, Cancel=`X`, check-all=`CheckCheck`.
- Mock in-memory (giống picker) — không persist server, E2E không cần revert.
- Sau MỖI task đụng code: `cd client && yarn lint` (touched files) + `npx tsc --noEmit`. Green-checks toàn bộ ở gate cuối.

---

### Task 1: Types + constants cleanup

**Files:**
- Modify: `client/src/types/AdminEntitlements/index.ts`
- Check/remove nếu mồ côi: `client/src/constants/entitlementStatus.ts` + entry trong `constants/index.ts`

**Interfaces — Produces:**
```ts
export interface Entitlement { _id: string; userId: string; webAppId: string; grantedBy: string; grantedAt: string; revokedAt: string | null; }
// form values: grants[userId][appId] = granted?
export interface EntitlementMatrixFormValues { grants: Record<string, Record<string, boolean>>; }
export interface EntitlementChange { userId: string; appId: string; granted: boolean; }
```

- [ ] **Step 1:** Trong `types/AdminEntitlements/index.ts`: giữ `Entitlement`; **xóa** `EntitlementStatus`, `BulkEntitlementRow`, `BulkEntitlementInput` (và import `WebApp`, `ENTITLEMENT_STATUS` nếu không còn dùng); thêm `EntitlementMatrixFormValues` + `EntitlementChange`.
- [ ] **Step 2:** `grep -rn "BulkEntitlementRow\|BulkEntitlementInput\|EntitlementStatus\|entitlementStatus\|ENTITLEMENT_STATUS" client/src` → xác định consumer. Nếu `constants/entitlementStatus.ts` chỉ dùng bởi mô hình cũ (status badge app-rows) → xóa file + entry `CONSTANTS.ENTITLEMENT_STATUS` trong `constants/index.ts`. Nếu còn consumer ngoài feature → giữ.
- [ ] **Step 3:** `cd client && npx tsc --noEmit` (sẽ báo lỗi ở file cũ chưa sửa — chấp nhận, sẽ dọn ở Task 9; nếu muốn xanh ngay, làm Task 9 xóa file cũ trước khi tsc). Commit: `refactor(entitlements): matrix form types, drop bulk types`.

---

### Task 2: i18n keys (en + vi)

**Files:**
- Modify: `client/src/locales/en/adminEntitlements.json`
- Modify: `client/src/locales/vi/adminEntitlements.json`

- [ ] **Step 1:** Thêm block `matrix` mới + `cell` + cập nhật `toast`/`announce`; **xóa** key thuộc mô hình cũ không còn dùng (`status.*`, `actions.*`, `revoke.*`, `matrix.subtitle` cũ nếu đổi). EN:
```json
"matrix": {
  "title": "App access",
  "subtitle": "Toggle app access per user, then save.",
  "userColumn": "User",
  "edit": "Edit",
  "save": "Save",
  "cancel": "Cancel",
  "saveDisabledTooltip": "No changes to save.",
  "checkAll": "Grant all eligible apps",
  "uncheckAll": "Revoke all apps",
  "insufficientRoleTooltip": "This user lacks the required role.",
  "empty": { "title": "No apps found", "description": "There are no apps to manage yet." }
},
"cell": { "granted": "Granted", "notGranted": "Not granted", "insufficientRole": "Role required", "grantAria": "Grant {app} to {user}" },
"toast": { "saveSuccess": "Access updated.", "error": "Something went wrong. Please try again." },
"announce": { "results": "{count} users found.", "selected": "Selected {name}.", "deselected": "Removed {name}.", "editStart": "Editing app access.", "saved": "App access saved.", "canceled": "Changes discarded.", "checkAll": "Granted all eligible apps for {name}.", "uncheckAll": "Revoked all apps for {name}." }
```
VI tương ứng (theo `ux-copy.md`): title "Quyền truy cập ứng dụng", userColumn "Người dùng", edit "Chỉnh sửa", save "Lưu", cancel "Hủy", saveDisabledTooltip "Chưa có thay đổi nào để lưu.", checkAll "Cấp tất cả ứng dụng khả dụng", uncheckAll "Thu hồi tất cả ứng dụng", insufficientRoleTooltip "Người dùng này không đủ quyền.", empty.title "Không có ứng dụng", cell.granted "Đã cấp", cell.notGranted "Chưa cấp", cell.insufficientRole "Cần quyền", grantAria "Cấp {app} cho {user}", announce.* tương ứng.
- [ ] **Step 2:** Giữ nguyên `picker.*` + `emptyUser.*` (đang dùng). Commit: `i18n(entitlements): matrix edit-mode strings (en+vi)`.

---

### Task 3: Mock rewrite

**Files:**
- Modify: `client/src/mocks/AdminEntitlements.ts`

**Interfaces — Produces:**
```ts
export const getUserGrants: (userIds: string[]) => Promise<Record<string, string[]>>; // userId -> granted appIds (revokedAt===null)
export const updateUserGrants: (changes: EntitlementChange[]) => Promise<void>; // mutate MOCK_ENTITLEMENTS, idempotent
```

- [ ] **Step 1:** Giữ `MOCK_ENTITLEMENTS`, `seed`, `delay`, `generateId`, `ADMIN_ACTOR_ID`. **Xóa** `getBulkEntitlements`, `grantEntitlementBulk`, `revokeEntitlementBulk`, `deriveStatus`, và helper chỉ phục vụ chúng (`isInsufficientRole` nếu không dùng nữa — eligibility tính ở FE).
- [ ] **Step 2:** Viết `getUserGrants`: với mỗi userId → list `webAppId` có `revokedAt===null`. Trả `delay(record)`.
- [ ] **Step 3:** Viết `updateUserGrants(changes)`: mỗi change `granted===true` → tìm entitlement (userId,appId): có thì set `revokedAt=null` + refresh `grantedAt`, chưa có thì push mới; `granted===false` → set `revokedAt=now` nếu đang active. `delay(undefined)`.
- [ ] **Step 4:** `npx tsc --noEmit` (mock). Commit: `refactor(entitlements): mock getUserGrants + updateUserGrants`.

---

### Task 4: View hooks

**Files:**
- Create: `client/src/views/AdminEntitlements/hooks/useAppCatalog.ts`
- Create: `client/src/views/AdminEntitlements/hooks/useUserGrants.ts`
- Create: `client/src/views/AdminEntitlements/hooks/useUpdateUserGrants.ts`
- Delete: `hooks/useBulkEntitlements.ts`, `hooks/useGrantBulk.ts`, `hooks/useRevokeBulk.ts`

**Interfaces — Produces:**
```ts
// useAppCatalog.ts
export const APP_CATALOG_QUERY_KEY = "adminAppCatalog";
const useAppCatalog: () => UseQueryResult<WebApp[]>; // getAdminApps() → items; staleTime dài (catalog ổn định)
// useUserGrants.ts
export const USER_GRANTS_QUERY_KEY = "adminUserGrants";
const useUserGrants: (userIds: string[]) => UseQueryResult<Record<string,string[]>>; // enabled userIds.length>0
// useUpdateUserGrants.ts
const useUpdateUserGrants: () => UseMutationResult<void, unknown, EntitlementChange[]>; // onSuccess invalidate [USER_GRANTS_QUERY_KEY], toast saveSuccess; onError toast error
```

- [ ] **Step 1:** `useAppCatalog`: `useQuery({ queryKey:[APP_CATALOG_QUERY_KEY], queryFn: async()=> (await getAdminApps()).items })`. Không phụ thuộc user.
- [ ] **Step 2:** `useUserGrants(userIds)`: `queryKey:[USER_GRANTS_QUERY_KEY, userIds]`, `queryFn:()=>getUserGrants(userIds)`, `enabled: userIds.length>0`.
- [ ] **Step 3:** `useUpdateUserGrants`: `mutationFn: updateUserGrants`, `onSuccess: invalidate [USER_GRANTS_QUERY_KEY] + toast.success(tToast("saveSuccess"))`, `onError: toast.error(tToast("error"))` (namespace `adminEntitlements.toast`). Consumer làm announce/exit-edit qua per-call `onSuccess`.
- [ ] **Step 4:** Xóa 3 hook cũ. `npx tsc --noEmit`. Commit: `feat(entitlements): matrix query/mutation hooks`.

---

### Task 5: EntitlementCell + EntitlementAppHeader

**Files:**
- Create: `client/src/views/AdminEntitlements/components/EntitlementCell/index.tsx`
- Create: `client/src/views/AdminEntitlements/components/EntitlementAppHeader/index.tsx`

**Interfaces — Produces:**
```tsx
// EntitlementCell — 1 ô: non-edit icon / edit checkbox
const EntitlementCell = ({ isEditing, granted, eligible, fieldName, appName, userName }: {
  isEditing: boolean; granted: boolean; eligible: boolean; fieldName: string; appName: string; userName: string;
}) => ReactNode;
// EntitlementAppHeader — header 1 cột app
const EntitlementAppHeader = ({ app }: { app: WebApp }) => ReactNode;
```

- [ ] **Step 1:** `EntitlementCell`:
  - `!isEditing`: `!eligible` → `<Minus className="size-4 text-muted-foreground">` bọc `CustomTooltip` (insufficientRoleTooltip); `granted` → `<Check className="size-4 text-success">`; else `<X className="size-4 text-muted-foreground">`. Thêm `aria-label` mô tả (cell.granted/notGranted/insufficientRole).
  - `isEditing`: `<Controller name={fieldName}>` render `ui/checkbox` `<Checkbox checked disabled={!eligible} onCheckedChange />`; `aria-label` = grantAria(app,user). `!eligible` → checkbox disabled + `CustomTooltip` lý do. (Field name `grants.${userId}.${appId}`.)
  - Dùng `useTranslations("adminEntitlements.cell")` + `.matrix`.
- [ ] **Step 2:** `EntitlementAppHeader`: icon app (fallback nếu `iconUrl` null — dùng pattern `AppAccessIcon` cũ hoặc `CustomImage`) + `displayName` + `requiredRoles.map(RoleChip)` (reuse `@/views/AdminApps/components/RoleChip`). Vertical, compact cho header cột.
- [ ] **Step 3:** `npx tsc --noEmit` + lint. Commit: `feat(entitlements): matrix cell + app header`.

---

### Task 6: EntitlementUserRow (sticky user cell + check-all)

**Files:**
- Create: `client/src/views/AdminEntitlements/components/EntitlementUserRow/index.tsx`

**Interfaces — Consumes:** `EntitlementCell`. **Produces:**
```tsx
const EntitlementUserRow = ({ user, apps, isEditing, grantedAppIds, onCheckAllToggle }: {
  user: AdminUser; apps: WebApp[]; isEditing: boolean; grantedAppIds: string[];
  onCheckAllToggle: (user: AdminUser, eligibleAppIds: string[], nextGranted: boolean) => void;
}) => ReactNode;
```
Helper eligibility (đặt `src/utils` hoặc inline): `isEligible(user, app) = app.requiredRoles.length === 0 || app.requiredRoles.includes(user.role)`.

- [ ] **Step 1:** Render `<TableRow>`: cell đầu = user (avatar + fullName + email) với class sticky `sticky left-0 z-10 bg-card` (+ shadow phải để tách khi scroll). Nếu `isEditing` → thêm nút check-all (`CustomButton size="sm" variant="ghost"` icon `CheckCheck`, `aria-label` checkAll/uncheckAll). Row có 0 app eligible → nút disabled.
- [ ] **Step 2:** check-all: tính `eligibleAppIds = apps.filter(a=>isEligible(user,a)).map(_id)`; đọc form value hiện tại của row (qua `useWatch`/`getValues`) để biết đã full chưa → `nextGranted = !allEligibleChecked`; gọi `onCheckAllToggle(user, eligibleAppIds, nextGranted)`.
- [ ] **Step 3:** Map `apps` → `<EntitlementCell>` mỗi cột, truyền `fieldName={`grants.${user._id}.${app._id}`}`, `granted = grantedAppIds.includes(app._id)`, `eligible = isEligible(user,app)`.
- [ ] **Step 4:** `npx tsc --noEmit` + lint. Commit: `feat(entitlements): matrix user row + check-all toggle`.

---

### Task 7: Table + Skeleton + Empty

**Files:**
- Create: `client/src/views/AdminEntitlements/components/EntitlementMatrixTable/index.tsx`
- Create: `client/src/views/AdminEntitlements/components/EntitlementMatrixSkeleton/index.tsx`
- Create: `client/src/views/AdminEntitlements/components/EntitlementMatrixEmpty/index.tsx`

**Interfaces — Consumes:** `EntitlementUserRow`, `EntitlementAppHeader`. **Produces:**
```tsx
const EntitlementMatrixTable = ({ users, apps, isEditing, grantsByUser, onCheckAllToggle }: {
  users: AdminUser[]; apps: WebApp[]; isEditing: boolean;
  grantsByUser: Record<string,string[]>; onCheckAllToggle: (...) => void;
}) => ReactNode;
```

- [ ] **Step 1:** `EntitlementMatrixTable`: `<div className="overflow-x-auto ...">` bọc `<Table>` (`ui/table`). `<caption class="sr-only">`. `<TableHeader>`: ô góc `scope=col` sticky `left-0 top-0 z-20 bg-card` = label `matrix.userColumn`; mỗi app → `<TableHead scope="col">` render `EntitlementAppHeader`. `<TableBody>`: mỗi user → `EntitlementUserRow`. User cell đã sticky trong row (Task 6).
- [ ] **Step 2:** `EntitlementMatrixSkeleton`: vài dòng `ui/skeleton` mô phỏng bảng.
- [ ] **Step 3:** `EntitlementMatrixEmpty`: empty state `matrix.empty.title/description` (icon `LayoutGrid` hoặc `Package`), pattern giống `UserNotSelectedEmpty`.
- [ ] **Step 4:** `npx tsc --noEmit` + lint. Commit: `feat(entitlements): matrix table + skeleton + empty`.

---

### Task 8: Toolbar (Edit/Save/Cancel + dirty tooltip)

**Files:**
- Create: `client/src/views/AdminEntitlements/components/EntitlementMatrixToolbar/index.tsx`

**Interfaces — Produces:**
```tsx
const EntitlementMatrixToolbar = ({ isEditing, isDirty, isSaving, onEdit, onCancel }: {
  isEditing: boolean; isDirty: boolean; isSaving: boolean; onEdit: () => void; onCancel: () => void;
}) => ReactNode; // Save là submit button (type=submit) — form onSubmit ở orchestrator
```

- [ ] **Step 1:** `!isEditing` → 1 `CustomButton` (icon `Pencil`) "Edit" gọi `onEdit`.
- [ ] **Step 2:** `isEditing` → `CustomButton variant=outline` "Cancel" (`onCancel`) + Save `CustomButton type="submit"` (icon `Save`, `loading={isSaving}`, `disabled={!isDirty || isSaving}`). Khi `!isDirty` bọc Save trong `CustomTooltip content={saveDisabledTooltip}` (tooltip vẫn hiện dù disabled — wrap span). 
- [ ] **Step 3:** `npx tsc --noEmit` + lint. Commit: `feat(entitlements): matrix toolbar with dirty-gated save`.

---

### Task 9: Matrix orchestrator + ghosts + xóa file cũ

**Files:**
- Rewrite: `client/src/views/AdminEntitlements/mains/AdminEntitlementsMatrix/index.tsx`
- Create: `client/src/views/AdminEntitlements/ghosts/MatrixFormSyncEffect/index.tsx`
- Create: `client/src/views/AdminEntitlements/ghosts/MatrixAnnouncer/index.tsx`
- Delete: `mains/AdminEntitlementsRevokeDialog/`, `components/AppAccessRow/`, `AppAccessAction/`, `AppAccessStatus/`, `AppAccessIcon/`, `AppAccessSkeleton/`

**Interfaces — Consumes:** hooks (Task 4), Table/Skeleton/Empty (Task 7), Toolbar (Task 8), ghosts.
**Produces:** `AdminEntitlementsMatrix({ selectedUsers, isEditing, onEditingChange }: { selectedUsers: AdminUser[]; isEditing: boolean; onEditingChange: (v:boolean)=>void })`.

- [ ] **Step 1:** Orchestrator: `useForm<EntitlementMatrixFormValues>({ defaultValues: { grants: {} } })`, `FormProvider`. `useAppCatalog()`, `useUserGrants(userIds)`, `useUpdateUserGrants()`. `buildDefaults(users, apps, grantsByUser)` → `{ grants }`.
  - Branch: `isLoading` → `<EntitlementMatrixSkeleton/>`; catalog rỗng → `<EntitlementMatrixEmpty/>`; else `<form onSubmit={handleSubmit(onSave)}>` chứa `EntitlementMatrixToolbar` + `EntitlementMatrixTable`.
- [ ] **Step 2:** `onEdit`: `reset(buildDefaults(...))` rồi `onEditingChange(true)`. `onCancel`: `reset(buildDefaults(...))` + `onEditingChange(false)`. `onSave(values)`: diff values vs defaults → `EntitlementChange[]`; `updateMutation.mutate(changes, { onSuccess: ()=>{ onEditingChange(false); announce saved } })`. `onCheckAllToggle`: `eligibleAppIds.forEach(id => setValue(`grants.${user._id}.${id}`, nextGranted, { shouldDirty:true }))` + announce checkAll/uncheckAll.
  - Diff helper: so sánh `values.grants[u][a]` với default; chỉ push ô khác.
- [ ] **Step 3:** `MatrixFormSyncEffect` ghost: `useEffect` reset form theo `buildDefaults` khi `[userGrants, selectedUsers, apps]` đổi **và** `!isEditing` (tránh ghi đè khi đang sửa). Nhận props cần thiết + `reset` từ `useFormContext`.
- [ ] **Step 4:** `MatrixAnnouncer` ghost: `useUpdateEffect` announce khi `isEditing` đổi (editStart khi true). (Save/cancel/checkAll announce ở handler per-call — hoặc gom vào ghost nếu gọn hơn; giữ nhất quán rule "useEffect trong ghost".)
- [ ] **Step 5:** Xóa các folder cũ (RevokeDialog, AppAccess*). `grep` đảm bảo không còn import. `npx tsc --noEmit` + lint. Commit: `feat(entitlements): matrix orchestrator + form sync, remove app-rows model`.

---

### Task 10: Board wiring — lock picker khi edit

**Files:**
- Modify: `client/src/views/AdminEntitlements/mains/AdminEntitlementsBoard/index.tsx`
- Modify (nếu cần prop disabled): `components/UserMultiSelect/index.tsx`, `components/SelectedUserChips/index.tsx`

**Interfaces — Consumes:** `AdminEntitlementsMatrix({ selectedUsers, isEditing, onEditingChange })`.

- [ ] **Step 1:** Board thêm `const [isEditing, setIsEditing] = useState(false)`. Truyền `disabled={isEditing}` vào `UserMultiSelect` (chặn mở popover/search) + `SelectedUserChips` (ẩn/disable nút remove `×` khi editing). Thêm prop `disabled?: boolean` vào 2 component đó (inline type), no-op khi undefined.
- [ ] **Step 2:** Bỏ state `revokeTarget` + `AdminEntitlementsRevokeDialog` (đã xóa). Render `<AdminEntitlementsMatrix selectedUsers={selectedUsers} isEditing={isEditing} onEditingChange={setIsEditing} />` khi `selectedUsers.length>0`, else `<UserNotSelectedEmpty/>`.
- [ ] **Step 3:** `npx tsc --noEmit` + lint. Commit: `feat(entitlements): lock picker during edit + wire matrix`.

---

### Task 11: E2E — matrix suite + e2e.md

**Files:**
- Create: `client/e2e/admin-entitlements/matrix.e2e.ts`
- Create: `docs/specs/admin-entitlements-matrix/e2e.md`
- Verify: `client/playwright.config.ts` đã include `admin-entitlements/` trong project `admin` (slice 1.1 đã thêm — chỉ cần confirm, không sửa nếu đã có).

- [ ] **Step 1:** Viết `e2e.md` = expand E2E Scenario Matrix từ `design.md` (rubric 12 nhóm, cột Gate, follow-up/defer). Reuse format `admin-entitlements-picker-refinement/e2e.md`.
- [ ] **Step 2:** Viết `matrix.e2e.ts` (project `admin`): 1 test/scenario Applicable. Reuse helper `client/e2e/helpers/` + storageState admin. Chọn user thật qua picker (search REAL) để tạo row. Case chính:
  - Happy: chọn user → bảng render, header "App access", non-edit không có checkbox (chỉ icon).
  - Edit toggle: click Edit → checkbox xuất hiện + Save/Cancel; Save disabled ban đầu (chưa dirty) + tooltip.
  - Dirty: toggle 1 checkbox eligible → Save enabled; Cancel → về non-edit, icon như cũ.
  - Save: toggle → Save → về non-edit, icon phản ánh thay đổi (mock in-context).
  - Insufficient-role: cell disabled trong edit (nếu seed có app requiredRoles admin + chọn user thường).
  - Check-all toggle: click check-all row → tất cả cell eligible checked; click lần nữa → uncheck.
  - Picker lock: trong edit, search input/remove chip disabled.
  - Sticky: scroll ngang container → cột user `position:sticky` (assert class + `boundingBox` không đổi).
  - i18n: EN "Edit"/"App access"; VI "Chỉnh sửa"/"Quyền truy cập ứng dụng"; không `[adminEntitlements.*]` missing.
  - a11y: checkbox có aria-label; Escape/keyboard.
  - Non-admin AuthZ → `test.fixme` (defer, ghi lý do).
- [ ] **Step 3:** Không chạy ở đây (dual-gate ở §4.3 làm sau khi build xong). Commit: `test(entitlements): matrix e2e suite + e2e.md`.

---

## Self-Review

- **Spec coverage:** §2.1 bespoke table→T7; §2.2 data/form→T1,T4,T9; §2.3 states/edit/check-all/save/cancel→T5,T6,T8,T9; picker lock→T10; §4 mock→T3; §5 i18n→T2; §6 a11y→T5,T6,T7,T9; E2E matrix→T11. Không gap.
- **Placeholder scan:** interfaces + logic chính đã cụ thể; boilerplate theo convention skill (subagent đọc rules). Không "TBD".
- **Type consistency:** `EntitlementMatrixFormValues.grants[userId][appId]:boolean`, `EntitlementChange{userId,appId,granted}`, field name `grants.${userId}.${appId}`, query keys `APP_CATALOG_QUERY_KEY`/`USER_GRANTS_QUERY_KEY` — dùng nhất quán T1→T11.
