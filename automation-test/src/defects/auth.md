# AUTH — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-AUTH-01

- **TC:** TC-AUTH-056 · **Requirement:** REQ-AUTH-14
- **Mức:** Cao · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-002
- **Bước tái hiện:** chạy test của TC-AUTH-056 — `tests/api/auth/session.api.ts:72`
- **Mong đợi:** refresh token bị thu hồi khi logout
- **Thực tế:** `POST /auth/logout` để refresh token vẫn còn hiệu lực — replay cookie cũ tới `/auth/token/refresh` trả 200 kèm access token mới
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `POST /auth/logout` đưa refresh token của request vào denylist Redis (`revoked-refresh-token:<sha256>`, TTL = phần đời còn lại); `/auth/token/refresh` kiểm denylist (`RefreshTokenNotRevokedGuard`) → 403 `REFRESH_TOKEN_INVALID`.

### BUG-AUTH-02

- **TC:** TC-AUTH-023 · **Requirement:** REQ-AUTH-13, REQ-AUTH-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-006
- **Bước tái hiện:** chạy test của TC-AUTH-023 — `tests/e2e/auth/sign-up.e2e.ts:215`
- **Mong đợi:** refresh cookie được đặt giống như khi đăng nhập
- **Thực tế:** `POST /auth/signup/complete` trả token trong body nhưng không đặt refresh cookie — user mới bị đăng xuất khi reload
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `SignupController.completeSignup` đặt cookie `refreshToken` với `REFRESH_TOKEN_COOKIE_OPTIONS` như login và bỏ `refreshToken` khỏi `data.tokens`.

### BUG-AUTH-05

- **TC:** TC-AUTH-063 · **Requirement:** REQ-AUTH-16, REQ-AUTH-06
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code; xác nhận chạy thật 2026-10-14)
- **Bước tái hiện:** chạy test của TC-AUTH-063 — `tests/api/auth/login-otp.api.ts`
- **Mong đợi:** lần gửi mã thứ 4 trong vòng đời mã trả cùng một câu trả lời cho tài khoản thật và địa chỉ không tồn tại
- **Thực tế:** `sendCode` chỉ kiểm `hasExceededResendLimit` cho địa chỉ đủ điều kiện, nên tài khoản thật nhận 400
  `LOGIN_OTP_RESEND_LIMIT` còn địa chỉ không tồn tại nhận 200 — dò được tài khoản sau 4 lần gửi
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `sendCode` kiểm `hasExceededResendLimit` trước nhánh eligibility — địa chỉ không tồn tại cũng bị đếm (`setRateLimits`) nên lần gửi thứ 4 trả 400 `LOGIN_OTP_RESEND_LIMIT` cho cả hai.

### BUG-AUTH-06

- **TC:** TC-AUTH-064 · **Requirement:** REQ-AUTH-09
- **Mức:** Cao · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-AUTH-064 — `tests/api/auth/lockout-unlock.api.ts`
- **Mong đợi:** khi tài khoản bị khoá, verify mã đăng nhập và magic link cũng trả 429 `LOGIN_ACCOUNT_LOCKED`
- **Thực tế:** `PasswordLockoutGuard` chỉ chạy trong strategy mật khẩu; strategy OTP và magic link không kiểm khoá nên
  vẫn cấp token và cookie refresh
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — strategy OTP và magic link chạy `PasswordLockoutGuard` ở đầu bước verify → 429 `LOGIN_ACCOUNT_LOCKED`, không cấp token/cookie.

### BUG-AUTH-07

- **TC:** TC-AUTH-066 · **Requirement:** REQ-AUTH-13
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-AUTH-066 — `tests/api/auth/session.api.ts`
- **Mong đợi:** body của refresh chỉ có `accessToken`, `idToken`, `expiresIn` như đăng nhập; refresh token chỉ ở cookie
  HttpOnly
- **Thực tế:** `toRefreshTokenDto` (`server/src/modules/token/dtos`) đưa cả `refreshToken` vào body
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `toRefreshTokenDto` chỉ trả `accessToken`, `idToken`, `expiresIn`; client (`requests/login.ts`, `TokenRefresher`, `SessionGate`) vốn không đọc `refreshToken`.

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
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — mọi limiter `*ByEmail` dùng `emailRateLimitKey` (`rate-limiter.middleware.ts`): `email` không phải chuỗi rơi vào bucket `unknown` thay vì ném `TypeError`, rồi `bodyPipe` trả 400 `VALIDATION_ERROR`.

### BUG-AUTH-03

- **TC:** TC-AUTH-048 · **Requirement:** REQ-AUTH-10
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-007
- **Bước tái hiện:** chạy test của TC-AUTH-048 — `tests/e2e/auth/lockout.e2e.ts:56`
- **Mong đợi:** user bị khoá có thể yêu cầu và nhập mã mở khoá
- **Thực tế:** không có màn hình tự mở khoá: `/auth/unlock/{request,verify}` hoạt động nhưng không route hay link nào phía client dẫn tới
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — màn hình `/login/unlock?email=…` (gửi mật khẩu tạm → nhập → đăng nhập, rồi gate buộc đổi mật khẩu) và link "Unlock your account" ở bước mật khẩu khi gặp 429 `LOGIN_ACCOUNT_LOCKED`

### BUG-AUTH-04

- **TC:** TC-AUTH-022 · **Requirement:** REQ-AUTH-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-017
- **Bước tái hiện:** chạy test của TC-AUTH-023 — `tests/e2e/auth/sign-up.e2e.ts:196`
- **Mong đợi:** user phải chấp nhận điều khoản
- **Thực tế:** bước info của đăng ký không có checkbox điều khoản; form luôn gửi `acceptTerms: true`
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — bước info có checkbox điều khoản bắt buộc (zod), `acceptTerms` gửi đúng giá trị user chọn

### BUG-AUTH-08

- **TC:** TC-AUTH-073 · **Requirement:** REQ-AUTH-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-AUTH-073 — `tests/e2e/auth/sign-up.e2e.ts`
- **Mong đợi:** địa chỉ chưa đăng ký luôn đi tiếp vào `/signup/otp`; mã đã gửi trước đó vẫn còn hạn
- **Thực tế:** `useLoginEmail` gọi lại `send-otp`, nhận 400 `SIGNUP_OTP_COOLDOWN` và không điều hướng — user phải chờ
  60 s mới vào lại được bước mã
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `useLoginEmail` bỏ qua 400 `SIGNUP_OTP_COOLDOWN` khi gửi lại mã (mã cũ còn hạn) và vẫn đi tiếp `/signup/otp`
