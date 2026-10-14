# AUTH — Bug log

## Đang mở

| Bug                         | Mức        | TC          | Tóm tắt                                                                                                                         |
| --------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [BUG-AUTH-01](#bug-auth-01) | Cao        | TC-AUTH-056 | `POST /auth/logout` để refresh token vẫn còn hiệu lực — replay cookie cũ tới `/auth/token/refresh` trả 200 kèm access token mới |
| [BUG-AUTH-02](#bug-auth-02) | Trung bình | TC-AUTH-023 | `POST /auth/signup/complete` trả token trong body nhưng không đặt refresh cookie — user mới bị đăng xuất khi reload             |
| [BUG-AUTH-03](#bug-auth-03) | Trung bình | TC-AUTH-048 | Không có màn hình tự mở khoá: `/auth/unlock/{request,verify}` hoạt động nhưng không route hay link nào phía client dẫn tới      |
| [BUG-AUTH-04](#bug-auth-04) | Trung bình | TC-AUTH-022 | Bước info của đăng ký không có checkbox điều khoản; form luôn gửi `acceptTerms: true`                                           |
| [BUG-AUTH-05](#bug-auth-05) | Trung bình | TC-AUTH-063 | Giới hạn 3 lần gửi mã đăng nhập chỉ áp cho tài khoản thật: lần gửi thứ 4 trả 400 cho tài khoản, 200 cho địa chỉ không tồn tại   |
| [BUG-AUTH-06](#bug-auth-06) | Cao        | TC-AUTH-064 | Tài khoản bị khoá vì sai mật khẩu vẫn đăng nhập được bằng mã một lần hoặc magic link                                            |
| [BUG-AUTH-07](#bug-auth-07) | Trung bình | TC-AUTH-066 | `POST /auth/token/refresh` trả `refreshToken` trong body JSON, script trên trang đọc được                                       |
| [BUG-AUTH-08](#bug-auth-08) | Thấp       | TC-AUTH-073 | Nhập lại một địa chỉ chưa đăng ký trong 60 s cooldown làm user kẹt ở `/login` với toast cooldown thay vì đi tiếp                |
| [BUG-AUTH-09](#bug-auth-09) | Thấp       | TC-AUTH-070 | `email` không phải chuỗi (`true`, `123`, mảng) gửi tới các route gửi mã/link → 500 `INTERNAL_SERVER_ERROR` thay vì 400          |

### BUG-AUTH-01

- **TC:** TC-AUTH-056 · **Requirement:** REQ-AUTH-14
- **Mức:** Cao · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-002
- **Bước tái hiện:** chạy test của TC-AUTH-056 — `tests/api/auth/session.api.ts:72`
- **Mong đợi:** refresh token bị thu hồi khi logout
- **Thực tế:** `POST /auth/logout` để refresh token vẫn còn hiệu lực — replay cookie cũ tới `/auth/token/refresh` trả 200 kèm access token mới

### BUG-AUTH-02

- **TC:** TC-AUTH-023 · **Requirement:** REQ-AUTH-13, REQ-AUTH-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-006
- **Bước tái hiện:** chạy test của TC-AUTH-023 — `tests/e2e/auth/sign-up.e2e.ts:215`
- **Mong đợi:** refresh cookie được đặt giống như khi đăng nhập
- **Thực tế:** `POST /auth/signup/complete` trả token trong body nhưng không đặt refresh cookie — user mới bị đăng xuất khi reload

### BUG-AUTH-03

- **TC:** TC-AUTH-048 · **Requirement:** REQ-AUTH-10
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-007
- **Bước tái hiện:** chạy test của TC-AUTH-048 — `tests/e2e/auth/lockout.e2e.ts:56`
- **Mong đợi:** user bị khoá có thể yêu cầu và nhập mã mở khoá
- **Thực tế:** không có màn hình tự mở khoá: `/auth/unlock/{request,verify}` hoạt động nhưng không route hay link nào phía client dẫn tới

### BUG-AUTH-04

- **TC:** TC-AUTH-022 · **Requirement:** REQ-AUTH-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-017
- **Bước tái hiện:** chạy test của TC-AUTH-023 — `tests/e2e/auth/sign-up.e2e.ts:196`
- **Mong đợi:** user phải chấp nhận điều khoản
- **Thực tế:** bước info của đăng ký không có checkbox điều khoản; form luôn gửi `acceptTerms: true`

### BUG-AUTH-05

- **TC:** TC-AUTH-063 · **Requirement:** REQ-AUTH-16, REQ-AUTH-06
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code; xác nhận chạy thật 2026-10-14)
- **Bước tái hiện:** chạy test của TC-AUTH-063 — `tests/api/auth/login-otp.api.ts`
- **Mong đợi:** lần gửi mã thứ 4 trong vòng đời mã trả cùng một câu trả lời cho tài khoản thật và địa chỉ không tồn tại
- **Thực tế:** `sendCode` chỉ kiểm `hasExceededResendLimit` cho địa chỉ đủ điều kiện, nên tài khoản thật nhận 400
  `LOGIN_OTP_RESEND_LIMIT` còn địa chỉ không tồn tại nhận 200 — dò được tài khoản sau 4 lần gửi

### BUG-AUTH-06

- **TC:** TC-AUTH-064 · **Requirement:** REQ-AUTH-09
- **Mức:** Cao · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-AUTH-064 — `tests/api/auth/lockout-unlock.api.ts`
- **Mong đợi:** khi tài khoản bị khoá, verify mã đăng nhập và magic link cũng trả 429 `LOGIN_ACCOUNT_LOCKED`
- **Thực tế:** `PasswordLockoutGuard` chỉ chạy trong strategy mật khẩu; strategy OTP và magic link không kiểm khoá nên
  vẫn cấp token và cookie refresh

### BUG-AUTH-07

- **TC:** TC-AUTH-066 · **Requirement:** REQ-AUTH-13
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-AUTH-066 — `tests/api/auth/session.api.ts`
- **Mong đợi:** body của refresh chỉ có `accessToken`, `idToken`, `expiresIn` như đăng nhập; refresh token chỉ ở cookie
  HttpOnly
- **Thực tế:** `toRefreshTokenDto` (`server/src/modules/token/dtos`) đưa cả `refreshToken` vào body

### BUG-AUTH-08

- **TC:** TC-AUTH-073 · **Requirement:** REQ-AUTH-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-AUTH-073 — `tests/e2e/auth/sign-up.e2e.ts`
- **Mong đợi:** địa chỉ chưa đăng ký luôn đi tiếp vào `/signup/otp`; mã đã gửi trước đó vẫn còn hạn
- **Thực tế:** `useLoginEmail` gọi lại `send-otp`, nhận 400 `SIGNUP_OTP_COOLDOWN` và không điều hướng — user phải chờ
  60 s mới vào lại được bước mã

### BUG-AUTH-09

- **TC:** TC-AUTH-070 · **Requirement:** REQ-AUTH-05, REQ-AUTH-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (chạy thật)
- **Bước tái hiện:** chạy test của TC-AUTH-070 — `tests/api/auth/login-password.api.ts`; hoặc
  `POST /auth/signup/send-otp` (cũng `/auth/login/otp/send`) với body `{ "email": true }`
- **Mong đợi:** 400 `VALIDATION_ERROR`, không bao giờ 5xx
- **Thực tế:** 500 `INTERNAL_SERVER_ERROR`. Rate limiter theo email (`rate-limiter.middleware.ts`, `keyGenerator:
(req) => req.body.email?.toLowerCase() || "unknown"`) chạy **trước** `bodyPipe`, và `toLowerCase` không tồn tại trên
  boolean/number/mảng nên ném `TypeError`. Cùng `keyGenerator` dùng cho mọi limiter `*ByEmail` (đăng ký, mã đăng
  nhập, magic link, quên mật khẩu)

## Đã sửa

_(chưa có)_
