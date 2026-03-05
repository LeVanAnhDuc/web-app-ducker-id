# IMPLEMENTATION PLAN: Login History — Query API (v2.0)

> Tạo từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 19         |
| Hoàn thành   | 12/19      |
| Tiến độ      | 63%        |
| Ngày bắt đầu | 05/03/2026 |

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

---

### Phase 1: Setup & Foundation (Server)

#### TASK-001: Thêm types mới vào `login-history.ts`

- **Tham chiếu:** TL3 - Mục 3.8
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm interface `PaginationParams { page, limit }`
  - [ ] Thêm interface `LoginHistoryQuery extends PaginationParams` (14 filter/sort params)
  - [ ] Thêm interface `LoginHistoryAdminQuery extends LoginHistoryQuery` (thêm `userId`, `ip`, mở rộng `sortBy`)
  - [ ] Thêm interface `LoginHistoryItem` (User API response — không có fields nhạy cảm)
  - [ ] Thêm interface `LoginHistoryAdminItem extends LoginHistoryItem` (full fields)
  - [ ] Thêm interface `PaginatedResult<T> { items, meta: { total, page, limit, totalPages } }`
  - [ ] Export tất cả types mới
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/login-history.ts` (sửa)

---

#### TASK-002: Tạo `admin.guard.ts`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-05.9
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo class `AdminGuard` theo pattern của `auth.guard.ts`
  - [ ] Implement `canActivate(req)`: check `req.user` tồn tại, check `req.user.roles === 'admin'`
  - [ ] Throw `ForbiddenError(t('common:errors.forbidden'))` nếu không phải admin
  - [ ] Expose `get middleware(): RequestHandler`
  - [ ] Export `AdminGuard`
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/admin.guard.ts` (tạo mới)
- **Test cần pass:** TC-05.9 (403 với non-admin), TC-05.10 (401 không có token — do AuthGuard trước)

---

#### TASK-003: Tạo `validators/schemas/login-history.ts`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - Mục 2.3
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Import Joi và các enum values từ `constants/enums`
  - [ ] Tạo `loginHistoryQuerySchema`: validate `page` (integer ≥ 1), `limit` (1–100), `status` (enum), `method` (enum), `deviceType` (enum), `clientType` (enum), `country/city/os/browser` (string, trim), `fromDate/toDate` (ISO date), `sortBy` (enum), `sortOrder` (enum)
  - [ ] Thêm custom validation: `toDate >= fromDate` nếu cả hai đều có
  - [ ] Tạo `loginHistoryAdminQuerySchema extends loginHistoryQuerySchema`: thêm `userId` (ObjectId pattern `/^[a-fA-F0-9]{24}$/`), `ip` (string, trim), mở rộng `sortBy` enum
  - [ ] Tất cả fields là `optional()`
  - [ ] `.options({ stripUnknown: true })`
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/login-history.ts` (tạo mới)
- **Test cần pass:** TC-04.13, TC-04.14 (400 khi invalid params), TC-05.8 (400 khi invalid userId)

---

#### TASK-004: Tạo `internals/query-builder.ts`

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo function `buildLoginHistoryFilter(query: LoginHistoryAdminQuery, userId?: string): FilterQuery<LoginHistoryDocument>`
  - [ ] Exact match fields: `status`, `method`, `deviceType`, `clientType`
  - [ ] Partial match (case-insensitive regex) fields: `country`, `city`, `os`, `browser`, `ip`
  - [ ] Date range: nếu có `fromDate` hoặc `toDate` → build `createdAt: { $gte, $lte }`
  - [ ] `userId` filter: nếu có → thêm `{ userId: new Types.ObjectId(userId) }`
  - [ ] Chỉ thêm field vào filter nếu value tồn tại (tránh empty filter)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/internals/query-builder.ts` (tạo mới)

---

#### TASK-005: Thêm `maskIp()` vào `internals/helpers.ts`

- **Tham chiếu:** TL3 - Mục 3.6, TL2 - NF-04
- **Ước lượng:** 0.5h
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm function `maskIp(ip: string): string`
  - [ ] IPv4 (`x.y.z.w`) → `x.y.*.*`
  - [ ] IPv6 (contains `:`) → giữ 3 segment đầu, mask phần còn lại bằng `*`
  - [ ] Fallback (UNKNOWN hoặc format khác) → trả về nguyên bản
  - [ ] Export function
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/internals/helpers.ts` (sửa)
- **Test cần pass:** TC-04.1 (IP masked trong User response), NF-04

---

### Phase 2: Backend Development (Server)

#### TASK-006: Cập nhật `login-history.repository.ts`

- **Tham chiếu:** TL3 - Mục 3.7, TL3 - Mục 3.5
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001, TASK-004
- **Checklist:**
  - [ ] Thêm method `findByUser(userId: string, filter: FilterQuery<LoginHistoryDocument>, options: { skip: number, limit: number, sort: Record<string, 1 | -1> }): Promise<{ data: LoginHistoryDocument[], total: number }>`
  - [ ] Dùng `Promise.all([this.db.find(...), this.db.countDocuments(...)])` cho performance
  - [ ] Thêm method `findAll(filter: FilterQuery<LoginHistoryDocument>, options: { skip, limit, sort }): Promise<{ data: LoginHistoryDocument[], total: number }>`
  - [ ] Cả 2 method: `.lean()` để tối ưu performance, select chỉ fields cần thiết
  - [ ] Đảm bảo index `{ userId: 1, createdAt: -1 }` được sử dụng cho `findByUser`
- **Files sẽ tạo/sửa:**
  - `server/src/repositories/login-history.repository.ts` (sửa)

---

#### TASK-007: Cập nhật `login-history.service.ts`

- **Tham chiếu:** TL3 - Mục 3.5, TL3 - Mục 3.8
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001, TASK-004, TASK-005, TASK-006
- **Checklist:**
  - [ ] Thêm method `getMyLoginHistory(userId: string, query: LoginHistoryQuery): Promise<PaginatedResult<LoginHistoryItem>>`
    - [ ] Cap `limit` tại 100, default `page=1`, `limit=20`
    - [ ] Tính `skip = (page - 1) * limit`
    - [ ] Gọi `buildLoginHistoryFilter(query, userId)` — force userId vào filter
    - [ ] Gọi `loginHistoryRepo.findByUser(userId, filter, { skip, limit, sort })`
    - [ ] Apply `maskIp()` cho `ip` field của từng record
    - [ ] Map sang `LoginHistoryItem` (loại bỏ fields nhạy cảm: `userId`, `usernameAttempted`, `userAgent`, `timezoneOffset`, `isAnomaly`, `anomalyReasons`)
    - [ ] Return `{ items, meta: { total, page, limit, totalPages: Math.ceil(total/limit) } }`
  - [ ] Thêm method `getAllLoginHistory(query: LoginHistoryAdminQuery): Promise<PaginatedResult<LoginHistoryAdminItem>>`
    - [ ] Cap `limit` tại 100, tính `skip`
    - [ ] Gọi `buildLoginHistoryFilter(query)` — không force userId
    - [ ] Gọi `loginHistoryRepo.findAll(filter, { skip, limit, sort })`
    - [ ] Map sang `LoginHistoryAdminItem` (giữ tất cả fields, KHÔNG mask IP)
    - [ ] Return `{ items, meta }`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/login-history.service.ts` (sửa)
- **Test cần pass:** TC-04.1–TC-04.11, TC-05.1–TC-05.7

---

#### TASK-008: Tạo `login-history.controller.ts`

- **Tham chiếu:** TL3 - Mục 3.7, TL3 - Mục 3.4
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-002, TASK-003, TASK-007
- **Checklist:**
  - [ ] Tạo class `LoginHistoryController`
  - [ ] Constructor nhận `service: LoginHistoryService`, `auth: AuthGuard`, `adminGuard: AdminGuard`
  - [ ] Expose `public readonly userRouter = Router()`
  - [ ] Expose `public readonly adminRouter = Router()`
  - [ ] `initUserRoutes()`:
    - [ ] `GET /` → `auth.middleware` → `validate(loginHistoryQuerySchema, 'query')` → `asyncHandler(this.getMyHistory)`
  - [ ] `initAdminRoutes()`:
    - [ ] `GET /` → `auth.middleware` → `adminGuard.middleware` → `validate(loginHistoryAdminQuerySchema, 'query')` → `asyncHandler(this.getAllHistory)`
  - [ ] Handler `getMyHistory`: lấy `userId` từ `req.user.userId`, parse query, gọi service, return `HandlerResult`
  - [ ] Handler `getAllHistory`: parse query, gọi service, return `HandlerResult`
  - [ ] Message keys: `'loginHistory:success.getMyHistory'`, `'loginHistory:success.getAllHistory'`
  - [ ] Status code: `STATUS_CODES.OK`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/login-history.controller.ts` (tạo mới)
- **Test cần pass:** TC-04.12 (401), TC-05.9 (403), TC-05.10 (401)

---

#### TASK-009: Cập nhật `login-history.module.ts` và `modules.loader.ts`

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-008
- **Checklist:**
  - [ ] Cập nhật `createLoginHistoryModule()`: nhận thêm tham số `auth: AuthGuard`, `adminGuard: AdminGuard`
  - [ ] Khởi tạo `LoginHistoryController`, export `loginHistoryUserRouter` và `loginHistoryAdminRouter`
  - [ ] Trong `modules.loader.ts`: import `AdminGuard`, khởi tạo `adminGuard = new AdminGuard()`
  - [ ] Cập nhật call `createLoginHistoryModule(auth, adminGuard)` — truyền thêm guards
  - [ ] Mount: `v1Router.use('/login-history', loginHistoryUserRouter)`
  - [ ] Mount: `v1Router.use('/admin/login-history', loginHistoryAdminRouter)`
  - [ ] Verify server khởi động không lỗi, routes được log
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/login-history.module.ts` (sửa)
  - `server/src/loaders/modules.loader.ts` (sửa)

---

#### TASK-010: Review server — Code, Security, Performance

- **Tham chiếu:** Skills: review-code, review-security, review-performance
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-009
- **Checklist:**
  - [ ] **review-code**: pattern consistency (controller/service/repo), naming, no dead code
  - [ ] **review-security**: authZ isolation (user không thể truy cập data người khác), IP masking không bị bỏ sót, input sanitization qua Joi, ForbiddenError đúng chỗ
  - [ ] **review-performance**: `lean()` được dùng trong repo, `Promise.all` cho count+find, index hints nếu cần
  - [ ] Fix tất cả issues tìm được

---

#### TASK-011: Viết Swagger/OpenAPI docs cho 2 endpoints

- **Tham chiếu:** Skill: doc-standards-api, TL3 - Mục 3.4
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-009
- **Checklist:**
  - [ ] Tạo `server/src/modules/login-history/swagger/` folder
  - [ ] Viết `schemas.ts`: `LoginHistoryItem`, `LoginHistoryAdminItem`, `PaginatedLoginHistoryResponse`, `PaginatedAdminLoginHistoryResponse`
  - [ ] Viết `paths.ts`: `GET /login-history` (tất cả query params, response 200/400/401), `GET /admin/login-history` (query params + userId, response 200/400/401/403)
  - [ ] Viết `index.ts`: export paths + schemas
  - [ ] Register trong swagger config chính
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/swagger/schemas.ts` (tạo mới)
  - `server/src/modules/login-history/swagger/paths.ts` (tạo mới)
  - `server/src/modules/login-history/swagger/index.ts` (tạo mới)
  - Swagger config chính (sửa để register module mới)

---

### Phase 3: Frontend Development (Client)

#### TASK-012: Tạo `dataSources/LoginHistory/index.ts`

- **Tham chiếu:** TL1 - US-04, US-05
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-009 (server routes phải tồn tại)
- **Checklist:**
  - [ ] Tạo function `getMyLoginHistory(params: LoginHistoryQueryParams): Promise<ResponsePattern<PaginatedLoginHistoryResponse>>`
  - [ ] Tạo function `getAdminLoginHistory(params: AdminLoginHistoryQueryParams): Promise<ResponsePattern<PaginatedAdminLoginHistoryResponse>>`
  - [ ] Dùng Axios instance từ `libs/axios.ts`
  - [ ] Endpoint: `GET /api/v1/login-history` và `GET /api/v1/admin/login-history`
  - [ ] Params truyền qua `{ params: { ... } }` trong axios config
  - [ ] Tạo types client-side tương ứng (hoặc import từ shared types nếu có)
- **Files sẽ tạo/sửa:**
  - `client/src/dataSources/LoginHistory/index.ts` (tạo mới)

---

#### TASK-013: Tạo User Login History page và view

- **Tham chiếu:** TL1 - US-04, TL2 - TC-04.x
- **Ước lượng:** 3h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-012
- **Checklist:**
  - [ ] Tạo `app/[locale]/(dashboard)/login-history/page.tsx` (Server Component)
    - [ ] `getMessages()` cho translations
    - [ ] Render `<LoginHistoryView messages={messages} />`
  - [ ] Tạo `views/LoginHistory/index.tsx` (Server Component) — layout chính
  - [ ] Tạo `views/LoginHistory/mains/LoginHistoryTable/` (Client Component)
    - [ ] Dùng `@tanstack/react-query` để fetch data (`getMyLoginHistory`)
    - [ ] Hiển thị table: method, status, IP (masked), country, city, deviceType, browser, createdAt
    - [ ] Loading state (skeleton)
    - [ ] Empty state
  - [ ] Tạo `views/LoginHistory/mains/LoginHistoryFilters/` (Client Component)
    - [ ] React Hook Form để quản lý filter state
    - [ ] Inputs: status select, method select, country/city text, fromDate/toDate date picker
    - [ ] Submit cập nhật query params → trigger refetch
  - [ ] Tạo `views/LoginHistory/mains/LoginHistoryPagination/` (Client Component)
    - [ ] shadcn Pagination component
    - [ ] Offset-based: page state, totalPages từ meta
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(dashboard)/login-history/page.tsx` (tạo mới)
  - `client/src/views/LoginHistory/index.tsx` (tạo mới)
  - `client/src/views/LoginHistory/mains/LoginHistoryTable/index.tsx` (tạo mới)
  - `client/src/views/LoginHistory/mains/LoginHistoryFilters/index.tsx` (tạo mới)
  - `client/src/views/LoginHistory/mains/LoginHistoryPagination/index.tsx` (tạo mới)
- **Test cần pass:** TC-04.1, TC-04.2, TC-04.3, TC-04.8 (empty state), TC-04.9

---

#### TASK-014: Tạo Admin Login History page và view

- **Tham chiếu:** TL1 - US-05, TL2 - TC-05.x
- **Ước lượng:** 3h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-012
- **Checklist:**
  - [ ] Tạo `app/[locale]/(admin)/admin/login-history/page.tsx` (Server Component)
    - [ ] Check user role server-side, redirect nếu không phải admin
    - [ ] Render `<AdminLoginHistoryView messages={messages} />`
  - [ ] Tạo `views/AdminLoginHistory/index.tsx`
  - [ ] Tạo `views/AdminLoginHistory/mains/AdminLoginHistoryTable/` (Client Component)
    - [ ] Hiển thị thêm: `userId`, `usernameAttempted`, `userAgent`, `timezoneOffset`, full IP (không mask)
    - [ ] Loading state (skeleton), empty state
  - [ ] Tạo `views/AdminLoginHistory/mains/AdminLoginHistoryFilters/` (Client Component)
    - [ ] Tất cả filters của User + thêm: `userId` input (ObjectId), `ip` text search
  - [ ] Tái sử dụng pagination component từ TASK-013
- **Files sẽ tạo/sửa:**
  - `client/src/app/[locale]/(admin)/admin/login-history/page.tsx` (tạo mới)
  - `client/src/views/AdminLoginHistory/index.tsx` (tạo mới)
  - `client/src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx` (tạo mới)
  - `client/src/views/AdminLoginHistory/mains/AdminLoginHistoryFilters/index.tsx` (tạo mới)
- **Test cần pass:** TC-05.1, TC-05.2, TC-05.3, TC-05.6 (empty state)

---

#### TASK-015: Review client — Code, Security

- **Tham chiếu:** Skills: review-code, review-security
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-013, TASK-014
- **Checklist:**
  - [ ] **review-code**: React patterns, hook usage, component reuse giữa User/Admin views
  - [ ] **review-security**: không hiển thị admin page với non-admin, không leak sensitive data trong UI, XSS safe rendering

---

### Phase 4: Testing & QA

#### TASK-016: Unit test — `admin.guard.ts` và `maskIp()`

- **Tham chiếu:** TL2 - TC-05.9, NF-04
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-002, TASK-005
- **Checklist:**
  - [ ] Test `AdminGuard.canActivate()`: happy (admin role) ✅, 403 (user role) ✅, 401 (no req.user) ✅
  - [ ] Test `maskIp()`: IPv4 `192.168.1.100` → `192.168.*.*` ✅, IPv4 `10.0.0.1` → `10.0.*.*` ✅, IPv6 → mask đúng ✅, `UNKNOWN` → `UNKNOWN` ✅
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/admin.guard.test.ts` (tạo mới)
  - `server/src/modules/login-history/internals/helpers.test.ts` (tạo mới / sửa)

---

#### TASK-017: Unit test — `query-builder.ts`

- **Tham chiếu:** TL2 - Mục 2.3
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004
- **Checklist:**
  - [ ] Test từng filter riêng lẻ: status, method, deviceType, clientType (exact match)
  - [ ] Test partial match: country, city, os, browser (regex case-insensitive)
  - [ ] Test date range: chỉ fromDate, chỉ toDate, cả hai
  - [ ] Test userId filter (Admin): ObjectId được convert đúng
  - [ ] Test empty query → empty filter `{}`
  - [ ] Test combination: nhiều filters cùng lúc → AND logic
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/internals/query-builder.test.ts` (tạo mới)

---

#### TASK-018: Unit test — service methods

- **Tham chiếu:** TL2 - TC-04.x, TC-05.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-007
- **Checklist:**
  - [ ] Mock `LoginHistoryRepository`
  - [ ] Test `getMyLoginHistory()`:
    - [ ] Happy path: data trả về đúng, IP bị mask
    - [ ] Verify `userId` không có trong response items
    - [ ] Empty result: `{ items: [], meta: { total: 0, ... } }`
    - [ ] `limit` cap tại 100 khi truyền vào 999
    - [ ] `totalPages` tính đúng
  - [ ] Test `getAllLoginHistory()`:
    - [ ] Happy path: IP KHÔNG bị mask
    - [ ] Verify `userId`, `usernameAttempted` có trong response
    - [ ] userId filter được pass vào repo đúng
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/login-history.service.test.ts` (tạo mới / sửa)

---

#### TASK-019: Integration test — 2 endpoints

- **Tham chiếu:** TL2 - TC-04.x, TC-05.x
- **Ước lượng:** 3h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-009, TASK-016, TASK-017, TASK-018
- **Checklist:**
  - [ ] Setup: seed test data (user records + admin records từ nhiều users)
  - [ ] **GET /login-history:**
    - [ ] TC-04.1: 200 + IP masked, không có fields nhạy cảm
    - [ ] TC-04.2: filter status=failed → chỉ failed records
    - [ ] TC-04.6: pagination page=2 → đúng records
    - [ ] TC-04.8: user không có history → `{ items: [], meta: { total: 0 } }`
    - [ ] TC-04.10: limit=500 → tự cap về 100
    - [ ] TC-04.12: 401 khi không có token
    - [ ] TC-04.13: 400 khi status=invalid
    - [ ] TC-04.15: verify user A không thấy records của user B
  - [ ] **GET /admin/login-history:**
    - [ ] TC-05.1: 200 + IP đầy đủ + tất cả fields
    - [ ] TC-05.2: filter userId → chỉ records của user đó
    - [ ] TC-05.9: 403 khi gọi với user thường
    - [ ] TC-05.10: 401 khi không có token
    - [ ] TC-05.8: 400 khi userId không hợp lệ
- **Files sẽ tạo/sửa:**
  - `server/src/modules/login-history/login-history.integration.test.ts` (tạo mới)

---

## Dependency Graph

```
TASK-001 (types) ──────────┬──── TASK-003 (Joi schema) ─────────────────────────┐
                           └──── TASK-004 (query-builder) ──── TASK-006 (repo) ──┤
TASK-002 (admin.guard) ─────────────────────────────────────────────────────────┤
TASK-005 (maskIp) ──────────────────────────────────────────────────────────────┤
                                                                                  ├── TASK-007 (service) ─── TASK-008 (controller) ─── TASK-009 (module+loader)
                                                                                  │                                                          │
                                                                                  │                                              ┌────────────┴───────────────┐
                                                                                  │                                              │                            │
                                                                                  │                                         TASK-010              TASK-011
                                                                                  │                                         (review)             (swagger)
                                                                                  │
                                                                              TASK-009 ── TASK-012 (dataSources) ─┬── TASK-013 (User page) ──┐
                                                                                                                  └── TASK-014 (Admin page) ─┴── TASK-015 (review client)

TASK-002 ─── TASK-016 (unit test guard + maskIp)
TASK-004 ─── TASK-017 (unit test query-builder)
TASK-007 ─── TASK-018 (unit test service)
TASK-016 + TASK-017 + TASK-018 + TASK-009 ─── TASK-019 (integration test)
```
