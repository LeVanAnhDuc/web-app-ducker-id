# Design — Access Control (per-user entitlement, end to end)

> Feature: `access-control` · Branch: `feat/access-control` · Worktree: `.worktrees/access-control`
> Brainstorm 05.10.2026. User chốt DR-1…DR-5 trong hội thoại, rồi uỷ quyền làm tới merge không qua
> các cổng duyệt còn lại — quyết định đánh dấu *(tự chốt)* là do agent quyết thay.

## 1. Bối cảnh & vấn đề

- Quyền vào app hiện **chỉ dựa trên role**, và rải ở hai quy tắc không khớp nhau:
  - Launcher (`isAppVisibleTo`, `findActiveByIds`, `listUserApps`): admin thấy toàn bộ catalog active,
    user thấy app có `user` trong `requiredRoles`.
  - `/oauth/authorize` (`assertEntitled`): `requiredRoles.includes(session.roles)` — admin bấm một app
    `[user]` (Blog) trong launcher sẽ bị `access_denied`. **Bug.**
- `entitlements` có schema nhưng không route, không seeder, không ai đọc. Collection rỗng (đã kiểm DB
  `ducker-id`: 0 document).
- Ma trận `/admin/entitlements` đã có UI, nhưng `useUserGrants` / `useUpdateUserGrants` chạy mock, và
  khoá cứng ô "không đủ role" — trái với G5/ADR-006 ("admin có thể override per-user: grant ngoại lệ
  hoặc revoke").

**Mục tiêu:** admin grant/revoke quyền vào app cho từng user thật, và quyết định đó có hiệu lực ở mọi
nơi user chạm tới app: danh sách `/apps`, header search, favorite, recent, thống kê home, và SSO.

## 2. Quyết định

| # | Quyết định | Lý do |
| --- | --- | --- |
| DR-1 | **Role mặc định + override.** Không có record → theo role. Record `allow` cấp ngoại lệ cho user không đủ role; `deny` chặn user đủ role. (User chọn) | Khớp G5/ADR-006; user mới đăng ký dùng được app ngay, không chờ admin. |
| DR-2 | **Admin đủ điều kiện mọi app theo mặc định, vẫn bị override được** (kể cả `deny`). (User chọn) | Một quy tắc cho mọi người; sửa bug authorize chặn admin. |
| DR-3 | **Phạm vi:** BE API + nối ma trận, áp quyền ở launcher, áp quyền ở OAuth authorize. Notification grant/revoke **đợi** `feat/notification-events` merge rồi tích hợp trong cùng branch này (§9). (User chọn) | |
| DR-4 | **Ô ma trận = quyền thực tế, server tự chuẩn hoá.** Tick khác mặc định → upsert override; tick về đúng mặc định → xoá override. Ô có override mang chấm brass + tooltip. (User chọn) | Giữ nguyên Edit/Save/Cancel + check-all; không cần control 3 trạng thái. |
| DR-5 | **Policy tập trung, override đọc lúc request** (hướng A). (User chọn) | Không có dữ liệu suy diễn để lệch; đổi role hoặc `requiredRoles` có hiệu lực ngay. Override mỗi user chỉ vài record → +1 query nhỏ theo index. |
| DR-6 | *(tự chốt)* **Favorite / recent của app bị revoke chỉ bị ẩn khi đọc, không xoá.** | Grant lại là chúng quay về; đúng cách app inactive đang được đối xử. |
| DR-7 | *(tự chốt)* **Không lưu lịch sử** grant/revoke; chỉ `updatedBy` + `updatedAt` của lần đổi gần nhất. | YAGNI — chưa màn nào hiển thị lịch sử. |
| DR-8 | *(tự chốt)* User đang ở trong app vệ tinh lúc bị revoke vẫn dùng được tới khi access token hết hạn (TTL 15 phút). | Chưa có `/oauth/revoke` / back-channel logout (`unfinished-features.md`). Lần SSO kế tiếp bị chặn. |
| DR-9 | *(tự chốt)* Seed override cho **`user2@test.com`**: `deny` Notes, `allow` Operations Console. | `user@test.com` là user của mọi E2E đếm app — seed override lên nó sẽ phá các suite khác. |
| DR-10 | *(tự chốt)* **Bỏ bước duyệt mock UI.** | Delta giao diện nhỏ (chấm brass, bỏ trạng thái "Role required"); tiền lệ của chính `admin-entitlements-matrix`. Visual được verify ở E2E gate B. |

## 3. Quy tắc quyền thực tế

```
roleAllows(role, requiredRoles) =
     requiredRoles.length === 0
  || role === "admin"                       // DR-2
  || requiredRoles.includes(role ?? "user")

effective(user, app) =
  override(user, app) ? override.effect === "allow" : roleAllows(user.role, app.requiredRoles)

visible(user, app)  = app.status === active && effective(user, app)     // launcher
authorize(user, app) = effective(user, app)                              // client đã resolve active ở resolveClient
```

Một override có thể trở nên trùng với mặc định nếu admin đổi `requiredRoles` sau đó — vô hại (kết quả
vẫn đúng), lần Save kế tiếp ở ô đó sẽ xoá nó.

## 4. Data model — `entitlements` (viết lại)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| `userId` | ObjectId → `User` | required |
| `webAppId` | ObjectId → `WebApp` | required |
| `effect` | enum `ENTITLEMENT_EFFECTS` (`allow` \| `deny`) | required |
| `updatedBy` | ObjectId → `User` | required — admin đổi gần nhất |
| `createdAt` / `updatedAt` | timestamps | mutable record |

Index: unique `{ userId: 1, webAppId: 1 }`, `{ webAppId: 1 }`. Bỏ `grantedBy`, `grantedAt`, `revokedAt`,
`isFavorite`, `lastLaunchedAt`, `launchCount` (đã chuyển sang `user_favorites` / `user_app_usages`).
Collection rỗng → không migration. Không có luồng xoá user/app → không cần dọn override.

## 5. API (admin, dưới `/api/v1`, `authGuard` + `adminGuard`)

### `GET /admin/entitlements?userIds=<id>,<id>`

- `userIds`: 1–50 ObjectId, phân tách bằng dấu phẩy, không trùng (Joi, `queryPipe`).
- 200 →
  ```json
  { "users": [ { "userId": "…", "grantedAppIds": ["…"], "overriddenAppIds": ["…"] } ] }
  ```
  Thứ tự `users` theo `userIds` gửi lên. `grantedAppIds` tính trên **mọi app** của catalog (mọi
  status — ma trận hiển thị toàn bộ catalog). Client suy ra mặc định của một ô = `granted XOR overridden`.
- Một id không tồn tại → 404 `ENTITLEMENT_USER_NOT_FOUND`.

### `PATCH /admin/entitlements`

- Body `{ "changes": [ { "userId", "appId", "granted": boolean } ] }`, 1–200 phần tử, không trùng cặp
  `(userId, appId)`.
- Validate **toàn bộ** trước khi ghi: user không tồn tại → 404 `ENTITLEMENT_USER_NOT_FOUND`; app không
  tồn tại → 404 `ENTITLEMENT_APP_NOT_FOUND`; không ghi gì.
- Mỗi cặp: `granted === roleAllows(...)` → xoá override; khác → upsert `effect = granted ? allow : deny`,
  `updatedBy = admin hiện tại`. Một `bulkWrite` không thứ tự.
- Idempotent. 200 → cùng shape với GET, chỉ các user bị ảnh hưởng (theo thứ tự xuất hiện đầu tiên).
- Rate limit theo IP + user như mutation category.

Swagger cho cả hai, đăng ký trong `libs/swagger/openapi.ts`.

## 6. Server — cấu trúc

### Module `modules/entitlement/` (từ stub thành module đầy đủ)

```
entitlement.module.ts        createEntitlementModule(rateLimiter) → { accessPolicy, entitlementAdminRouter }
entitlement.controller.ts    getMatrix, updateMatrix
entitlement.routes.ts        createEntitlementAdminRoutes(controller, rl)
entitlement.helper.ts        pure: roleAllows, canAccessApp, buildAccessFilter, toUserAccess
constants/index.ts           ENTITLEMENT_EFFECTS, ENTITLEMENT_LIMITS
types/index.ts               EntitlementDocument, AccessScope, AppAccessRule, bodies/requests
dtos/index.ts                UserAccessDto, EntitlementMatrixDto + mappers
repository/entitlement.repository.ts       interface
repository/impl/mongo-entitlement.repository.ts
services/access-policy/index.ts            AccessPolicy.resolveScope(userId, role) — 1 method, class + logic
services/entitlement-admin/{index,deps,get-matrix,update-matrix}.ts + shared/build-matrix.ts
services/*/spec/
swagger/{paths,schemas,index}.ts
```

- `AccessScope = { role?: string; allowIds: string[]; denyIds: string[] }`. `resolveScope` đọc
  override của một user (index `userId`) và trả scope; không cache (DR-5).
- `buildAccessFilter(scope)` → mảnh `FilterQuery` gắn qua **`$and`** (vì `buildWebAppFilter` đã dùng
  `$or` cho search và `findActiveByIds` đã đặt `_id`):
  - admin: `{ _id: { $nin: deny } }` (bỏ qua nếu `deny` rỗng).
  - còn lại: `{ $or: [ { requiredRoles: { $size: 0 } }, { requiredRoles: role ?? "user" }, { _id: { $in: allow } } ] }`
    + `{ _id: { $nin: deny } }`.
- `canAccessApp(app, scope)` là bản một-app của cùng quy tắc; `buildAccessFilter` và `canAccessApp`
  được test bằng cùng một bảng quyết định để không lệch.

### Phụ thuộc mới ở repository khác

- `UserRepository.findRolesByIds(userIds)` → `{ userId, role }[]` (aggregate qua `auth`, giống
  `findAdminUsers`).
- `WebAppRepository.findAccessRules(ids?)` → `{ _id, requiredRoles }[]` (mọi status; không `ids` = cả catalog).
- `WebAppRepository.findActiveByIds(ids, { access, search?, categoryId? })` — `access: AccessScope`
  thay cho `role`.

### Điểm áp quyền

| Nơi | Thay đổi |
| --- | --- |
| `web-app/services/list-user-apps.ts` | thay khối `requiredRoles = USER` bằng `$and: [buildAccessFilter(scope)]` |
| `web-app/helpers` `isAppVisibleTo(app, scope)` | nhận `AccessScope` thay cho `role`, dùng `canAccessApp` |
| `favorite/services/list.ts`, `favorite/guards/app-favoritable.guard.ts` | resolve scope rồi truyền xuống |
| `recent-app/services/{list,stats,record-launch}.ts` | như trên |
| `oauth/services/authorize.ts` `assertEntitled` | async; `canAccessApp(client, await accessPolicy.resolveScope(session.userId, session.roles))` |

`AccessPolicy` được inject vào deps của `web-app`, `favorite`, `recent-app`, `oauth`.
`modules.loader.ts` tạo `createEntitlementModule` **trước** `createWebAppModule` (nó tự new
`MongoWebAppRepository` + `MongoUserRepository` như `category` đang làm) và mount
`entitlementAdminRouter` trong nhóm App Registry.

### Lỗi & i18n

`ERROR_CODES.ENTITLEMENT_USER_NOT_FOUND`, `ENTITLEMENT_APP_NOT_FOUND`; namespace i18n `entitlement`
(en + vi): `errors.userNotFound`, `errors.appNotFound`, `success.get`, `success.update`, cùng message
validation cho `userIds` / `changes`.

### Seeder

`entitlement.seeder.ts` — upsert theo `(userId, webAppId)` (idempotent), chạy sau `seedWebApps`;
`clearEntitlements` trong nhánh `--clear`. Dữ liệu theo DR-9.

## 7. Client

- `requests/adminEntitlements.ts`: `getUserAccess(userIds)`, `updateUserAccess(changes)`; endpoint
  qua `CONSTANTS.ENDPOINTS`. Xoá `mocks/AdminEntitlements.ts` và type `Entitlement`.
- Types: `UserAccess { userId, grantedAppIds, overriddenAppIds }`; `EntitlementChange` giữ nguyên.
- `useUserGrants` → trả `Record<userId, UserAccess>` từ API thật. `useUpdateUserGrants` →
  `setQueryData` các user trong response rồi invalidate; toast như cũ.
- Ma trận:
  - Bỏ khái niệm "không đủ role": mọi ô đều chỉnh được; check-all áp lên **mọi** app của hàng.
    Xoá `isAppEligibleForUser`, icon `Minus` + i18n `cell.insufficientRole`,
    `matrix.insufficientRoleTooltip`.
  - **Chấm override** (màu brass của token `--keyline` theo MASTER.md, `size-1.5 rounded-full bg-keyline` — **không** `bg-accent`, vì `--accent` của shadcn là bề mặt hover) cạnh icon/
    checkbox khi ô là ngoại lệ. Non-edit: theo `overriddenAppIds`. Edit: tính live =
    `value !== roleDefault` với `roleDefault = granted XOR overridden` (server là nguồn quy tắc, client
    không tự tính role).
  - Tooltip + nhãn cho screen reader: `cell.overrideGranted` "Exception — granted beyond role" /
    "Ngoại lệ — được cấp ngoài role"; `cell.overrideRevoked` "Exception — revoked despite role" /
    "Ngoại lệ — bị thu hồi dù đủ role". Không truyền nghĩa chỉ bằng màu.
  - Subtitle ma trận cập nhật để nói quy tắc mặc định theo role.
- Launcher, favorite, recent, header search, home insights: **không đổi code client** — server đã lọc.

## 8. Testing

- **Server unit** (Jest, không DB): bảng quyết định `roleAllows × override` cho `canAccessApp` và
  `buildAccessFilter`; `AccessPolicy.resolveScope`; `getMatrix` (thứ tự, 404); `updateMatrix` (chuẩn
  hoá upsert/xoá, 404 không ghi, idempotent, response); cập nhật spec của `list-user-apps`, favorite,
  recent, `authorize` (allow override, deny override, admin vào app `[user]`).
- **Client**: `pnpm lint`, `tsc --noEmit`.
- **E2E**: theo matrix §10; chạy server `:5100` + client `:3100` của worktree, seed lại DB.

## 9. Notification (giai đoạn 2, trong cùng branch)

Sau khi `feat/notification-events` merge vào `main`: merge `origin/main` vào branch này rồi trong
`updateMatrix`, với mỗi cặp mà **quyền thực tế đổi** (không phải mỗi override đổi), gửi
`ENTITLEMENT_GRANTED` / `ENTITLEMENT_REVOKED` qua dispatcher của feature đó (category `account`,
`params: { appName }`, `link` tới `/apps` khi grant). Gửi sau khi `bulkWrite` thành công, không chặn
response. Chi tiết shape theo code đã merge — bổ sung vào spec này lúc tích hợp.

**Đã tích hợp (10.10.2026):**

- `updateMatrix` đọc override hiện có của các user (`findByUsers`) **trước** khi ghi, dựng
  `AccessScope` cũ bằng `toAccessScope` và so `canAccessApp(app, before)` với giá trị admin gửi.
  Chỉ cặp khác nhau mới vào danh sách `flipped` — lưu lại đúng giá trị đang có, đổi `allow` thành
  mặc định role tương đương, hay grant cho admin đều **không** gửi gì.
- Sau `applyChanges`, `notifyAccessChanges` lấy `displayName` + `status` qua `webAppRepo.findAll`
  (chỉ khi có cặp flipped) rồi gọi `notificationDispatcher.notify({ userId, type, params: { appName },
  link })`. `link` = `/apps?search=<appName>` khi grant, `null` khi revoke (app không còn mở được).
- App không `ACTIVE` thì không gửi: launcher không hiện app đó, câu "Giờ bạn đã có thể mở X" sẽ sai.
- Không throw: lỗi đọc tên app chỉ ghi log, lưu của admin vẫn thành công. Ghi lỗi thì không gửi.
- Dispatcher đi vào `createEntitlementModule(rateLimiter, notificationDispatcher)` →
  `EntitlementAdminServiceDeps.notificationDispatcher`. Client không đổi: type, icon và câu en/vi
  đã có sẵn từ `feat/notification-events`.

## 10. E2E Scenario Matrix

Hai file: `e2e/admin-entitlements/matrix.e2e.ts` (project `admin`, **reconcile** suite cũ) và
`e2e/web-app-access/launcher.e2e.ts` (project `chromium`, user `user@test.com`; override tạo qua API
bằng admin token trong `beforeAll`, xoá trong `afterAll`). Ma trận giờ ghi vào DB thật → mọi test
mutation chạy `serial` và **revert trong `afterAll`**.

| # | Nhóm | Scenario + expected | Kỹ thuật | Gate |
| - | --- | --- | --- | --- |
| 1 | Happy | Admin chọn `user@test.com` → hàng render với 6 cột; Blog/IDMS/Team Calendar/Notes = Granted (mặc định role), Analytics/Operations = Not granted; không chấm override. | — | A+B |
| 1b | Happy | Chọn `user2@test.com` (seed DR-9) → Notes = Not granted **có chấm**, Operations Console = Granted **có chấm**. | — | A+B |
| 2 | AuthN | Chưa đăng nhập `/admin/entitlements` → `/login`. | — | A+B |
| 3 | AuthZ | Non-admin vào `/admin/entitlements` → bị chặn (đã phủ ở `admin-authz/`, giữ `fixme` trỏ về đó). API `GET /admin/entitlements` với token user → 403. | [DT] role × route | A+B |
| 4 | Validation | Edit + chưa đổi → Save disabled + tooltip; đổi 1 ô → enabled; đổi rồi đổi lại → disabled (dirty về false). Ô từng "không đủ role" giờ là checkbox **enabled**. API: `userIds` rỗng / 51 id / id sai format → 400; `changes` rỗng / 201 phần tử / trùng cặp → 400; user/app không tồn tại → 404 và không ghi. | [EP] [BVA] 0/1/50/51 users, 0/1/200/201 changes | A+B (API: A only) |
| 5 | Empty | Chưa chọn user → empty state picker (giữ suite cũ). | — | A+B |
| 6 | Boundary | UI: N/A — ma trận không phân trang; giới hạn số lượng chỉ ở API, đã BVA ở #4. | — | — |
| 7 | Filter / search | N/A cho ma trận (không có filter mới). Launcher: user bị `deny` Notes → tìm "Notes" ở `/apps` và header search → không có kết quả. | [EP] | A+B |
| 8 | Data rendering | Icon Check/X, không `true/false`; chấm override có nhãn tooltip đúng chiều (granted beyond role vs revoked despite role). | — | A+B |
| 9 | i18n | en + vi: nút, tooltip override cả hai chiều, không còn key `insufficientRole`; không hiện key thô. | — | A+B |
| 10 | Error / loading | Skeleton khi đang tải (giữ suite cũ); PATCH lỗi 500 (route intercept) → toast lỗi, vẫn ở edit mode, giá trị giữ nguyên. | Error guessing | A+B |
| 11 | Mutation / state | **[DT]** `roleDefault × target`: user đủ role bỏ tick → lưu → chấm xuất hiện (deny); tick lại → lưu → chấm biến mất (override bị xoá, không còn `allow` thừa); user thiếu role tick → chấm (allow). **[ST]** Save → reload trang → giá trị giữ (persist thật). **[ST invalid]** double-click Save → chỉ 1 PATCH, kết quả không đổi (idempotent). Check-all trên hàng có cả ô thiếu role → mọi ô tick. Revert trong `afterAll`. | [DT] [ST] | A only |
| 11b | Enforcement | **[DT] override × điểm áp**: `user@test.com` bị `deny` Notes → Notes biến mất khỏi `/apps`, khỏi Favorites và Recently Used (nếu có), và `/oauth/authorize` của Notes trả `access_denied`. Được `allow` Operations Console → xuất hiện ở `/apps`. Xoá override → trở lại như cũ. | [DT] | A only |
| 11c | Admin | Admin mở `/oauth/authorize` của một app `[user]` (Blog) → không còn `access_denied` (bug DR-2). | [ST] | A only |
| 12 | A11y | Checkbox có nhãn `Grant {app} to {user}`; chấm override có nhãn đọc được (không chỉ màu); keyboard Space toggle + Save reachable; live region announce như cũ. | — | A+B |

Error-guessing bổ sung: hai tab admin cùng sửa một ô → bên lưu sau thắng (last-write-wins, upsert theo
cặp) — ghi nhận, không test tự động.

## 11. Ngoài phạm vi

Lịch sử grant/revoke; thu hồi token đang sống khi revoke (`/oauth/revoke`, back-channel); grant theo
cột (một app cho mọi user); entitlement theo nhóm; consent screen.
