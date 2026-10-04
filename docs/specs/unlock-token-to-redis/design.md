# Design — Chuyển temp password của unlock-account sang Redis

> Refactor: mật khẩu tạm mở khoá tài khoản đang lưu ở Mongo (`auths.tempPassword*`) → chuyển sang Redis, dọn field + data rác khỏi DB.
> Ngày: 2026-10-04. Repo: `server/`, `docs/`. Branch: `refactor/unlock-token-to-redis`.

## 1. Bối cảnh

Module `unlock-account` cho phép user tự mở khoá khi bị lock do **đăng nhập sai ≥ 10 lần** (`LOGIN_LOCKOUT.MAX_ATTEMPTS`, lockout 1800s). Luồng: `POST /auth/unlock/request` gửi mật khẩu tạm 16 ký tự qua email → `POST /auth/unlock/verify` đổi lấy token đăng nhập.

Toàn bộ state của luồng này **đã nằm ở Redis** — ngoại trừ chính mật khẩu tạm:

| State                     | Hiện ở                                             | TTL          |
| ------------------------- | -------------------------------------------------- | ------------ |
| Đếm lần sai + cờ lockout  | Redis `login-failed-attempts` / `login-lockout`    | 1800s        |
| Cooldown giữa 2 lần request | Redis `unlock-cooldown`                           | 60s          |
| Rate limit 3 req/giờ      | Redis `unlock-rate`                                | 3600s        |
| **Hash mật khẩu tạm**     | **Mongo `auths.tempPasswordHash`**                 | **không có** |
| **Hạn mật khẩu tạm**      | **Mongo `auths.tempPasswordExpAt`**                | —            |
| **Cờ đã dùng**            | **Mongo `auths.tempPasswordUsed`**                 | —            |

`unlock-account.repository.ts` còn khai sẵn key `LOGIN.UNLOCK_TOKEN = "login-unlock-token"` và private method `unlockTokenKey()` **không ai gọi** — thiết kế ban đầu định để Redis rồi bỏ dở. Không có spec nào ghi lại lý do đổi sang Mongo.

### Tại sao Mongo là chỗ sai

1. **Durability không mua được gì.** Lập luận duy nhất bênh Mongo là "Redis mất data thì mã trong email chết". Nhưng cờ lockout cũng ở Redis — Redis mất thì tài khoản **tự hết khoá**, mã tạm thành vô nghĩa. Credential đang bền hơn chính điều kiện nó dùng để mở.
2. **One-time-use không atomic.** `TempPasswordValidGuard.assert()` đọc doc → bcrypt compare → `markTempPasswordUsed()` chạy ở bước sau trong service. Hai thao tác tách rời, không CAS: hai request song song cùng một mã đều qua được check `tempPasswordUsed === false`.
3. **Rác tồn vĩnh viễn.** Không có TTL index trên `tempPasswordExpAt`, `updatePassword()` cũng không clear. Hash cũ nằm lại trong `auths` mãi mãi.
4. **Ghi thừa vào doc nóng.** 4 field ghi vào `auths` chỉ để phục vụ 15 phút.

### Tiền lệ tái dùng

`RedisResetTokenRepository` (`forgot-password/repositories/reset-token.repository.ts`) — cùng bài toán (token một lần, hash bcrypt, TTL Redis), và `ResetTokenValidGuard` của nó **gộp** "sai" và "hết hạn" thành một lỗi duy nhất. `oauth.repository.ts` là tiền lệ cho one-time consume atomic.

### Ngoài scope

- Không đổi API contract (`/auth/unlock/request`, `/auth/unlock/verify` giữ nguyên request/response body).
- Không đụng admin lock/unlock (`auth.isActive`) — cơ chế riêng, không liên quan.
- Không đụng `adminResetPassword` — nó ghi thẳng vào `auths.password`, không dùng side-channel này (đã chốt ở `docs/specs/admin-reset-password/design.md`).
- Không đổi `generateTempPassword()`.
- Không có FE: luồng self-unlock **chưa có UI** (`client/` chỉ có admin lock/unlock). Zero FE impact, không cần e2e Playwright.

## 2. Quyết định thiết kế

| Vấn đề                     | Quyết định                                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chỗ lưu                    | Redis key `login-unlock-token:<email>`, value = bcrypt hash, `SETEX` TTL 900s (15 phút — giữ nguyên hạn hiện tại)                                                                                                                         |
| Consume một lần            | `GET` → bcrypt compare → `DEL` và **kiểm tra return value**. Chỉ coi là hợp lệ khi `DEL` trả `1` (chính request này xoá được key)                                                                                                        |
| Vì sao không `GETDEL`      | `GETDEL` xoá key ngay cả khi mã nhập sai ⇒ một người lạ biết email có thể đốt mã hợp lệ của nạn nhân chỉ bằng 1 lần đoán sai. `GET` + `DEL`-sau-khi-đúng giữ nguyên hành vi "đoán sai không mất mã" mà vẫn atomic ở bước consume          |
| Phân biệt hết-hạn vs sai   | **Gộp làm một** (`UNLOCK_INVALID_TEMP_PASSWORD`). Redis TTL không cho phân biệt "hết hạn" với "không tồn tại", và gộp lại thì bớt oracle. Theo tiền lệ `ResetTokenValidGuard`. Message `invalidTempPassword` sẵn có đã là "Invalid **or expired**…" nên copy không cần sửa |
| `mustChangePassword`       | **Ở lại Mongo** — đây là state lâu dài thật. Nhưng chỉ set ở bước **verify**, không set ở bước request nữa (xem §5)                                                                                                                       |
| 3 field cũ                 | Xoá khỏi schema + type + factory, và `$unset` khỏi toàn bộ doc `auths` bằng script migration một lần                                                                                                                                      |

## 3. Thay đổi backend

### 3.1 Constants — `src/modules/unlock-account/constants/index.ts` (mới)

Gom hằng đang rải rác inline ở service + repository:

```ts
export const UNLOCK_ACCOUNT_CONFIG = {
  TEMP_PASSWORD_EXPIRY_MINUTES: 15,
  COOLDOWN_SECONDS: 60,
  RATE_LIMIT_WINDOW_SECONDS: 3600,
  MAX_REQUESTS_PER_HOUR: 3
} as const;
```

### 3.2 Repository — `unlock-account.repository.ts`

Thêm 2 method vào `UnlockAccountRepository` / `RedisUnlockAccountRepository`:

```ts
storeTempPassword(email: string, tempPassword: string): Promise<void>;
// SETEX login-unlock-token:<email> 900 <bcryptHash>

consumeTempPassword(email: string, tempPassword: string): Promise<boolean>;
// GET → không có key ⇒ false
// bcrypt compare sai ⇒ false (KHÔNG xoá key)
// đúng ⇒ DEL, trả (deleted === 1)
```

`unlockTokenKey()` từ dead code thành được dùng thật. Hằng inline trong file chuyển sang import từ `./constants`.

### 3.3 Guard — `guards/temp-password-valid.guard.ts`

Rút từ 4 nhánh check trên Mongo doc xuống 1 nhánh, nhận repo qua constructor (đúng pattern `ResetTokenValidGuard`):

```ts
constructor(private readonly unlockAccountRepo: UnlockAccountRepository) {}

async assert(email: string, tempPassword: string): Promise<void> {
  const ok = await this.unlockAccountRepo.consumeTempPassword(email, tempPassword);
  if (ok) return;
  Logger.warn("Unlock verify failed - invalid or expired temp password", { email });
  throw new UnauthorizedError({
    i18nMessage: (t) => t("unlockAccount:errors.invalidTempPassword"),
    code: ERROR_CODES.UNLOCK_INVALID_TEMP_PASSWORD
  });
}
```

Bỏ tham số `auth: AuthenticationDocument`. Guard giờ **vừa verify vừa consume** — tên `assert` giữ nguyên, nhưng doc comment nói rõ nó có side effect xoá key.

### 3.4 Service — `unlock-account.service.ts`

`unlockRequest`: thay 3 dòng hash/expiry/`authService.storeTempPassword` bằng 1 dòng `unlockAccountRepo.storeTempPassword(email, tempPassword)`. Bỏ import `hashValue`, bỏ 3 hằng `TEMP_PASSWORD_*` inline.

`unlockVerify`: `tempPasswordValidGuard.assert(email, tempPassword)` (bỏ arg `auth`), và `authService.markTempPasswordUsed(...)` → `authService.requirePasswordChange(auth._id.toString())`.

### 3.5 Authentication module

| Chỗ                            | Thay đổi                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `authentication.repository.ts` | Xoá `storeTempPassword` + `markTempPasswordUsed`. Thêm `requirePasswordChange(authId)` → `findByIdAndUpdate(authId, { mustChangePassword: true })` |
| `authentication.service.ts`    | Mirror: xoá 2 method, thêm `requirePasswordChange`                                                                     |
| `types/index.ts`               | `AuthenticationDocument` bỏ `tempPasswordHash`, `tempPasswordExpAt`, `tempPasswordUsed`                                |

### 3.6 Model — `src/models/authentication.ts`

Xoá 3 field khỏi `AuthenticationSchema`. Không thêm index.

### 3.7 Error code + i18n

- `src/constants/error-code.ts`: xoá `UNLOCK_TEMP_PASSWORD_EXPIRED` (không còn chỗ nào throw — theo mục **Housekeeping** của `.claude/rules/constants.md`).
- `i18n/locales/{en,vi}/unlockAccount.json`: xoá key `errors.tempPasswordExpired`.
- Zero FE impact: `client/` không tham chiếu code nào trong nhóm `UNLOCK_*`.

### 3.8 Migration — `src/database/migrations/drop-temp-password-fields.ts` (mới)

Project **không có migration framework** (`pnpm seed` là schema tooling duy nhất). Dùng một script chạy tay, cùng pattern với `seeders/index.ts`:

```
instanceMongoDB.connect()
  → auths.updateMany(
      { $or: [ {tempPasswordHash: {$exists: true}}, {tempPasswordExpAt: {$exists: true}}, {tempPasswordUsed: {$exists: true}} ] },
      { $unset: { tempPasswordHash: "", tempPasswordExpAt: "", tempPasswordUsed: "" } }
    )
  → log matched/modified
  → disconnect
```

Idempotent (chạy lại lần 2 ⇒ `modified: 0`). Script dùng `AuthenticationModel.collection` (native driver) để `$unset` được field đã bị gỡ khỏi schema — Mongoose strict mode sẽ nuốt mất `$unset` của field lạ nếu đi qua model.

`package.json`: `"migrate:drop-temp-password": "ts-node --files -r tsconfig-paths/register src/database/migrations/drop-temp-password-fields.ts"`.

> **Phát hiện ngoài lề — `pnpm seed` / `pnpm seed:clear` đang hỏng.** Không có cờ `--files`, ts-node chỉ nạp đúng dependency graph của entry file nên bỏ qua ambient declaration ở `src/types/global.d.ts`; mọi entry point đi qua `@/libs/logger` đều chết ở `src/utils/request-context.ts` với `TS2304: Cannot find name 'RequestUserPayload'`. Dev server thoát được vì nodemon chạy `--transpile-only`. Đã xác minh bằng probe nhập đúng graph của `seeders/index.ts`. Thêm `--files` cho cả hai script seed trong cùng branch này (một commit riêng, bỏ được nếu không muốn).

## 4. Test

Module `unlock-account` hiện **không có spec nào**. Thêm 2 file cho phần logic mới, vì đây là bề mặt bảo mật:

- `unlock-account.repository.spec.ts` — `storeTempPassword` gọi `setEx` đúng key/TTL; `consumeTempPassword`: key không có → `false` + không `del`; sai → `false` + **không** `del`; đúng → `del` + `true`; đúng nhưng `del` trả `0` (request song song đã consume) → `false`.
- `guards/temp-password-valid.guard.spec.ts` — repo trả `true` → không throw; `false` → `UnauthorizedError` code `UNLOCK_INVALID_TEMP_PASSWORD`.

Mock Redis client theo pattern `test/mocks/*.mock.ts`.

## 5. Thay đổi hành vi (có chủ đích)

| #   | Trước                                                     | Sau                                             | Lý do                                                                                                                                                                              |
| --- | --------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `request` set `mustChangePassword = true` ngay             | Chỉ set ở `verify`                              | Trước đây một người lạ chỉ cần biết email của tài khoản đang bị khoá là ép được nạn nhân đổi mật khẩu ở lần đăng nhập kế tiếp (dù không bao giờ verify). Griefing không cần xác thực — bỏ |
| 2   | Mã hết hạn → `UNLOCK_TEMP_PASSWORD_EXPIRED` + message riêng | Gộp vào `UNLOCK_INVALID_TEMP_PASSWORD`          | Redis TTL không phân biệt được; bớt oracle; theo tiền lệ forgot-password. Không có FE nào đọc code này                                                                              |
| 3   | Mã dùng rồi vẫn còn hash trong DB                          | Key bị xoá khỏi Redis khi consume               | One-time-use thật, atomic                                                                                                                                                           |
| 4   | Verify thành công 2 lần nếu race                           | Chỉ 1 lần thắng (`DEL` trả `1`)                 | Đóng race condition                                                                                                                                                                 |

Không đổi: endpoint, request/response body, TTL 15 phút, cooldown 60s, rate limit 3/giờ, nội dung email, điều kiện `isActive` + `isEmailLocked`.

## 6. Artifact

- `server/src/modules/unlock-account/**` — constants (mới), repository, guard, service, + 2 spec (mới)
- `server/src/modules/authentication/{authentication.repository.ts, authentication.service.ts, types/index.ts}`
- `server/src/models/authentication.ts`
- `server/src/constants/error-code.ts`, `server/src/i18n/locales/{en,vi}/unlockAccount.json`
- `server/src/database/migrations/drop-temp-password-fields.ts` (mới), `server/package.json`
- `server/test/factories/user-with-auth.factory.ts`
- `docs/specs/unlock-token-to-redis/{design.md, plan.md}`, `docs/project-goals.md` (changelog)
