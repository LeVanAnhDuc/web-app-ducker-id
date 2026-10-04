# Design — Gộp logic pagination trùng lặp về `src/common/pagination/`

> Việc số 1 để lại sau migration layout module (`docs/specs/module-struct-batch5/design.md` §7).
> Ngày: 2026-10-04. Branch: `refactor/pagination-helper`.

## 1. Hiện trạng trước khi sửa

Không phải 3 chỗ như ước lượng ban đầu mà **7 chỗ**, và chúng không giống hệt nhau.

| Service | Biến thể |
| --- | --- |
| `login-history.getMyLoginHistory` | A |
| `login-history.getAllLoginHistory` | A |
| `contact-admin.getContactList` | A |
| `contact-admin.getMyContacts` | A |
| `user.getAdminUsers` | A |
| `notification.list` | B |
| `web-app.listUserApps` | C |

**A** — đầy đủ: destructure `PAGINATION`, default `sortBy = "createdAt"`, `Math.min(rawLimit, MAX_LIMIT)`, `skip = (page-1)*limit`, `resolveSortDirection`.
**B** — không có `sortBy`, field sort hardcode `createdAt`.
**C** — `page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE` và `totalPages: Math.max(1, …)`.

Ngoài logic, **type cũng trùng**: `PaginatedResult<T>` được khai **4 lần** (contact-admin, login-history, notification, web-app) với nội dung giống hệt nhau, và `AdminUserListMeta` của `user` chính là cùng cái `meta` đó.

## 2. Hai phát hiện khi so sánh 7 biến thể

### 2.1 `totalPages` lệch nhau khi rỗng — khác biệt hợp đồng API thật

| Endpoint | `total = 0` → `totalPages` |
| --- | --- |
| `web-app.listUserApps` | **1** |
| 6 endpoint còn lại | **0** |

Client nhận hai quy ước khác nhau tuỳ endpoint.

**Quyết định: giữ nguyên hiện trạng.** `toPageMeta` mặc định `Math.ceil`, còn `web-app` truyền `{ minTotalPages: 1 }`. Thống nhất lại là **đổi response của một endpoint đang chạy**, không thuộc phạm vi một refactor — và phải kiểm `client/` xem có chỗ nào dựa vào `totalPages >= 1` không. Tham số này làm chỗ lệch trở nên hiển thị và grep được, thay vì chìm trong một dòng `Math.max` giữa file.

### 2.2 Guard `page > 0` của `web-app` là code chết

Cả 6 schema phân trang đều có `Joi.number().integer().min(1)`:

```
schemas/contact-admin.ts:81, 148   schemas/login-history.ts:29
schemas/notification.ts:10          schemas/user.ts:118
schemas/web-app.ts:67
```

`page < 1` bị pipe từ chối trước khi tới service, nên nhánh phòng thủ đó không bao giờ chạy. Đã bỏ, và lý do ghi thành comment trong `resolvePaging` để lần sau không ai thêm lại.

Tương tự, `sortOrder: rawSortOrder = "desc"` của `contact-admin` là thừa — `resolveSortDirection(undefined)` vốn trả `-1`.

## 3. Phát hiện ngoài dự kiến: Swagger mô tả sai shape

`libs/swagger/common.schemas.ts` khai `PaginationMeta` là:

```
{ page, pageSize, totalItems, totalPages, hasNext, hasPrev }
```

Nhưng API thật trả `{ total, page, limit, totalPages }`. **Ba field được document không tồn tại, hai field có thật không được document.** `contact-admin/swagger/paths.ts:117` trỏ `data.meta` vào chính schema sai này.

Thêm nữa, shape đó gắn với `ResponseMeta.pagination` tức `meta` ở **tầng envelope** — mà `grep` cho thấy **không controller nào từng truyền `meta` vào `OkSuccess`/`CreatedSuccess`**. Envelope `meta` chưa bao giờ được dùng; meta phân trang nằm trong `data.meta`.

Đã sửa `PaginationMeta` (cả Swagger lẫn bản TS ở `types/common.ts`) cho khớp thực tế. **Chưa** đụng `ResponseMeta` / envelope — xem §6.

## 4. Thiết kế

`src/common/pagination/index.ts` giờ giữ toàn bộ khái niệm phân trang:

```ts
export const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 20, MAX_LIMIT: 100 };

export interface PagingQuery { page?, limit?, sortBy?: string, sortOrder?: SortOrder }
export interface ResolvedPaging extends PaginationOptions { page: number }
export interface PageMeta { total, page, limit, totalPages }
export interface PaginatedResult<T> { items: T[]; meta: PageMeta }

export const resolvePaging = (query, defaultSortBy = "createdAt"): ResolvedPaging
export const toPageMeta = (total, page, limit, { minTotalPages = 0 } = {}): PageMeta
```

`ResolvedPaging extends PaginationOptions` nên `{ skip, limit, sort }` truyền thẳng xuống repository được.

`PagingQuery` khai `sortBy?: string` nên mọi query type của module gán vào được — `sortBy` của chúng đều là union của string, hẹp hơn.

Call site rút từ ~15 dòng xuống 2:

```ts
const { page, limit, skip, sort } = resolvePaging(query);
// …
meta: toPageMeta(total, page, limit)
```

Đặt ở `src/common/` chứ không phải `helpers/` của module nào, vì nó phục vụ 7 module và `CLAUDE.md` đã xếp `common/pagination/` vào nhóm Responses.

## 5. Thay đổi hành vi

**Không có.** Ba điểm có thể nghi ngờ, đều đã kiểm:

| Điểm | Trước | Sau |
| --- | --- | --- |
| `web-app` `totalPages` khi rỗng | 1 | 1 (qua `minTotalPages`) |
| `web-app` guard `page > 0` | không bao giờ chạy (Joi chặn) | bỏ |
| `contact-admin` default `"desc"` | `resolveSortDirection("desc")` = -1 | `resolveSortDirection(undefined)` = -1 |
| `notification` sort field | hardcode `createdAt` | `defaultSortBy` = `createdAt` |

`web-app` không dùng `sort` của `resolvePaging` vì `findActivePaginated` chỉ nhận `skip`/`limit` — có comment tại chỗ.

## 6. Cố ý chưa làm

- **Không thống nhất `totalPages`** — §2.1, cần bạn quyết và cần kiểm `client/`.
- **Không dọn `ResponseMeta` / envelope `meta`** — nó chết hoàn toàn (không controller nào truyền), nhưng gỡ nó đụng `common/responses/index.ts`, `types/global.d.ts`, `types/common.ts` và Swagger `ApiResponse`. Là việc riêng.
- **Không gộp `PaginationParams`** (`{page, limit}`) đang khai trùng ở `login-history/types` và `web-app/types` — nó chỉ dùng làm base cho `extends Partial<…>` của query type, không liên quan tới logic đã gộp.

## 7. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **60 suite / 410 test pass** (thêm 12 test cho chính helper). Không test cũ nào phải sửa, kể cả `web-app.spec.ts` vốn có case `clamps limit to MAX_LIMIT and defaults page/limit`.
- `pnpm lint` — sạch.
