# AUTH — quyết định

## Nguồn

Đọc ngày 2026-10-10:

- `client/src/views/{Logins,Signups}/**`
- `client/src/layouts/{SessionGate,AuthGuardLayout,GuestGuardLayout}`
- `client/src/stores/slices/auth.ts`
- `client/src/libs/{axios,query-client}.ts`
- `client/src/locales/{en,vi}/{login,signup,common}.json`
- `server/src/modules/{login,signup,logout,token,unlock-account,session}`
- `server/src/validators/{constants.ts,schemas/{base,login,signup,unlock-account}.ts}`
- `server/src/constants/redis/{store,rate-limit}/index.ts`
- `server/src/i18n/locales/{en,vi}/*.json`

Đọc lại ngày 2026-10-14 (lượt "bổ sung full", `/write-tests auth` tự chạy, user vắng mặt):

- `README.md` → `## Features`, `docs/project-goals.md` (G2, G6, §6.1), `docs/unfinished-features.md`
- `client/src/views/Logins/**` (thêm `LoginOtp`, `LoginMagicLink` — nút gửi lại; `Login/mains/SocialAuthenButtons`),
  `client/src/components/ResendButton`, `client/src/forms/Login/*`, `client/src/libs/query-client.ts`
- `server/src/modules/login/{constants,guards,strategies/**,repositories/impl/redis-otp-login.repository.ts}`,
  `server/src/modules/signup/services/resend-otp.ts`, `server/src/modules/token/{services,guards,dtos}`,
  `server/src/modules/logout/**`, `server/src/constants/redis/rate-limit/index.ts`,
  `server/src/middlewares/common/rate-limiter.middleware.ts`

## Quyết định chốt

- **Q1** Chia layer: `tests/e2e/auth/*.e2e.ts` chứng minh những gì user thấy trên `/login`,
  `/login/{password,otp,magic-link,verify-magic-link,alternative}` và `/signup/{otp,info}`. `tests/api/auth/*.api.ts`
  chứng minh hợp đồng: status code, error code và copy, biên validation, chuyển trạng thái, rate limit, cookie và
  token.
- **Q2** Server mặc định locale **tiếng Việt**, nên case API gửi `Accept-Language: en` trừ khi đang test vi.
- **Q3** (tự quyết 2026-10-14, cần user duyệt): Tài khoản bị khoá vì sai mật khẩu có còn đăng nhập được bằng mã một lần
  hoặc magic link không? → **Không.** README nói "locks the account", và luồng tự mở khoá chỉ có nghĩa khi khoá chặn
  mọi cách vào; code hiện chỉ chặn bước mật khẩu (`PasswordLockoutGuard` không có trong strategy OTP / magic link) nên
  test kỳ vọng 429 `LOGIN_ACCOUNT_LOCKED` cho cả hai và lộ bug (BUG-AUTH-06) → REQ-AUTH-09.
- **Q4** (tự quyết 2026-10-14, cần user duyệt): Giới hạn 3 lần gửi mã đăng nhập (`LOGIN_OTP_CONFIG.MAX_RESEND_ATTEMPTS`)
  là hành vi chỉ thấy trong code — mong muốn hay bug? → **Mong muốn**, ghi thành REQ-AUTH-16. Nhưng nó chỉ áp cho địa
  chỉ đủ điều kiện, nên lần gửi thứ 4 trả 400 cho tài khoản thật và 200 cho địa chỉ không tồn tại — lộ tài khoản, trái
  với "send hides whether the address exists" (TC-AUTH-034). Kỳ vọng: hai địa chỉ nhận cùng một câu trả lời
  (BUG-AUTH-05) → REQ-AUTH-16, REQ-AUTH-06.
- **Q5** (tự quyết 2026-10-14, cần user duyệt): `/auth/token/refresh` có được trả refresh token trong body không? →
  **Không.** Cùng hợp đồng với đăng nhập (TC-AUTH-026: refresh token chỉ nằm trong cookie HttpOnly); body đọc được bằng
  script thì cookie HttpOnly mất tác dụng. Code trả `refreshToken` trong body (`token/dtos`) → BUG-AUTH-07 → REQ-AUTH-13.
- **Q6** (tự quyết 2026-10-14, cần user duyệt): Nhập lại một địa chỉ chưa đăng ký trong 60 s cooldown (vd bấm "Change
  email" rồi gõ lại đúng địa chỉ đó) thì sao? → **Vẫn đi tiếp vào `/signup/otp`** — README: "unknown ones are sent a
  sign-up code automatically and continue into registration", và mã đã gửi vẫn còn hạn 5 phút. Code gọi `send-otp`, nhận
  400 `SIGNUP_OTP_COOLDOWN` và đứng lại ở `/login` với toast → BUG-AUTH-08 → REQ-AUTH-02.
- **Q7** (tự quyết 2026-10-14, cần user duyệt): Session đang mở của một tài khoản vừa bị vô hiệu hoá có phải dừng không?
  → **Có**, ở lần refresh kế tiếp (403 `REFRESH_TOKEN_INVALID`); code đang làm đúng vậy (`AuthActiveGuard`), ghi thành
  REQ-AUTH-17. Access token đã cấp vẫn sống tới khi hết hạn (xem Ngoài phạm vi).
- **Q8** (tự quyết 2026-10-14, cần user duyệt): Nút gửi lại trên màn hình mã đăng nhập và magic link (chỉ thấy trong code,
  README chỉ nói "with a resend option" cho đăng ký) — mong muốn hay thừa? → **Mong muốn**, cùng hành vi với bước mã đăng
  ký (cooldown 60 s rồi gửi lại) → REQ-AUTH-16.
- **Q9** (tự quyết 2026-10-14, cần user duyệt): Bước mật khẩu kiểm policy độ mạnh ngay ở client (`passwordStepValidation`
  dùng chung `passwordSchema`) nên mật khẩu ngắn hơn 8 ký tự không bao giờ được gửi đi. Giữ như hành vi mong muốn (mọi
  mật khẩu hợp lệ đều đạt policy) → REQ-AUTH-05.
- **Q10** (tự quyết 2026-10-14, cần user duyệt): Body sai kiểu (số thay cho chuỗi, object thay cho mật khẩu) ở các endpoint
  đăng nhập / đăng ký → 400 `VALIDATION_ERROR`, không bao giờ 5xx (lăng kính 6) → REQ-AUTH-05, REQ-AUTH-03.

## Tài khoản test

- Mọi case làm sai mật khẩu, khoá, mở khoá, đăng ký hoặc logout đều dùng tài khoản dùng một lần từ `createAccount()`
  (hoặc chỉ một _địa chỉ_ dùng một lần khi không cần tài khoản).
- Tài khoản inactive / chưa xác minh là tài khoản dùng một lần được đặt thẳng cờ `isActive` / `verifiedEmail`
  (`utils/auth.ts → setAuthFlags`) — không dùng các tài khoản seed `inactive@` / `unverified@` vì spec khác có thể
  thay đổi chúng.
- `user@test.com` (seed) chỉ bao giờ được gửi đúng mật khẩu của nó.
- Mã một lần, token magic link và mật khẩu mở khoá được plant đè lên hash do server cấp (`plantCode`); việc chờ hết
  cooldown được giả lập bằng cách xoá key cooldown.
- Case rate limit dùng `keepRateLimits`, xoá trước các bộ đếm chúng đọc, và xoá mọi key `rate-limit:*` sau khi chạy.

## Dữ kiện server

- **Email:** được trim, chuyển chữ thường, Joi email, 3–254 ký tự, không có ký tự điều khiển / zero-width.
- **Policy mật khẩu:** 8–128 ký tự, ≥ 1 chữ thường, chữ hoa, chữ số và một ký tự trong `@$!%*?&`, không có ký tự nào
  khác.
- **OTP:** đúng 6 chữ số; mã đăng ký và mã đăng nhập sống 5 phút với cooldown 60 s; 5 mã sai thì khoá (đăng ký: tới
  hết cửa sổ 15 phút; đăng nhập: 15 phút); đăng ký cho 5 lần gửi lại / giờ.
- **Magic link:** 128 ký tự hex chữ thường, 15 phút, cooldown 60 s, dùng một lần.
- **Khoá vì mật khẩu:** lần sai thứ 10 khoá 1800 s; một lần thành công reset bộ đếm.
- **Mở khoá:** chỉ cho tài khoản active **và** đang bị khoá; cooldown 60 s, 3 request / giờ; mật khẩu tạm gửi qua email
  ≥ 12 ký tự, 15 phút, dùng một lần, và đặt `mustChangePassword`.
- **Rate limit** (cửa sổ 15 phút): login 30 / IP; mã đăng nhập và magic link 10 / IP và 5 / email; mã đăng ký 5 / IP và
  3 / email.

## Ngoài phạm vi

- **Đăng nhập Google / Facebook**: hai nút trên `/login` bị disable với nhãn "coming soon"; README không có tính năng
  này → không test.
- **Access token sau logout**: JWT stateless, sống tới khi hết hạn; `docs/unfinished-features.md` ghi rõ hiện dựa vào
  TTL của access token (chưa có `/oauth/revoke`, back-channel logout). Chỉ refresh token / cookie được kiểm sau logout.
- **Link "Don't have an account? Sign up"** (`Login/components/SignUpLink`): component có trong code nhưng không trang nào
  render, `/signup` chỉ redirect về `/login` (TC-AUTH-005).
- **Link "Forgot Password?"** trên bước mật khẩu và **"Contact administrator"** trên màn hình cách khác: đã phủ ở module
  `password` (TC-PASSWORD-061, TC-PASSWORD-088) và `support` (TC-SUPPORT-030, 035).
- **Thông báo khi bị khoá / đăng nhập lạ**, **dòng login history** của mỗi lần đăng nhập: thuộc module `notifications`
  và `login-history`.

## Tech debt liên quan

_(không có)_
