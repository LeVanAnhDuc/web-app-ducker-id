# Design — Backend Consistency Cleanup

> Nguồn: `feedback.md` (mục `# backend`, dòng 90–113). Mục tiêu: dọn nhất quán backend
> (`server/src/**`) — gom hằng/enum dùng chung, dependency-inversion mailer, bỏ magic
> string/hardcode, đồng nhất naming/loader, quét comment & validation thừa. **Tất cả
> refactor giữ nguyên behavior** (không đổi API contract, không đổi hành vi FE thấy được).

## 1. Bối cảnh & phạm vi

- **Repo đụng tới**: `server/` (code), `docs/` (spec này). Không đụng `client/`.
- **Loại thay đổi**: refactor/dọn dẹp nội bộ. Không thêm feature, không đổi response shape.
- **E2E (§4.3)**: SKIP — không đổi behavior user thấy/tương tác.
- **Security review (§4.5)**: nhẹ — không sửa auth logic (token version & guard chỉ giải
  thích, không thay đổi). Xác nhận lại sau khi code.
- **Green gate (§4.7)**: `yarn lint && yarn type-check && yarn test && yarn build` phải xanh,
  đặc biệt test hiện có không được vỡ.

## 2. Phần A — Q&A (giải thích, không sửa code trừ khi ghi rõ)

Các mục "tìm hiểu/giải thích" trong feedback. Đây là tài liệu kiến thức; **chỉ sửa code ở
chỗ phát hiện vấn đề thật** (đã tách sang Phần B).

### A-1. `listUserApps` lấy app theo role thế nào? (feedback dòng 95)
`web-app.service.ts:73-79`. Visibility theo role:
- **ADMIN**: thấy toàn bộ catalog `active` (không áp filter `requiredRoles`).
- **Non-admin / chưa đăng nhập**: chỉ thấy app có `requiredRoles` chứa `USER`.

Cơ chế: gán `filter.requiredRoles = AUTHENTICATION_ROLES.USER` rồi để Mongo match một scalar
vào array field — document nào có mảng `requiredRoles` chứa giá trị đó sẽ khớp. → **Đúng,
không cần sửa.**

### A-2. `sort` trong câu query là gì? (dòng 98)
Mỗi service nhận `sortBy` + `sortOrder`, convert `sortOrder === "asc" ? 1 : -1`, rồi truyền
`{ [sortBy]: 1 | -1 }` vào Mongoose `.sort()` (hoặc `$sort` trong aggregation). Logic convert
này **lặp y hệt ở 5 service** (user, contact-admin, login-history ×2, …). → Có vấn đề trùng
lặp → xử lý ở **B-2**.

### A-3. `populate` trong câu query là gì? (dòng 99)
Mongoose `.populate({ path, select })` = join 1 cấp theo field ref, hydrate document liên
kết. Trong codebase chỉ web-app dùng (`category`, `web-app.repository.ts:66-69, 90-93`).
Admin users **không** dùng populate mà dùng `$lookup` aggregation (linh hoạt hơn khi cần
filter/sort/paginate tại thời điểm join). → **Không cần sửa.**

### A-4. `findAdminUsers` (dòng 100)
`user.repository.ts:154-236`. Aggregation pipeline:
1. `$lookup` users → auths (lấy `roles`, `isActive`), filter theo role/status.
2. `$lookup` auths → login_histories (sub-pipeline `$sort -1` + `$limit 1` lấy lần login
   thành công gần nhất → `lastLoginAt`).
3. `$project` reshape output.
4. `$facet` (sort + skip + limit) song song với `$count` tổng. → **Không cần sửa.**

### A-5. `adminUpdateAppBodySchema` (dòng 101)
`validators/schemas/web-app.ts:167-183`. `.fork()` từ `adminCreateAppBodySchema` → 7 field
core thành `optional` (partial update), `.min(1)` chặn body rỗng, message i18n
`webApp:validation.body.empty`. → **Không cần sửa.**

### A-6. `UserFavoriteSchema.virtual` & `.index` (dòng 108)
`models/user-favorite.ts:29-37`:
- `.index({ userId, webAppId }, { unique: true })` — chặn trùng favorite (1 user không
  favorite 1 app 2 lần).
- `.index({ userId, createdAt: -1 })` — tối ưu list favorite theo thời gian.
- `.virtual("webApp", { ref, localField: webAppId, foreignField: _id, justOne: true })` —
  ref ảo cho phép `.populate("webApp")` (hiện chưa dùng — available cho tương lai).
→ **Không cần sửa.**

### A-7. Vì sao `findFavoritedAppIds` trả `Set`? Có case trùng không? (dòng 109)
`favorite.repository.ts:56-71`. Trả `Set<string>` để `listUserApps` check `.has(id)` O(1) khi
gắn cờ `isFavorite`. **Không có dedup logic** vì unique index `(userId, webAppId)` đã đảm bảo
không trùng — `Set` ở đây thuần để lookup nhanh, không phải để khử trùng. → **Không cần sửa.**

### A-8. Sao không join favorite + app để get list nhanh hơn? (dòng 111)
Hiện tại: 2 query (apps paginated → favorite IDs theo danh sách app) + map trong memory bằng
`Set`. **Quyết định: giữ nguyên.** Lý do: đây không phải N+1 (đúng 2 query, lookup O(1)), code
dễ đọc, và filter role/category vẫn nằm gọn ở tầng app query. Đổi sang `$lookup` chỉ giảm 1
round-trip nhưng tăng độ phức tạp & khó giữ filter nhất quán. → **Không sửa.**

### A-9. `PasswordNotChangedGuard` dùng ở đâu? (dòng 112)
Định nghĩa `token/guards/password-not-changed.guard.ts`; instantiate ở `token.module.ts:24`;
inject vào `TokenService` (`token.service.ts:26`); gọi ở `refreshAccessToken()`
(`token.service.ts:42`). Nhiệm vụ: chặn refresh bằng token phát hành **trước** lần đổi mật
khẩu (so `payload.tokenVersion < auth.tokenVersion` → `ForbiddenError`). → **Không cần sửa.**

### A-10. Cơ chế token version (dòng 113)
`models/authentication.ts:51-54`: `tokenVersion` `default: 0`. Mỗi lần đổi mật khẩu, repo
`updatePassword()` dùng `$inc: { tokenVersion: 1 }` (`authentication.repository.ts:102`) → giá
trị **tăng vô hạn** 0→1→2→3… (KHÔNG phải flag 0/1, KHÔNG reset về 0). Token mới được stamp
`tokenVersion` hiện tại; guard reject nếu token mang version nhỏ hơn server. Trả lời thắc mắc:
"update lần 2 vẫn là 1?" — **Không**, lần 2 thành 2, lần 3 thành 3… nên cơ chế vẫn đúng vô
hạn lần. → **Không cần sửa.**

## 3. Phần B — Refactors (actionable)

### Nhóm 1 — Nền tảng dùng chung (làm trước, các nhóm sau phụ thuộc)

**B-1. Pagination constants chung** (dòng 102–104)
- Tạo module shared (vị trí đề xuất: `server/src/common/pagination/index.ts`) export:
  ```ts
  export const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 20, MAX_LIMIT: 100 } as const;
  ```
- Thay 5 nơi hardcode: `web-app.service.ts:44-46`, `contact-admin.service.ts:32-34`,
  `login-history.service.ts:50-52`, `user.service.ts:26-28`, và `notification/constants` →
  trỏ về `PAGINATION`.
- **web-app giữ `DEFAULT_LIMIT = 12`** qua override tường minh:
  ```ts
  export const WEB_APP_PAGINATION = { ...PAGINATION, DEFAULT_LIMIT: 12 } as const;
  ```
- Notification: bỏ bản `NOTIFICATION_PAGINATION` riêng, dùng `PAGINATION` (giá trị giống nhau
  20/100 nên không đổi behavior).
- **Bất biến**: mọi default limit hiện tại được giữ nguyên (web-app=12, còn lại=20).

**B-2. Sort util + enum chung** (dòng 97, 98)
- Tạo `server/src/common/sort/index.ts`:
  ```ts
  export const SORT_ORDERS = { ASC: "asc", DESC: "desc" } as const;
  export type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS];
  export const SORT_ORDER_VALUES = Object.values(SORT_ORDERS); // cho Joi .valid(...)
  export const resolveSortDirection = (order?: SortOrder): 1 | -1 =>
    order === SORT_ORDERS.ASC ? 1 : -1;
  export const buildSort = (field: string, order?: SortOrder) => ({
    [field]: resolveSortDirection(order),
  });
  ```
- Thay logic `=== "asc" ? 1 : -1` lặp ở 5 service bằng `resolveSortDirection`/`buildSort`.
- Gộp 4 bản `SORT_ORDER_VALUES = ["asc","desc"] as const` đang trùng ở các file validator
  (`notification.ts`, `user.ts`, `login-history.ts`, `contact-admin.ts`) về 1 nguồn chung.
- **Bất biến**: default vẫn là `desc` (vì `order !== "asc"` → -1), giữ nguyên kết quả sort.

### Nhóm 2 — Type/enum extraction (dòng 94)

**B-3. Bind union còn sót về const**
- `AdminUserStatusFilter` (`user/types/index.ts:83`, `"active" | "locked"`) → tạo
  `ADMIN_USER_STATUS_FILTERS = { ACTIVE: "active", LOCKED: "locked" } as const` + derive type.
- `sortBy?: "..."` inline ở `user/types`, `contact-admin/types`, `login-history/types` →
  derive type từ const array đã có sẵn trong validator (1 nguồn cho cả Joi `.valid()` lẫn
  type). `sortOrder?: "asc" | "desc"` → dùng `SortOrder` từ B-2.
- **KHÔNG động** các type đã chuẩn (`WebAppStatus`, `NotificationType`, `LoginStatus`,
  `LoginMethod`, `DeviceType`, `ClientType`, `ContactStatus`, `ContactPriority`, `Gender`,
  `AUTHENTICATION_ROLES`) — đã derive từ `as const`.

### Nhóm 3 — Web-app / favorite

**B-4. Bỏ hardcode filter active trong `listUserApps`** (dòng 93)
- `web-app.service.ts` (qua `buildWebAppFilter`): thay magic string `status: "active"` bằng
  hằng `WEB_APP_STATUS_PUBLIC.ACTIVE` (hoặc constant nội bộ tương ứng). **Vẫn active-only**
  cho catalog user-facing — chỉ bỏ literal, không biến thành tham số.

**B-5. Favorite sort dùng const** (dòng 110)
- `favorite.service.ts:31-58`: giá trị sort (`"recent"` / `"name"`) → const-derived
  (`FAVORITE_SORTS`), validator `favorite.ts:28` dùng cùng nguồn. Giữ nguyên hành vi
  (name → localeCompare; mặc định → thứ tự `createdAt`).

### Nhóm 4 — Email Dependency Inversion (dòng 92)

**B-6. Interface `Mailer`**
- Định nghĩa interface `Mailer` liệt kê đủ phương thức public của email service
  (`send`, `executeSend`) — vị trí đề xuất `server/src/types/services/email.ts` (cạnh
  `EmailType`) hoặc `services/email/`.
- `SendEmailService implements Mailer`.
- `EmailDispatcher` và mọi consumer phụ thuộc **type `Mailer`** thay vì class
  `SendEmailService` cụ thể (giảm coupling, dễ mock/test).
- **Lưu ý**: tầng transport (`EmailTransport` abstract + `NodemailerTransport`) đã DI tốt —
  giữ nguyên; B-6 chỉ bổ sung abstraction ở tầng service.

### Nhóm 5 — Loader / naming

**B-7. Refactor loader notification** (dòng 96)
- `modules.loader.ts:149`: đổi `const notificationModule = createNotificationModule();` +
  truy cập `.notificationService`/`.notificationUserRouter` rải rác → **destructure inline**
  như các module khác:
  ```ts
  const { notificationService, notificationUserRouter } = createNotificationModule();
  ```

**B-8. Rename `contactAdminQueryAdminRouter`** (dòng 107)
- Tên hiện tại khó hiểu (double "admin", thực chất gồm cả mutation PATCH status). Đổi:
  - export `contactAdminQueryAdminRouter` → `adminContactsRouter`
  - factory `createContactAdminRoutes` → `createAdminContactsRoutes`
  - cập nhật `contact-admin.module.ts` + `modules.loader.ts` (mọi nơi tham chiếu).
- Pure rename, không đổi route path `/admin/contacts`.

### Nhóm 6 — Quét toàn bộ backend (Q4: full sweep)

**B-9. Bỏ `stripUnknown` thừa ở schema** (dòng 105)
- Pipe đã set `stripUnknown: true` global (`validation.pipe.ts:15`) → mọi
  `.options({ stripUnknown: true })` ở schema là thừa.
- **Tiền điều kiện (bắt buộc kiểm tra trước khi xoá)**: confirm KHÔNG schema nào được
  `.validate()` trực tiếp ngoài pipe (nếu có thì giữ lại cho schema đó). Sau khi confirm →
  xoá toàn bộ `.options({ stripUnknown: true })` thừa trong `validators/schemas/**`.

**B-10. Quét comment "what" + return-shorthand** (dòng 106)
- Rà toàn bộ `server/src/**`: comment chỉ mô tả "what" (lặp lại code) → xoá hoặc đổi thành
  "why" (giải thích ý đồ). Lưu ý: phần lớn comment hiện có thực ra đã là "why" (vd
  circuit-breaker, role-scoping) → **không đụng comment tốt**, chỉ sửa comment thừa/lặp.
- Tiện thể: arrow function return nhanh → bỏ `{ return ... }` thành biểu thức ngắn ở chỗ
  rõ ràng (không ép nếu giảm độ đọc).
- **Đây là nhóm rủi ro thấp nhưng diff rộng** → làm **cuối cùng**, review kỹ, không trộn
  với refactor logic.

## 4. Thứ tự thực thi & phụ thuộc

```
Nhóm 1 (B-1, B-2)  ──► Nhóm 2 (B-3)  ──► Nhóm 3 (B-4, B-5)
        │                                        │
        └──────────────► Nhóm 4 (B-6) ◄──────────┤  (độc lập, song song được)
                         Nhóm 5 (B-7, B-8) ◄──────┘
                                 │
                                 ▼
                         Nhóm 6 (B-9, B-10)  ── sweep cuối, review riêng
```

- Nhóm 1 là nền tảng (constants/util) — phải xong trước vì Nhóm 2/3 tiêu thụ.
- Nhóm 4 (email) & Nhóm 5 (loader/rename) độc lập — có thể chạy song song với Nhóm 2/3.
- Nhóm 6 quét cuối để tránh xung đột diff với các refactor logic.

## 5. Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|--------|------------|
| Đổi pagination làm vỡ default web-app=12 | Override tường minh `WEB_APP_PAGINATION`, có test/kiểm chứng limit. |
| Xoá `stripUnknown` ở schema dùng ngoài pipe | B-9 bắt buộc grep confirm trước khi xoá. |
| Rename router sót chỗ tham chiếu | Grep toàn repo identifier cũ; type-check bắt lỗi còn sót. |
| Sweep comment đụng nhầm comment tốt | Chỉ sửa what/lặp; giữ comment giải thích "why". |
| Test hiện có vỡ do refactor | Green gate §4.7 chạy `yarn test` + type-check + build trước khi xong. |

## 6. Tiêu chí hoàn thành (Definition of Done)

- [ ] Toàn bộ B-1…B-10 xong theo thứ tự Nhóm.
- [ ] `yarn lint` xanh, `yarn type-check` xanh, `yarn test` xanh, `yarn build` xanh (trong
      worktree, dùng junction node_modules).
- [ ] Không thay đổi behavior: default limit (12/20), kết quả sort, route path, response shape
      giữ nguyên.
- [ ] Phần A (Q&A) lưu lại trong tài liệu này làm tham chiếu kiến thức.
- [ ] CLAUDE.md drift audit (§4.6) cho `server/.claude/CLAUDE.md` nếu đụng struct/convention
      (vd thêm `src/common/pagination`, `src/common/sort`).
