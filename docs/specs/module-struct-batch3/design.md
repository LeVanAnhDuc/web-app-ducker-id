# Design — Migrate `signup` và `oauth` sang layout mới (đợt 3)

> Tiếp nối PR #5, #6, #8. Ngày: 2026-10-04. Branch: `refactor/module-struct-batch3`.

## 1. Phạm vi

| Module | Public | Private | Dependency | Repository |
| --- | --- | --- | --- | --- |
| `signup` | 5 | 2 | 7 | 2 (Redis) |
| `oauth` | 4 | **13** | 6 | 1 (Redis) |

Còn lại sau đợt này: `forgot-password`, `login` (đợt 4) và `login-history` (cuối cùng).

## 2. Vấn đề mới: private method

Hai module trước đây gần như không có private method. `oauth` có **13**, và chúng là phần khó thật sự của đợt này: private method không lên façade, nhưng phải sống ở đâu đó mà vẫn gọi được.

Lập bản đồ gọi của `oauth` trước khi đụng vào code:

| private | được gọi bởi |
| --- | --- |
| `assertRedirectUri`, `validateAuthorizeParams` | `buildParamsFromQuery` |
| `buildParamsFromQuery`, `restorePendingRequest`, `isInteractiveSignIn`, `issueCode`, `assertEntitled` | `authorize` |
| `auditAppSignIn` | `authorize`, `assertEntitled` |
| `readBasicSecret` | `assertClientAuthentication` |
| `assertClientAuthentication`, `issueTokens` | `exchangeToken` |
| **`resolveClient`** | **`authorize`, `buildParamsFromQuery`, `exchangeToken`** |
| **`loadClaims`** | **`issueTokens` (→ `exchangeToken`), `getUserInfo`** |

Ra hai nhóm:

### 2.1 Private chỉ phục vụ một public method → module-local trong chính file đó

11/13 private của `oauth` nằm trọn trong cây gọi của đúng một public method. Chúng thành function không export trong file của method ấy: 8 cái vào `authorize.ts`, 3 cái vào `exchange-token.ts`. `signup` cũng vậy — `verifyOtpOrFail` vào `verify-otp.ts`, `createUserAccount` vào `complete-signup.ts`.

Chúng **không** thành helper: helper theo rule phải pure, mà những hàm này đọc Redis, đọc Mongo, mở transaction.

### 2.2 Private dùng chung 2+ public method → `service/shared/<name>.ts`

`resolveClient` và `loadClaims` không thuộc về method nào. Chúng cũng không pure nên không vào `helpers/`.

Quy tắc mới: **`service/shared/`, một function một file, cùng shape như method file (`deps` là param đầu), không export lên façade.**

Cân nhắc phương án thay thế là bọc thành collaborator service trong `services/` theo rule 23. Bỏ vì hai hàm này không có state riêng, đã nhận `deps` rồi — bọc class chỉ thêm một vòng DI mà không đổi được gì. Ghi lại ở đây để lần sau không phải cân lại.

## 3. Tình huống khác của đợt này

| Việc | Xử lý |
| --- | --- |
| `signup` có decorator `@LogMethod` trên cả 5 method | Decorator chỉ chạy trên method của class → **giữ nguyên trên façade**. Nó bọc toàn bộ lời gọi nên hành vi log không đổi |
| `signup.service.ts` có 7 hằng module-level dẫn xuất từ `OTP_CONFIG`/`SESSION_CONFIG` | Khi service tách nhiều file thì chỗ duy nhất giữ được một định nghĩa là `constants/index.ts` — chuyển lên đó, export ra |
| `oauth.service.ts` khai `AppSignInAudit` và `AuthorizeOutcome` ngay trong file service | Giờ nhiều file cần → chuyển sang `types/index.ts` theo rule R1 |
| `oauth.spec.ts` có 1 test thò vào private field `service.userService` | Field đó không còn (nằm trong `deps`). Cho `setup()` trả thẳng mock `userService` ra — test thôi chạm private, kiểm cùng một hành vi |

## 4. Repository đã tách

| Module | Contract | Implementation |
| --- | --- | --- |
| `signup` | `repositories/otp-signup.repository.ts` | `repositories/impl/redis-otp-signup.repository.ts` |
| `signup` | `repositories/session-signup.repository.ts` | `repositories/impl/redis-session-signup.repository.ts` |
| `oauth` | `repository/oauth.repository.ts` | `repository/impl/redis-oauth.repository.ts` |

Barrel `signup/repositories/index.ts` bị xoá; chỉ có `cooldown.guard.ts` và module factory import, trỏ thẳng vào file.

## 5. Sự cố gặp phải: main đang đỏ trước khi bắt đầu

Khi fork branch này ra thì `pnpm type-check` trên `main` **fail**. PR #7 (`feat/login-history-app-source`) thêm `oauth.service.spec.ts` import `@/modules/user/user.service` và `@/modules/web-app/repositories` — hai đường dẫn mà PR #8 đã dời đi.

Không branch nào sai, và git không có gì để báo conflict: #7 thêm file, #8 sửa file khác. Chúng chỉ bất đồng về **đường dẫn**, thứ git không đọc. #8 fork trước khi #7 vào nên `tsc` của nó chưa bao giờ thấy file mới.

Đã vá riêng ở PR #9 trước khi làm tiếp. **Bài học cho các đợt còn lại:** chạy `pnpm type-check` trên `main` ngay sau mỗi lần merge, vì `forgot-password`, `login` và nhất là `login-history` vẫn còn việc đang làm song song.

## 6. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **50 suite / 323 test pass** (tăng so với 48/309 là do PR #7 mang thêm test, không phải đợt này).
- `pnpm lint` — sạch.
