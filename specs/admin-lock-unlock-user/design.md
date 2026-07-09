# Design: Admin Lock/Unlock User

> Feature: Admin khóa/mở khóa tài khoản user. Wire UI hiện có (đang mock) sang API thật.
> Ngày: 2026-07-09. Repos: `server/`, `client/`, `docs/`. Branch: `feat/admin-lock-unlock-user`.

## 1. Bối cảnh & phạm vi

UI AdminUsers (`client/src/views/AdminUsers`) đã có sẵn đầy đủ (bảng, dropdown action, `AdminUsersLockDialog`, `UserStatusBadge`) nhưng 4 mutation đang dùng mock (`@/mocks/AdminUsers`). Feature này wire **lock/unlock** sang API thật.

**Cờ khóa = `auth.isActive`** (collection `auths`, đã tồn tại trong schema). Ngữ nghĩa hiện có:

- `AccountActiveGuard` (login): `isActive=false` → chặn login, lỗi `LOGIN_ACCOUNT_INACTIVE`.
- `AuthActiveGuard` (token refresh): `isActive=false` → chặn refresh, lỗi `REFRESH_TOKEN_INVALID`.
- `authGuard` (verify access token mỗi request) **KHÔNG** check `isActive` (theo thiết kế — tránh DB hit mỗi request).

**Soft lock**: set `isActive=false` chặn login mới + refresh. Access token hiện tại của nạn nhân còn hiệu lực đến hết TTL (~vài phút) rồi refresh fail. **Không đụng `authGuard`**.

### Ngoài scope

- **Force-logout / kill session tức thì** — feature riêng (backlog #2 khác). Muốn kill ngay cần check `isActive` per-request hoặc bump `tokenVersion` + logic session — không làm ở đây.
- **Reset password admin** — vẫn mock (backlog riêng).
- **Lockout do login sai** (Redis `failed-attempts`) — cơ chế độc lập, tự phục hồi, admin unlock KHÔNG đụng tới.

## 2. Quyết định thiết kế (đã chốt với user)

| Vấn đề | Quyết định |
|--------|-----------|
| Guard rails | **Chặn admin tự khóa chính mình** (`ADMIN_CANNOT_LOCK_SELF`). Cho phép lock admin khác, **NHƯNG** chặn khóa admin active cuối cùng (`ADMIN_CANNOT_LOCK_LAST_ADMIN` — thêm sau security review, tránh lockout toàn bộ quản trị). |
| Session khi lock | **Soft lock** (không kill session tức thì). |
| Endpoint | **2 endpoint riêng**: `/lock` và `/unlock`. |
| Idempotency | Lock user đã khóa / unlock user đã active → **200 idempotent**, không lỗi (PATCH idempotent). |
| Return contract | `{ _id: string; isActive: boolean }` (FE hook chỉ invalidate list + toast — YAGNI). |

## 3. Backend (`server/src/modules/user`)

### Routes (`user.routes.ts` — thêm vào `createUserAdminRoutes`, đã có `authGuard + adminGuard`)

```
PATCH /admin/users/:id/lock    → controller.lockUser
PATCH /admin/users/:id/unlock  → controller.unlockUser
```

### Controller

`lockUser` / `unlockUser` → gọi `service.setUserActive(id, false|true)` → `OkSuccess`.

### Service `setUserActive(id: string, isActive: boolean)`

1. `validateObjectId(id, "id")` → sai định dạng: `BadRequestError` (400).
2. Lấy `authId` của target theo userId (repo). Không tồn tại → `NotFoundError` `USER_NOT_FOUND` (404).
3. **Self-lock guard**: nếu `isActive === false` và `target.authId === RequestContext.requireAuthId()` → `ForbiddenError` code mới `ADMIN_CANNOT_LOCK_SELF` (403). Unlock không check.
4. `authRepo.setActive(authId, isActive)` → cập nhật `auth.isActive`.
5. Trả `{ _id: id, isActive }`.

Idempotent: bước 4 set thẳng giá trị, không kiểm tra trạng thái trước → lock/unlock lặp lại vẫn 200.

### Repository

- `user.repository`: thêm `findAuthIdById(userId): Promise<{ authId }|null>` (select `authId`).
- `authentication.repository`: thêm `setActive(authId, isActive): Promise<void>` (`updateOne { $set: { isActive } }`).

### Error codes / i18n

- Thêm `ADMIN_CANNOT_LOCK_SELF` vào `ERROR_CODES`.
- Thêm message i18n `user:errors.cannotLockSelf` (en + vi).
- Message success: `user:success.lockUser` / `user:success.unlockUser`.

### Validators

- `params` schema cho `:id` (reuse pattern ObjectId hiện có).

### Swagger (`standard-doc-api`)

Thêm 2 path vào `user/swagger/paths.ts` + response schema `{ _id, isActive }`; cập nhật Postman collection.

### Schema & Seed

- **Không đổi schema** (`isActive` đã có, default `true`) → không cần migration.
- Seeder (`database/seeders/data/users.ts`): đảm bảo tồn tại ≥1 user `isActive:false` (locked) + user `isActive:true` (active) để E2E có sẵn dữ liệu 2 trạng thái. Idempotent (`yarn seed` chạy lại không nhân đôi).

## 4. Frontend (`client/src`)

- `constants/endpoints.ts`: thêm `ADMIN_USER_LOCK(id)` = `/admin/users/${id}/lock`, `ADMIN_USER_UNLOCK(id)` = `/admin/users/${id}/unlock`.
- `requests/adminUsers.ts`: thêm
  - `lockAdminUser(id): Promise<{ _id: string; isActive: boolean }>` → `axiosInstance.patch(END_POINTS.ADMIN_USER_LOCK(id))`.
  - `unlockAdminUser(id)` tương tự với `/unlock`.
- `views/AdminUsers/hooks/useLockAdminUser.ts` + `useUnlockAdminUser.ts`: đổi import `@/mocks/AdminUsers` → `@/requests/adminUsers`. Giữ nguyên `invalidateQueries` + toast + announce.
- `mocks/AdminUsers.ts`: **xóa** `lockAdminUser` / `unlockAdminUser` (chỉ 2 hook trên dùng). **Giữ** `getAdminUsers` / `getAdminUserById` (AdminEntitlements còn dùng) + `resetAdminUserPassword` / `forceLogoutAdminUser` (còn mock).
- **UI không đổi**: dialog, badge, dropdown, error-toast (axios interceptor) giữ nguyên → SuperDesign step 1.5 SKIP.

### API contract (BE DTO ↔ FE type)

| BE | FE |
|----|----|
| `PATCH /admin/users/:id/lock` → `{ _id, isActive:false }` | `lockAdminUser(id) → { _id, isActive }` |
| `PATCH /admin/users/:id/unlock` → `{ _id, isActive:true }` | `unlockAdminUser(id) → { _id, isActive }` |

## 5. Env

Không cần env var mới.

## 6. E2E Scenario Matrix

Feature mutation (admin lock/unlock). Suite mới `client/e2e/admin-users-lock/`.
Gate: `A+B` = cả 2 gate chạy; `A only` = mutation-heavy, gate B chỉ verify read/render.

| # | Category | Scenario + expected | Gate |
|---|----------|--------------------|------|
| 1 | Happy path | Admin lock user active → toast success, badge "Active"→"Locked", list refetch. Unlock user locked → badge "Locked"→"Active", toast success. **[ST]** transition hợp lệ | A only |
| 2 | AuthN | Chưa login gọi `PATCH /admin/users/:id/lock` → 401 | A+B |
| 3 | AuthZ | User role thường gọi lock/unlock → 403 (BE `adminGuard`; admin route không có FE role guard). **[DT]** role × endpoint: `user→403`, `admin→200`. **Guard order (critic #9)**: non-admin gọi lock **admin khác** VÀ lock **chính self-id** → đều 403 ở tầng `adminGuard` TRƯỚC, không bao giờ chạm nhánh `ADMIN_CANNOT_LOCK_SELF` | A+B |
| 4 | Validation / expected-error | **[DT]** precedence format(400) > tồn tại(404) > self(403): `id không phải ObjectId → 400` · `id 24-char non-hex → 400` (critic #10) · `id không tồn tại → 404 USER_NOT_FOUND` · `lock chính mình → 403 ADMIN_CANNOT_LOCK_SELF` · `lock admin khác → 200`. **[BVA/Error-guess]** `/admin/users//lock` (empty seg) → routing 404 · sai method (GET/POST lên route lock) → 404/405 | A only |
| 5 | Empty / null | N/A cho mutation — render list (`lastLoginAt=null`→"Never") thuộc suite AdminUsers list hiện có. Case list-rỗng-sau-lock gộp vào row 6 | — |
| 6 | Boundary / pagination | ✅ (critic #5) Lock 1 user khi filter `status=active` + đang phân trang → row biến mất khỏi page hiện tại sau invalidate: **không crash trên page rỗng**, page count điều chỉnh, không nhảy focus/scroll về index cũ. Lock row cuối của page → page collapse hoặc hiện empty-state | A only |
| 7 | Filter / search | Sau lock user X → filter `status=locked` hiện X; `status=active` ẩn X (behavior quan sát được sau mutation) | A only |
| 8 | Data rendering | Badge nhãn "Active"/"Locked" (không phải boolean thô); dropdown action label toggle "Lock"↔"Unlock" theo `isActive`; nút variant destructive khi lock / default khi unlock | A+B |
| 9 | **i18n (en + vi)** | Dialog title/description (lock + unlock), toast success, badge, action labels render đúng CẢ en VÀ vi | A+B |
| 10 | Error / loading | BE 5xx khi lock → error toast (axios interceptor), nút confirm hết loading (không kẹt). Nút confirm loading state khi `isPending`. **Non-optimistic (critic #6)**: badge **KHÔNG** đổi cho tới khi mutation success + refetch (không flip sớm rồi rollback) — assert badge giữ nguyên khi đang pending & khi lỗi | A only |
| 11 | Mutation safety | **[ST]** active→locked→active (valid). **[DT]** idempotent (critic #3): unlock user đã active → 200 no-op · lock→lock lần 2 → 200 badge vẫn Locked. **[DT]** double-submit confirm → **đúng 1** request / nút disabled khi pending (ghép với keyboard-confirm row 12 để assert exactly-one). **Announce đúng target (critic #11)**: lock user B → toast/announce nêu đúng B, không phải A. **Revert**: `afterAll` unlock user đã lock (idempotent) | A only |
| 12 | Accessibility | Dropdown keyboard nav (Enter mở, arrow di chuyển); dialog focus trap + focus về trigger khi đóng; `aria-label` nút menu; announce live-region sau lock/unlock. **Dismiss paths (critic #8)**: Cancel / ESC / click overlay → đóng dialog + **0 request**; keyboard-only Enter trên confirm → **đúng 1** request | A+B |

### BE contract tests (integration/unit — không phải Playwright E2E)

Các contract dưới đây kiểm ở tầng BE test (`*.spec.ts`), chính xác & ổn định hơn drive browser:

- **Soft-lock capability (critic #1)**: access token cấp TRƯỚC khi lock vẫn `200` trên protected endpoint ngay sau lock (vì `authGuard` không check `isActive`); chỉ fail sau khi refresh.
- **Refresh-after-lock error code (critic #2)**: `POST /auth/token/refresh` khi `isActive=false` → đúng code `REFRESH_TOKEN_INVALID` (không phải 401 generic).
- **Login-after-lock (row 11 downstream)**: login khi locked → `LOGIN_ACCOUNT_INACTIVE`; sau unlock → login OK.
- **setUserActive idempotent + self-lock guard**: unit test service (lock đã-locked → ok; self authId → 403).

### Deferred / N/A có lý do

- **Concurrent 2nd-admin tab → target đã bị xóa (critic #4)**: N/A — dự án **chưa có** feature delete user; lock-after-lock là 200 idempotent nên không có lost-update. Nếu sau này có delete → thêm case 404-on-stale.
- **Admin own-session expiry mid-action (critic #7)** & **back/forward zombie dialog (critic #12)**: DEFER khỏi E2E committed — phụ thuộc timing token TTL & dễ flaky; axios refresh-retry interceptor đã cover đường re-auth chung. Ghi nhận là follow-up thủ công nếu cần.

### Ghi chú contamination (CLAUDE.md §4.3)

- Scenario `A only` (lock/unlock thật + đổi khả năng login account khác) → gate B KHÔNG mutate; chỉ verify render/i18n/authz-visible.
- Row 11 login-effect: dùng **account victim riêng** cho login (không share storageState với admin context). Test tự revert bằng unlock ở `afterAll`.
- Rate-limit: login guard 30/15min — test login-effect giữ số lần login thấp / clear Redis nếu cần.

## 7. Artifact & vị trí

- BE: `server/src/modules/user/**` (+ `models`/`constants`/`validators`/`locales` liên quan), swagger.
- FE: `client/src/{constants/endpoints.ts, requests/adminUsers.ts, views/AdminUsers/hooks/*, mocks/AdminUsers.ts}`.
- Spec: `docs/specs/admin-lock-unlock-user/{design.md, e2e.md}` (+ `security-report.md`, `e2e-bugs.md` khi cần).
- E2E test: `client/e2e/admin-users-lock/*.e2e.ts`.
