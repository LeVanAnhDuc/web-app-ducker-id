# Design — GET list user cho trang Admin

> Feature: `admin-users-list` · Branch: `feat/admin-users-list` · Cross-stack (BE + FE)

## 1. Mục tiêu & phạm vi

Cung cấp danh sách user cho trang admin (`/admin/users`).

**Trong scope (chỉ đọc):**

- BE: endpoint `GET /api/v1/admin/users` — phân trang, filter, trả dữ liệu compose từ User + Authentication + login_histories.
- FE: wire `useAdminUsersList` từ mock (`@/mocks/AdminUsers`) sang API thật; thêm phân trang vào bảng.

**Ngoài scope:** các mutation đã scaffold (reset password / lock-unlock / force-logout) — **giữ nguyên mock**, là feature riêng sau này.

## 2. Hiện trạng

- **FE**: View `AdminUsers` (Table, Toolbar, badges, dialog) đã scaffold đầy đủ. Hook `useAdminUsersList` đang gọi mock trả `{ items: AdminUser[] }` (không phân trang, bảng chưa có pager). Filter `search`/`role`/`status` đẩy qua URL searchParams.
- **BE**: module `user` chỉ có `/me`, `PATCH /me`, `/:id` — **chưa có** admin list. Pattern admin-list để clone: `admin/login-history` (`authGuard` + `adminGuard` + `queryPipe` → controller → service → repository → DTO → swagger).

## 3. API Contract (BE DTO ↔ FE type)

FE `AdminUser` (giữ nguyên, không đổi field):

```ts
interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: AuthenticationRole;     // "user" | "admin"
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
```

Nguồn dữ liệu mỗi field:

| Field | Nguồn BE |
| --- | --- |
| `fullName`, `email`, `avatar`, `createdAt` | collection `users` (User model) |
| `role` | `Authentication.roles` (**array**) → map về 1 role |
| `isActive` | `Authentication.isActive` |
| `lastLoginAt` | `login_histories`: login `status = success` gần nhất, `userId == auth._id` |

### Response shape (có phân trang)

```ts
interface PaginatedAdminUsersResponse {
  items: AdminUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
```

`meta` dùng shape của `LoginHistoryMeta` (FE) để nhất quán với sibling admin-list gần nhất. **Lưu ý drift (mục 7).**

### Query params

```ts
interface AdminUsersQueryParams {
  page?: number;     // default 1
  limit?: number;    // default 20
  search?: string;   // regex trên fullName + email
  role?: "user" | "admin";
  status?: "active" | "locked";   // active → isActive=true; locked → isActive=false
  sortBy?: "createdAt" | "fullName" | "lastLoginAt";  // default createdAt
  order?: "asc" | "desc";         // default desc
}
```

## 4. Backend — mở rộng module `server/src/modules/user`

### 4.1 Route

`GET /api/v1/admin/users` — `authGuard` + `adminGuard` + `queryPipe(adminUsersQuerySchema)`.

- Thêm `createUserAdminRoutes(controller)` (mount `/admin/users`) vào `user.module.ts`, theo đúng pattern `createLoginHistoryAdminRoutes`.
- Đăng ký router trong `loaders/modules.loader.ts` (`routes.userAdmin`, mount dưới `/api/v1`).

### 4.2 Validator

`server/src/validators/schemas/user.ts` — thêm `adminUsersQuerySchema` (zod): coerce `page`/`limit` về number + bound; `role`/`status`/`sortBy`/`order` enum optional; `search` string trim optional.

### 4.3 Service

`UserService.getAdminUsers(query)`:

1. Chuẩn hoá pagination (`skip`, `limit`, `sort`) — tái dùng helper kiểu `PaginationOptions` (xem login-history).
2. Gọi repository aggregation.
3. Map kết quả qua DTO + build `meta`.

### 4.4 Repository — MongoDB aggregation (base = `users`)

Pipeline:

1. `$lookup` `authentication` qua `authId` → `$unwind` (1-1 vì authId unique). Có `roles`, `isActive`.
2. `$match` filter:
   - `search` → `$or` regex (escape) trên `fullName`, `email`.
   - `role` → match `auth.roles` chứa role tương ứng.
   - `status` → `auth.isActive` (`active`→true, `locked`→false).
3. `$lookup` `login_histories` (sub-pipeline): `userId == auth._id` & `status = success`, `$sort createdAt desc`, `$limit 1`, project `createdAt` → field `lastLoginAt`.
4. `$facet`:
   - `data`: `$sort` (theo sortBy/order; `lastLoginAt` sort cần handle null) → `$skip` → `$limit`.
   - `total`: `$count`.

### 4.5 DTO

`toAdminUserDto(doc)` → `AdminUser`. Map `role`: `roles` chứa `admin` → `"admin"`, ngược lại `"user"`.

### 4.6 Swagger

Bổ sung path + schema cho `GET /admin/users` theo `standard-doc-api` (developer tự lo, đồng bộ Postman nếu có).

### 4.7 Index

Đảm bảo index `login_histories { userId: 1, status: 1, createdAt: -1 }` để sub-pipeline `lastLoginAt` không full-scan.

## 5. Frontend — `client/`

- `constants/endpoints.ts`: thêm `ADMIN_USERS = "/admin/users"`.
- `types/AdminUsers/index.ts`: thêm `PaginatedAdminUsersResponse { items, meta }`; bổ sung `page`/`limit`/`sortBy`/`order` vào `AdminUsersQueryParams`.
- `requests/adminUsers.ts` (mới): `getAdminUsers(params)` → `axiosInstance.get<ResponsePattern<PaginatedAdminUsersResponse>>(END_POINTS.ADMIN_USERS, { params })` (clone `loginHistory.getAdminLoginHistory`).
- `useAdminUsersList`: thay `getAdminUsersList` (mock) → `getAdminUsers`; trả `{ items, meta }`; query key giữ `[ADMIN_USERS_LIST_QUERY_KEY, params]`.
- `AdminUsersTable`: đọc `page` từ URL searchParams (đưa vào params); render pager — tái dùng `components/TablePagination` hoặc `CustomPagination` (chọn cái khớp pattern login-history admin table).
- Mock: `getAdminUsersList` trong `mocks/AdminUsers.ts` thành dead code → xoá (giữ helper khác nếu còn dùng nơi khác — kiểm tra trước khi xoá).

## 6. Error handling & Testing

- **Error**: `adminGuard` → 403 (không phải admin); `queryPipe` → 400 (param sai). Dùng cơ chế response/exception sẵn có.
- **BE test** (jest): unit cho service (map DTO, build meta, role mapping) + repository (filter/aggregation). Lưu ý chạy jest trong worktree: dùng `npx jest --testMatch "**/?(*.)+(spec).ts"`.
- **FE E2E** (Playwright, §4.3): trang `admin/users` — load list thật, filter theo role/status/search, đổi trang. Artifact `client/e2e/admin-users-list/*.e2e.ts` + `docs/specs/admin-users-list/e2e.md`.

## 7. Drift đã ghi nhận (cần biết khi plan)

1. **role array → single**: `Authentication.roles` là array; FE `role` single. Map admin-if-includes-admin trong DTO.
2. **2 meta shape**: FE `LoginHistoryMeta {total,page,limit,totalPages}` vs BE common `PaginationMeta {page,pageSize,totalItems,totalPages,hasNext,hasPrev}`. Chọn theo FE login-history cho nhất quán admin-list; controller tự map về shape này.
3. **lastLoginAt**: lấy bằng aggregate `login_histories` (`userId = auth._id`, `status = success`). Cần index (mục 4.7) để tránh chậm.

## 8. Isolation

Worktree per-repo đã tạo từ `origin/main`, branch `feat/admin-users-list`: `docs/`, `server/`, `client/` tại `<repo>/.worktrees/admin-users-list/`.

## 9. E2E Scenario Matrix

> Trang đích: `/admin/users` (en) · `/vi/admin/users` (vi). Read-only list, filter/page driven qua URL searchParams. Auth dùng admin storageState (`auth.setup` với `E2E_USER_EMAIL=admin@test.com`). Seed reference: `admin@test.com`, `user@test.com`, `inactive@test.com`.
>
> Walk đủ 12 nhóm rubric `e2e-scenario-coverage` (breadth) + tag `[technique]` + giá trị cụ thể (depth). Cột `Gate`: `A` = `yarn e2e` (deterministic, committed), `B` = MCP walk (visual/UX/console/network). Marker `[EXISTS]` = đã có trong `admin-users-list.e2e.ts`; `[NEW]` = chưa có, cần bổ sung. Một số row phụ thuộc code-fix prereq (xem §10).

| # | Category | Status (✅/N/A) | Scenario(s) + expected + [technique] + values | Gate |
| --- | --- | --- | --- | --- |
| 1 | Happy path | ✅ `[EXISTS]` | Admin mở `/admin/users` → bảng populate từ API thật. `[EP]` admin có ≥2 user → cell `admin@test.com` **và** `user@test.com` đều visible; table có header `user/role/status/lastLoginAt/createdAt`. | A+B |
| 2 | AuthN (chưa đăng nhập) | ✅ `[NEW]` | Context **không cookie + storageState undefined** → goto `/admin/users` → redirect `/login` (không thấy bảng). `[EP]` unauthenticated → bounce. **Fresh context**: `clearCookies()` + `storageState: undefined` (cookie localhost không scope theo port — xem memory `reference_e2e_suite_session_contamination`). | A+B |
| 3 | AuthZ (sai role) | ✅ `[NEW]` (high) | `[DT]` Decision Table role → outcome: **role=admin** (allow) → list render; **role=user** (deny) → BE `adminGuard` 403 → FE chặn (redirect/forbidden UI, KHÔNG thấy danh sách user khác). Cần **user-storageState chạy trên route admin** → phụ thuộc **CF-1** (config routing, §10). | A+B |
| 4 | Validation (param tampering) | ✅ `[NEW]` | Params bịa qua URL. `[EP]` lớp tương đương: `?page=abc` → FE coerce (`Number.isInteger`+`>=1` guard ở `AdminUsersTable`) về page 1, render bình thường; `?limit=-1` & `?limit=101` → BE `queryPipe` 400; `?role=superadmin` (ngoài enum `user/admin`) → BE 400 (FE `isRole` guard cũng drop param không hợp lệ). | A (+B) |
| 5 | Empty / null | ✅ `[NEW]` | `[EP]` `?search=zzz-nomatch` → `items.length===0` → `UsersEmptyState` hiển thị text `adminUsers.table.empty` + `emptyDescription`. `[EP]` user có `lastLoginAt=null` → cell render `t("neverLoggedIn")` ("Never"/"Chưa đăng nhập"), KHÔNG để trống/ISO. | A+B |
| 6 | Boundary / pagination | ✅ `[NEW]` | `[BVA]` biên `limit`: `limit=1` (min hợp lệ), `limit=100` (max hợp lệ), `limit=101` (vượt max → 400). Pager `TablePagination` render unconditional → next/prev điều hướng đổi `?page=` qua `router.push` (cần seed **>20 user** mới có ≥2 trang; seed hiện <20 → **follow-up seed**, tạm verify `?page=2` của dataset 1-trang trả empty như `[EXISTS]`). Sort toggle UI: **N/A** — bảng chưa có control sort (`sortBy/order` chỉ ở contract, header không clickable) → **flag follow-up**. | A |
| 7 | Filter / search | ✅ `[NEW]` (partial `[EXISTS]`) | `[EXISTS]` single-param: `?role=admin` (chỉ admin), `?search=inactive` (match `inactive@test.com`), `?status=locked` (surface deactivated). **ADD** `[DT]` combined `?role=user&status=active` → chỉ user active; `[ST]` state-transition: set filter → reload trang → URL param **persist** (toolbar đọc lại từ `searchParams`, list khớp). | A+B |
| 8 | Data rendering | ✅ `[NEW]` | `[EP]` `UserRoleBadge`/`UserStatusBadge` render **localized label** (không raw enum `"admin"`/bool `true`); `createdAt` qua `formatDateTimeShort` (không ISO raw); `lastLoginAt=null` → `t("neverLoggedIn")`. Verify label hiển thị khác giá trị thô. | A+B |
| 9 | i18n (en + vi) | ✅ `[NEW]` — **MANDATORY** | `[DT]` locale → label: render list + `UsersEmptyState` + badges (role/status) + "Never" + pagination labels (`page/of/results`) ở **`/admin/users` (en)** AND **`/vi/admin/users` (vi)`. Mỗi locale text khác nhau, không hardcode, không key trồi (`adminUsers.*`). URL prefix vi giữ đúng (i18n navigation). | A+B |
| 10 | Error / loading | ✅ `[NEW]` | `[EG]` error-guessing: route-intercept `GET /api/v1/admin/users` → **500** → UI lỗi rõ ràng (distinct error state, không trắng/không crash). Hiện hook `useAdminUsersList` chỉ trả `isLoading` → **phụ thuộc CF-2** (thêm nhánh `isError`, §10). Loading: trong lúc fetch → `UsersTableSkeleton` visible (`isLoading` branch đã có). | A+B |
| 11 | Mutation safety | N/A | List **read-only** trong scope (§1). Dialog reset-password / lock-unlock / force-logout còn là **mock**, ngoài scope feature này → không có mutation thật để test an toàn. Re-evaluate khi mutation được wire API thật. | — |
| 12 | Accessibility | ✅ `[NEW]` | `[EP]` selector theo role/label: table có `role="table"`, column headers (`columnheader`), toolbar combobox role/status có `aria-label` (Select), search có `ariaLabel`. Keyboard: tab order qua toolbar → table → pager. `useAnnounce` thông báo pagination/filter/search/loading thay đổi cho screen reader → hiện **chưa wire** → **phụ thuộc CF-4** (§10). Selector ưu tiên role/label; DOM không hỗ trợ thì `input[name]`/`data-testid`, KHÔNG sửa app code (flag follow-up). | B |

**Technique tags**: `[EP]` Equivalence Partitioning · `[BVA]` Boundary Value Analysis · `[DT]` Decision Table · `[ST]` State Transition · `[EG]` Error Guessing.

**Dual-gate note (§4.3)**: gate B login bằng auth context riêng (không share storageState với A). Mọi row read-only nên không có cột `A only` mutation-heavy; gate B chỉ verify read/render.

## 10. Known code fixes prereq (E2E backfill phụ thuộc)

Một số row của matrix §9 không thể PASS với code hiện tại — cần các fix sau (ngoài scope authoring design này, ghi để `writing-plans` pick up):

- **CF-1 — Config routing cho AuthZ (row 3)**: `playwright.config.ts` hiện chỉ có project `chromium` (user storageState, `testIgnore: /admin-apps\//`) và `admin` (`testMatch: /admin-apps\//`, admin storageState). Để test **role=user truy cập route admin bị deny**, cần một project/cấu hình chạy `admin-users-list` với **user storageState** trên route admin (hoặc spec riêng dùng fresh user context). Hiện suite `admin-users-list` chạy dưới admin storageState (qua `auth.setup` `E2E_USER_EMAIL=admin@test.com`) → không cover được nhánh deny.
- **CF-2 — `isError` branch (row 10)**: `useAdminUsersList` + `AdminUsersTable` hiện chỉ tiêu thụ `isLoading` (skeleton) và `data`. Khi API 500, `data` undefined → render bảng rỗng / empty-state giả, KHÔNG có error UI phân biệt. Cần thêm nhánh `isError` → error state riêng (retry/thông báo) để row 10 assert được.
- **CF-4 — `useAnnounce` wiring (row 12)**: `AdminUsersTable`/`AdminUsersToolbar` chưa gọi `useAnnounce` (`src/hooks/useAnnounce.ts`) cho pagination / filter / search / loading change. Theo `rules/accessibility.md` các dynamic change này MANDATORY phải announce. Cần wire + thêm `announce` keys vào `en/` + `vi/` namespace `adminUsers`.

**Param-name drift cần biết**: Contract §3.6 (`AdminUsersQueryParams`) đặt tên `order?: "asc" | "desc"`, nhưng validator BE (`adminUsersQuerySchema`) dùng tên **`sortOrder`**. Drift `order` ↔ `sortOrder` phải reconcile (đồng bộ FE type ↔ BE schema ↔ swagger) trước khi test sort/order param — hiện chưa có UI sort (row 6 N/A) nên chưa block, nhưng flag để `writing-plans` xử lý.
