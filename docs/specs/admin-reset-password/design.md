# Design — Admin Reset Password (+ force-change enforcement)

> Feature: Admin bấm "Reset password" cho 1 user ở trang quản trị → user nhận mật khẩu tạm qua email, bị buộc đổi mật khẩu ở lần đăng nhập kế tiếp.
> Ngày: 2026-07-24. Repos: `server/`, `client/`, `docs/`. Branch: `feat/admin-reset-password`.

## 1. Bối cảnh & phạm vi

UI AdminUsers (`client/src/views/AdminUsers`) đã có sẵn `AdminUsersResetPasswordDialog` + hook `useResetAdminUserPassword` nhưng đang dùng **mock** (`@/mocks/AdminUsers`). Feature này:

1. Wire nút reset-password → **API BE thật**.
2. Bổ sung **enforcement force-change-password**: sau reset, user bị buộc đặt mật khẩu mới ở lần đăng nhập kế tiếp (cờ `mustChangePassword` — đã tồn tại trong model + ERD: _"admin reset đặt true"_).

Đây là hạng mục backlog #2 (một phần) trong `docs/unfinished-features.md`, thuộc **G8 — Admin operations** (`reset-password override`).

### Tiền lệ tái dùng (reuse)

- `generateTempPassword()` — `server/src/modules/unlock-account/helpers`.
- `updatePassword(authId, hash)` — `authentication.repository`: set password + `passwordChangedAt` + `$inc tokenVersion` (revoke refresh token cũ).
- `generateAuthTokensResponse` / `generateIdToken` — thêm claim `mustChangePassword`.
- FE `useChangePassword` — **đã** `setTokens(tokens)` on success ⇒ auto re-login sẵn có.
- FE `useUserInfo` — decode idToken; expose thêm `mustChangePassword`.
- Form/schema `@/forms/ChangePassword` + `@/schemas` — tái dùng cho trang force-change.

### Ngoài scope (YAGNI)

- Force-logout / kill session tức thì (backlog riêng — `authGuard` không check per-request; giữ **soft model** như lock/unlock).
- Reset qua OTP/magic-link (đã cân nhắc, chọn temp-password emailed).
- Admin tự nhập/nhìn thấy mật khẩu mới (đã loại — admin không thấy pw).
- Password history / chống tái sử dụng mật khẩu cũ (chưa có ở dự án).

## 2. Quyết định thiết kế (đã chốt với user)

| Vấn đề | Quyết định |
|--------|-----------|
| Cơ chế reset | **Ghi đè mật khẩu thật** bằng temp pw random (không dùng side-channel `tempPasswordHash`) ⇒ login bình thường bằng temp pw, **KHÔNG** đụng `password-login.strategy`. |
| Session sau reset | Bump `tokenVersion` ⇒ revoke toàn bộ refresh token cũ của nạn nhân (soft: access token hiện tại sống tới hết TTL). |
| Admin không thấy pw | Temp pw chỉ gửi qua **email** cho user; API trả `{ _id, email }`. |
| Force-change | **Enforce trong feature này**: cờ `mustChangePassword` phơi qua **idToken claim**; FE chặn app + redirect tới trang force-change. |
| Trang force-change | **Route riêng tối giản** `/change-password` trong shell kiểu auth (kích hoạt SuperDesign 1.5). |
| Auto re-login | Đổi pass xong → `/auth/change-password` trả token mới (cờ=false) → `setTokens` → vào thẳng HOME, không login lại. |
| Guard-rail | **Chặn admin reset chính mình** (`ADMIN_CANNOT_RESET_SELF`, 403). Cho phép reset admin khác. Không có ràng buộc "last admin" (reset không disable ai). |
| Endpoint | `POST /admin/users/:id/reset-password`. |

## 3. Backend (`server/`)

### 3.1 Route — `user.routes.ts` (`createUserAdminRoutes`, đã có `authGuard + adminGuard`)

```
POST /admin/users/:id/reset-password  → controller.resetUserPassword
```

`paramsPipe(adminUserIdParamsSchema)` (reuse schema `:id` ObjectId đã có).

### 3.2 Controller — `resetUserPassword`

Gọi `service.adminResetPassword(req.params.id)` → `OkSuccess({ data, message: "user:success.resetPassword" })`.

### 3.3 Service — `UserService.adminResetPassword(id: string)`

1. `validateObjectId(id, "id")` → sai format: `BadRequestError` (400).
2. `userRepo.findAuthIdById(id)` (đã có) → không có: `NotFoundError` `USER_NOT_FOUND` (404).
3. **Self-reset guard**: `target.authId === RequestContext.requireAuthId()` → `ForbiddenError` `ADMIN_CANNOT_RESET_SELF` (403).
4. `tempPassword = generateTempPassword()`; `hash = await hashValue(tempPassword)`.
5. `authService.adminResetPassword(target.authId, hash)` (method mới — §3.4).
6. Lấy email user (`userRepo.findByAuthId` / có sẵn trong `findAuthIdById`? — nếu chưa, mở rộng repo trả cả email) để dispatch email + trả về.
7. `emailDispatcher.send(EmailType.ADMIN_RESET_PASSWORD, { email, data: { tempPassword, loginUrl }, locale })` (fire-and-forget qua queue).
8. Trả `{ _id: id, email }`.

> **Precedence lỗi**: format(400) > tồn tại(404) > self(403) — theo thứ tự bước 1→3.

### 3.4 Repository

`authentication.repository` thêm method mới (tách khỏi `updatePassword` để không đụng ngữ nghĩa clear-cờ):

```ts
adminResetPassword(authId: string, hashedPassword: string): Promise<void>
// findByIdAndUpdate: { password, passwordChangedAt: new Date(),
//   mustChangePassword: true, $inc: { tokenVersion: 1 } }
```

**Sửa `updatePassword`** (dùng bởi change-password + forgot-password reset): thêm `mustChangePassword: false` vào `$set` — ngữ nghĩa: đặt mật khẩu mới ⇒ hết "phải đổi". (Không xung đột: admin-reset dùng method riêng set `true`.)

`user.repository.findAuthIdById` — nếu hiện chỉ select `authId`, mở rộng select thêm `email` (hoặc thêm 1 lookup). Note khi implement.

### 3.5 Token claim — `mustChangePassword` vào idToken

- `generateAuthTokensResponse(...)` thêm param `mustChangePassword: boolean` → truyền vào `generateIdToken({ ..., mustChangePassword })`.
- Cập nhật type `IdTokenPayload` (thêm `mustChangePassword?: boolean`).
- Mọi call-site mint token đọc `auth.mustChangePassword` truyền vào: login-completion, token refresh, change-password, unlock-verify, forgot-password reset. (Default `false` an toàn cho token cũ.)

### 3.6 Email template

`EmailType.ADMIN_RESET_PASSWORD` + template React Email mới (`server/src/services/email/templates/`): nội dung "Quản trị viên đã đặt lại mật khẩu của bạn. Mật khẩu tạm: `X`. Bạn sẽ được yêu cầu đặt mật khẩu mới khi đăng nhập." + `loginUrl`. Locale en + vi (i18next / template copy).

### 3.7 Error codes / i18n (BE)

- `ERROR_CODES.ADMIN_CANNOT_RESET_SELF` (thêm vào nhóm phù hợp).
- i18n: `user:errors.cannotResetSelf` (en + vi); `user:success.resetPassword` (en + vi).

### 3.8 Swagger + Postman

Thêm path `POST /admin/users/:id/reset-password` vào `user/swagger/paths.ts` + schema response `{ _id, email }`; cập nhật Postman collection (skill `standard-doc-api`).

### 3.9 Schema & Seed

- **Không đổi schema**: `mustChangePassword` đã có (`default false`), temp/token fields đã có. Không migration.
- Seeder: đảm bảo có ≥1 user thường (non-admin, non-self) để test reset. Idempotent.

## 4. Frontend (`client/`)

### 4.1 Wire nút reset (AdminUsers)

- `constants/endpoints.ts`: `ADMIN_USER_RESET_PASSWORD: "/admin/users/:id/reset-password"` (dynamic → `generatePath`).
- `requests/adminUsers.ts`: `resetAdminUserPassword(id): Promise<{ _id: string; email: string }>` → `axiosInstance.post(generatePath(END_POINTS.ADMIN_USER_RESET_PASSWORD, { id }))`.
- `views/AdminUsers/hooks/useResetAdminUserPassword.ts`: đổi import `@/mocks/AdminUsers` → `@/requests/adminUsers`. Giữ toast `resetSuccess` + announce `passwordReset`.
- `mocks/AdminUsers.ts`: **xóa** `resetAdminUserPassword` (chỉ hook này dùng). Giữ phần còn lại (còn mock khác dùng).
- **UI dialog không đổi** → phần này KHÔNG kích hoạt SuperDesign (đã có sẵn).

### 4.2 Route force-change (UI MỚI → SuperDesign 1.5)

- Route: `app/[locale]/(private)/(force-password)/change-password/page.tsx` + `(force-password)/layout.tsx` = **shell auth tối giản** (card giữa màn, logo, KHÔNG sidebar). Nằm trong `(private)` ⇒ `AuthGuardLayout` đảm bảo phải có token.
- `CONSTANTS.ROUTES.FORCE_CHANGE_PASSWORD = "/change-password"`.
- View mới `views/ForceChangePassword/` (theo cấu trúc `views.md`): form tối giản **current (temp pw) + new + confirm**, tái dùng schema/field `@/forms/ChangePassword`. Submit → `useChangePassword` (hoặc biến thể) → on success token mới cờ=false → `setTokens` → **redirect HOME**.
- **≤200 dòng/file**, `useEffect` → ghosts, form field pattern, i18n, icon-map, `Custom*` wrappers.

### 4.3 Gate hiển thị — `AuthGuardLayout` (qua ghost)

Sau check token, đọc `mustChangePassword` (từ `useUserInfo`):

- Cờ `true` + pathname ≠ `/change-password` → **redirect `/change-password`** (chặn toàn private app).
- pathname = `/change-password` → exempt (tránh redirect loop).
- Cờ `false` + user vào thẳng `/change-password` → redirect HOME.

`useEffect` redirect đặt trong ghost (rule `ghosts.md`). Announce khi bị chuyển sang force-change (rule `accessibility.md`).

### 4.4 Expose cờ

- `useUserInfo`: thêm `mustChangePassword: idPayload.mustChangePassword ?? false` vào return.
- `types/User`: `DecodedIdToken` thêm `mustChangePassword?: boolean`.

### 4.5 i18n (FE)

- Namespace mới `forceChangePassword` (title, description, form labels, submit, announce) — en + vi.
- `adminUsers.toast.resetSuccess` / `adminUsers.announce.passwordReset` — đã có (mock dùng), giữ.

## 5. API contract (BE DTO ↔ FE type)

| BE | FE |
|----|----|
| `POST /admin/users/:id/reset-password` → `{ _id, email }` | `resetAdminUserPassword(id) → { _id, email }` |
| idToken claim thêm `mustChangePassword: boolean` | `DecodedIdToken.mustChangePassword?: boolean` |
| `POST /auth/change-password` (không đổi contract) → tokens (cờ=false) | `useChangePassword` (đã có) |

## 6. Env

Không cần env var mới (email + `CLIENT_URL`/login URL đã cấu hình; reuse như unlock-account).

## 7. Bảo mật (chuẩn bị cho §4.5 security review)

- **Email plaintext temp pw**: chấp nhận (tiền lệ unlock-account); temp pw = mật khẩu thật tới khi đổi ⇒ **enforce force-change** giảm rủi ro (buộc đổi lần login sau). Không log temp pw (redact — theo `@LogMethod` + access-log redaction đã có).
- **AuthZ**: endpoint sau `authGuard + adminGuard`; self-reset chặn ở service.
- **Session revoke**: bump tokenVersion cắt refresh token cũ.
- **Rate-limit**: cân nhắc gắn rate-limiter cho endpoint reset để tránh email-bombing 1 user (reuse `RateLimiterMiddleware` như module khác) — chốt ở plan/security review.
- **Enumeration**: endpoint admin-only + trả `{ _id, email }` cho id hợp lệ; id không tồn tại → 404 (chấp nhận, chỉ admin gọi được).

## 8. Kiến trúc component (client)

```
app/[locale]/(private)/(force-password)/
  layout.tsx                     shell auth tối giản (no sidebar)
  change-password/page.tsx       render views/ForceChangePassword
views/ForceChangePassword/
  index.tsx                      compose form + ghost
  mains/ForceChangePasswordForm/ form current+new+confirm (reuse @/forms/ChangePassword)
  ghosts/ForceChangeRedirect/    (nếu cần) redirect HOME khi cờ=false
layouts/AuthGuardLayout/
  ghosts/MustChangePasswordGate/ redirect → /change-password khi cờ=true (hoặc inline ghost)
```

---

## E2E Scenario Matrix

Feature có **2 bề mặt hành vi**: (S1) admin reset action ở `/admin/users`; (S2) force-change flow (login temp pw → redirect → đổi → home). Test file dự kiến: `client/e2e/admin-users-reset/*.e2e.ts` (project `admin` cho S1; S2 cần context user thường + temp pw thật). Cột `Gate`: `A+B` = cả 2 gate; `A only` = mutation-heavy (reset thật đổi mật khẩu account khác / đổi pw) → gate B chỉ verify read/render.

| # | Nhóm | Scenario + expected | Kỹ thuật | Gate |
| - | ---- | ------------------- | -------- | ---- |
| 1 | Happy path | **S1**: Admin mở dialog reset user thường → confirm → toast `resetSuccess`, dialog đóng, announce nêu đúng tên user. **S2**: user login bằng temp pw → bị đưa tới `/change-password` → nhập temp+new+confirm → vào thẳng HOME (không login lại). | **[ST]** reset→login→force→home | S1: A only · S2: A only |
| 2 | AuthN | Chưa login gọi `POST /admin/users/:id/reset-password` → 401. Truy cập `/change-password` khi **không có token** → redirect `/login`. | — | A+B |
| 3 | AuthZ | **[DT]** role×endpoint: user thường gọi reset → 403 (`adminGuard`, admin route không có FE role guard); admin → 200. Non-admin gọi reset **self-id** VÀ **admin khác** → đều 403 ở `adminGuard` TRƯỚC (không chạm nhánh self-guard). Non-admin AuthZ trang: **defer** (`test.fixme`, cần non-admin storageState; `admin-authz/` đã phủ /admin/* denial). | [DT] | A+B (phần admin) |
| 4 | Validation / expected-error | **S1 [DT]** precedence: `id không phải ObjectId → 400` · `id 24-char non-hex → 400` · `id không tồn tại → 404 USER_NOT_FOUND` · `reset chính mình → 403 ADMIN_CANNOT_RESET_SELF` · `reset admin khác → 200`. **S2 form [EP]** newPassword classes: `valid` · `empty` · `no-upper` · `no-digit` · `< min-len` · `confirm≠new` — mỗi class 1 case (client Zod). **[DT]** `currentWrong(temp sai) + newValid` → BE 400 wrong-current · `currentOK + newInvalid` → client chặn trước submit. | [DT][EP] | S1: A only · S2 form: A+B |
| 5 | Empty / null | S2: `/change-password` không có UI list → N/A empty-list. Cờ `false` mà vào thẳng `/change-password` → redirect HOME (không hiện form "trống"). S1 dialog với `target=null` → không mở. | [EP] cờ {true,false} | A+B |
| 6 | Boundary / pagination | **S2 [BVA]** newPassword length: `min-1`(reject) · `min`(accept) · `max`(accept) · `max+1`(reject) — theo `passwordSchema` hiện có (đọc giá trị thật lúc plan). S1 không có pager riêng (dùng list AdminUsers có sẵn) → pagination N/A ở feature này. | [BVA] | A+B (S2 form) |
| 7 | Filter / search | N/A — feature không thêm filter/search (S1 dùng filter list AdminUsers đã có; S2 là form). | — | — |
| 8 | Data rendering | S1: toast/announce nêu **tên + email thật** (không id thô). S2: form hiện label i18n (không key thô); không lộ temp pw trên UI ngoài ô input. idToken claim không render ra text. | — | A+B |
| 9 | **i18n (en + vi)** | **S1**: dialog title/description, toast, action labels render đúng **en VÀ vi**. **S2**: trang force-change (title/description/labels/validation/submit) + announce render đúng **en VÀ vi**; không thiếu key `[forceChangePassword.*]`. | — | A+B |
| 10 | Error / loading | S1: BE 5xx khi reset → error toast (axios interceptor), nút confirm hết loading (không kẹt); nút loading khi `isPending`. S2: `/auth/change-password` 5xx → error toast, không rời trang force-change (cờ vẫn true). Loading skeleton/submit spinner. | Error Guessing | S1: A only · S2: A+B (loading) |
| 11 | Mutation safety | **[ST]** S1: reset user B → login B bằng temp pw OK (transition hợp lệ); login B bằng **mật khẩu CŨ** → fail (invalid transition, pw đã đổi). Double-click confirm reset → **đúng 1** request (nút disabled khi pending). **S2 [ST]**: đổi pw thành công → token cũ (cờ=true) thay bằng token mới (cờ=false) → không còn redirect; refresh bằng **refresh token cũ của B** (trước reset) → 401 (invalid transition, tokenVersion bumped). **Revert**: `afterAll` — account victim là user seed dành riêng cho reset; đặt lại mật khẩu về giá trị seed (idempotent) để chạy lại. | [ST] | A only |
| 12 | Accessibility | S1: dialog focus trap + focus về trigger khi đóng; nút menu có `aria-label`; announce sau reset. S2: form `<label>`↔input, tab order current→new→confirm→submit, `aria-invalid` khi lỗi; announce khi bị redirect sang force-change + khi đổi thành công. Keyboard-only submit → đúng 1 request. | — | A+B |

### BE contract tests (integration/unit — không phải Playwright)

- `adminResetPassword` service: temp pw sinh + hash + `mustChangePassword=true` + tokenVersion bumped + email dispatched + `{ _id, email }`.
- Self-reset guard: `target.authId === self` → 403 `ADMIN_CANNOT_RESET_SELF`.
- 404: id không tồn tại → `USER_NOT_FOUND`.
- Login sau reset: login bằng temp pw → OK, idToken claim `mustChangePassword=true`; login bằng pw cũ → fail.
- change-password sau force: `updatePassword` set `mustChangePassword=false` → token mới claim=false.
- Refresh-after-reset: refresh token cũ (trước reset) → revoked (tokenVersion mismatch).

### Follow-up / defer (no silent gap)

- **Non-admin AuthZ trang** (#3): `test.fixme` — cần non-admin project; `admin-authz/` đã phủ denial /admin/*.
- **Rate-limit reset** (#7/#10 biên): nếu quyết định gắn rate-limiter (§7) → thêm case 429 khi vượt ngưỡng; chốt ở plan/security review.
- **Completeness critic**: chạy 1 subagent tìm case thiếu ở `writing-plans` (feature auth-sensitive, đa bề mặt).

### Dual-gate (§4.3)

- **Gate A** — `cd client && yarn e2e --project=admin -g "Admin Reset Password"` (+ suite S2 force-change) trên app thật.
- **Gate B** — MCP browser walk cùng matrix (auth context riêng); walk mọi row `A+B`, SKIP mutation của row `A only` (reset thật + đổi pw) — chỉ verify read/render/i18n/a11y.
- Fail → `systematic-debugging` → `e2e-bugs.md` → fix → re-run (max 3 vòng).

## 9. Artifact & vị trí

- BE: `server/src/modules/user/**` (routes/controller/service/repo mới), `authentication.repository` (+ method + sửa updatePassword), `authentication/helpers` + `token/helpers` (claim), `services/email` (template + EmailType), `constants/error-code.ts`, i18n locales, swagger.
- FE: `client/src/{constants/{endpoints,routes}.ts, requests/adminUsers.ts, views/AdminUsers/hooks/useResetAdminUserPassword.ts, mocks/AdminUsers.ts, hooks/useUserInfo.ts, types/User, layouts/AuthGuardLayout, views/ForceChangePassword, app/[locale]/(private)/(force-password)/**, locales}`.
- docs: `docs/specs/admin-reset-password/{design.md, e2e.md}` (+ `security-report.md`).
- UI mock: `docs/ui-designs/admin-reset-password/*.html` (SuperDesign 1.5, light+dark).
- E2E test: `client/e2e/admin-users-reset/*.e2e.ts`.
