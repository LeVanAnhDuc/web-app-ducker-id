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
