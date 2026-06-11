# Admin Login History — Detail Page & Detail API

## Context

Trang admin `/admin/login-history` hiện hiển thị một bảng **10 cột** (User ID · Username · Method · Status · IP · Country · Device · Browser · Anomaly · Time) — quá rộng, khó quét nhanh. List API `GET /admin/login-history` đã trả về **toàn bộ record** (`AllHistoryItemDto`), nên dữ liệu chi tiết đã có sẵn trong payload list.

Mục tiêu:

1. Rút gọn bảng admin xuống bộ cột "thông tin quan trọng" (Balanced).
2. Thêm cột **Action** cuối mỗi dòng với nút **View** điều hướng sang trang detail.
3. Xây trang detail FE `/admin/login-history/[id]`.
4. Xây API detail BE `GET /admin/login-history/:id`.

Đây là feature **read-only** (chỉ xem, không mutation). Có analog sẵn trong codebase: **AdminContact** (list → `admin/contact/[id]` → `GET /admin/contacts/:id` + `contact-detail-item.dto.ts` + `contactIdParamSchema`). Thiết kế mirror chính xác pattern này.

## Approach

**A — Dedicated detail endpoint (đã chọn).** `GET /admin/login-history/:id` trả về full detail DTO; FE detail page tại `/admin/login-history/[id]`, mirror AdminContact. Deep-linkable, refresh-safe, RESTful, nhất quán codebase.

**B — Không thêm endpoint, reuse list payload** (truyền row qua client cache/router state). Ít code hơn nhưng F5/deep-link = trắng trang, không RESTful, lệch pattern contact. ❌

**C — Generalized shared admin-detail abstraction** cho cả contact + login-history. YAGNI cho 2 feature. ❌

## Backend — `server/` (module `login-history`)

| Layer | Thay đổi |
| --- | --- |
| **Route** (`login-history.routes.ts`) | Thêm `adminLoginHistory.get("/:id", paramsPipe(loginHistoryIdParamSchema), asyncHandler(controller.getHistoryDetail))` vào `createLoginHistoryAdminRoutes` (đã có `authGuard, adminGuard`). |
| **Validator** (`validators/schemas/login-history.ts`) | `loginHistoryIdParamSchema = Joi.object({ id: Joi.string().pattern(OBJECTID_PATTERN)... })` với message i18n key — mirror `contactIdParamSchema`. Named export. |
| **Repository** (`login-history.repository.ts`) | Thêm `findById(id): Promise<LoginHistoryDocument \| null>` vào type contract + `MongoLoginHistoryRepository` (dùng `LoginHistoryModel.findById(id).lean().exec()`, wrap `asyncDatabaseHandler`). |
| **Service** (`login-history.service.ts`) | `getLoginHistoryDetail(id)` → `findById` → nếu null: `throw new NotFoundError({ i18nMessage: (t) => t("loginHistory:errors.notFound"), code: ERROR_CODES.LOGIN_HISTORY_NOT_FOUND })`. Trả `toHistoryDetailItemDto(doc)`. |
| **DTO** (`dtos/history-detail-item.dto.ts`) | `interface HistoryDetailItemDto` + `toHistoryDetailItemDto(doc)` — full record (cùng field set với `AllHistoryItemDto`). Thêm export vào `dtos/index.ts` barrel. |
| **Controller** (`login-history.controller.ts`) | `getHistoryDetail = async (req: HistoryIdParamRequest, res) => { const data = await this.service.getLoginHistoryDetail(req.params.id); new OkSuccess({ data, message: "loginHistory:success.getHistoryDetail" }).send(req, res); }`. |
| **Types** (`types/index.ts`) | `HistoryIdParamRequest` (typed request với `params.id`). |
| **Constants** | `ERROR_CODES.LOGIN_HISTORY_NOT_FOUND` (reuse nếu đã có; nếu chưa, thêm vào nhóm phù hợp trong `error-code.ts`). |
| **i18n BE** (`@/i18n/locales/.../login-history`) | Thêm `errors.notFound` + `success.getHistoryDetail`. |

**Swagger:** module `login-history` hiện **chưa có** folder `swagger/`. Giữ parity → bỏ qua Swagger cho lần này; OpenAPI/Postman doc là follow-up tùy chọn (không introduce doc infra mới ở feature này).

## Frontend — `client/`

### Table (sửa) — `views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`

- Rút xuống bộ **Balanced**: **Username · Method · Status · IP & Location · Anomaly · Time · Action**.
- Bỏ render các cột **User ID · Device · Browser** (dữ liệu vẫn còn, xem ở detail).
- `TABLE_COLUMN_COUNT` → **7** (cập nhật cả `colSpan` empty state).
- Cột Action cuối: nút/link điều hướng `/admin/login-history/{_id}`. Dùng i18n `<Link>` từ `@/i18n/navigation` (hoặc `CustomButton` + `router.push`); giữ `useAnnounce` khi navigate (pattern có sẵn).

### Page (mới) — `app/[locale]/(private)/(admin)/admin/login-history/[id]/page.tsx`

- Async server component, `params: Promise<{ locale; id }>`, `generateMetadata` (namespace `loginHistory.admin.detail`), render `<AdminLoginHistoryDetail id={id} />`. Mirror `admin/contact/[id]/page.tsx`.

### View (mới) — `views/AdminLoginHistoryDetail/`

```
index.tsx                                  # compose Header + DetailCard
mains/AdminLoginHistoryDetailHeader/       # server: CustomBreadcrumb + title
mains/LoginHistoryDetailCard/              # client: useQuery hook + <dl> sections + skeleton + not-found + announce
components/LoginHistoryDetailSkeleton/
hooks/useAdminLoginHistoryDetail.ts        # useQuery, QUERY_KEYS.ADMIN_LOGIN_HISTORY_DETAIL
```

`LoginHistoryDetailCard` render `<dl>` nhóm theo section (labels qua i18n, enum qua `tMethod`/`tStatus`, date qua `formatDateTimeMedium`):

- **Identity**: userId (ẩn nếu null) · usernameAttempted
- **Authentication**: method · status (badge) · failReason (ẩn nếu null)
- **Network & Location**: ip · country · city
- **Device & Client**: deviceType · os · browser · clientType · userAgent · timezoneOffset
- **Anomaly**: isAnomaly (Yes/No) · anomalyReasons (list, "none" nếu rỗng)
- createdAt

`isLoading` → `<LoginHistoryDetailSkeleton />`; `!data` (404/null) → not-found UI (i18n). Announce on load.

### Plumbing

| File | Thay đổi |
| --- | --- |
| `requests/loginHistory.ts` | `getAdminLoginHistoryDetail(id)` → `GET ${END_POINTS.ADMIN_LOGIN_HISTORY}/${id}` → `ResponsePattern<LoginHistoryAdminDetailItem>`. |
| `types/LoginHistory/index.ts` | `LoginHistoryAdminDetailItem` (mirror BE `HistoryDetailItemDto` — cùng field set với `LoginHistoryAdminItem`). |
| `constants/queryKeys.ts` | `ADMIN_LOGIN_HISTORY_DETAIL`. |
| `dataSources/AdminLoginHistoryDetail/` | Breadcrumb items (mirror `AdminContactDetail`). |
| `locales/{en,vi}/loginHistory.json` | `loginHistory.admin.detail.*` (title, breadcrumb, fields.*, sections, notFound) + `loginHistory.table.action` (header) + label nút View. Cả 2 locale. |

## API Contract (BE DTO ↔ FE type)

`HistoryDetailItemDto` ≡ `LoginHistoryAdminDetailItem` — field set **giống hệt** admin list item hiện tại (`_id, method, status, failReason, ip, country, city, deviceType, os, browser, clientType, createdAt, userId, usernameAttempted, userAgent, timezoneOffset, isAnomaly, anomalyReasons`). Không có drift.

## E2E Scenario Matrix (admin login-history list + detail)

| # | Category | Decision |
| --- | --- | --- |
| 1 | Happy path | ✅ Admin mở list → thấy bảng 7 cột; click **View** → tới `/admin/login-history/{id}` hiển thị đủ field. Deep-link trực tiếp tới id hợp lệ render detail. |
| 2 | AuthN | ✅ Chưa đăng nhập → `/admin/login-history/{id}` redirect về login. |
| 3 | AuthZ | ✅ User thường (non-admin) → list & detail bị chặn (403/redirect qua `adminGuard`). |
| 4 | Validation | ✅ Detail với id không phải ObjectID (`/admin/login-history/abc`) → 400 → FE hiển thị error/not-found UI. |
| 5 | Empty / null | ✅ Detail của failed attempt: `userId` null → field ẩn/"—"; record success: `failReason` null ẩn; `anomalyReasons` rỗng → "none". |
| 6 | Boundary / pagination | N/A — detail không phân trang; list pagination không đổi bởi việc rút cột (đã cover bởi suite admin-login-history hiện có). |
| 7 | Filter / search | N/A — detail không có filter; list filter không đổi (rút cột không động tới filter logic). |
| 8 | Data rendering | ✅ Method/status/device là human label không phải raw enum; `isAnomaly` → Yes/No; `createdAt` formatted (không ISO); cột "IP & Location" gộp. |
| 9 | **i18n** | ✅ Label cột Action + detail (title, breadcrumb, field labels, method/status enum, not-found) render ở **cả en VÀ vi**. |
| 10 | Error / loading | ✅ Detail API 5xx/network → error UI; loading → skeleton; id hợp lệ nhưng không tồn tại → 404 not-found UI. |
| 11 | Mutation safety | N/A — read-only, không write. |
| 12 | Accessibility | ✅ Action View reachable bằng keyboard/role; detail dùng semantic `<dl>` + heading order; announce on load/navigation. |

Feature-specific: deep-link load detail (không qua table click) ✅ (row 1); back-from-detail giữ list URL/filter ✅ (row 12).

## Out of scope

- Mutation trên login-history (read-only).
- Swagger/OpenAPI doc cho module (follow-up tùy chọn).
- Thay đổi list filter / pagination hiện có.
- User-side login-history page (`/login-history`) — chỉ đụng admin side.
