# PASSWORD — quyết định

## Nguồn

Đọc ngày 2026-10-10, đọc lại và bổ sung ngày 2026-10-14 (`/write-tests password`, chạy tự động, user vắng mặt).

- Tài liệu: `README.md` → `## Features` ("Password recovery and change", "Reset a user's password"),
  `docs/project-goals.md` (G2, bảng route public), `docs/specs/change-password/design.md`,
  `docs/specs/admin-reset-password/design.md`. Không có spec riêng cho forgot-password.
- Client: `client/src/views/ForgotPasswords/**`, `client/src/views/Profile/mains/ChangePasswordCard`,
  `client/src/views/ForceChangePassword/**`, `client/src/layouts/AuthGuardLayout/ghosts/MustChangePasswordGate`,
  `client/src/layouts/GuestGuardLayout`, `client/src/components/SupportDialog`, rule zod trong
  `client/src/forms/{ChangePassword,ForgotPasswordReset}` và `client/src/schemas` (`passwordSchema`),
  `client/src/libs/query-client.ts` (toast 5xx viết cứng), copy trong
  `client/src/locales/{en,vi}/{account,forgotPassword,forgotPasswordReset,forceChangePassword,common,support}.json`.
- Server: `server/src/modules/forgot-password/**` (guards, strategies, repositories), `server/src/modules/change-password/**`,
  `adminResetPassword` trong `server/src/modules/user/services`, rule Joi trong
  `server/src/validators/schemas/{forgot-password,change-password,base}.ts`, giới hạn trong
  `server/src/constants/redis/{rate-limit,store}/index.ts` và `server/src/middlewares/common/rate-limiter.middleware.ts`,
  `server/src/i18n/config.ts` + `server/src/i18n/locales/{en,vi}/{forgotPassword,changePassword}.json`.
- Chuyển từ `docs/specs/change-password/e2e.md` (mọi hàng kịch bản, TC-PASSWORD-001 … -025) và nửa buộc-đổi-mật-khẩu
  của `docs/specs/admin-reset-password/e2e.md` (S2, TC-PASSWORD-030 … -045).

## Quyết định chốt

- **Q1** Chính sách mật khẩu là gì (cả hai phía)? → 8–128 ký tự, ít nhất một chữ thường, một chữ hoa, một chữ số và
  một ký tự trong `@$!%*?&`, không gì khác. Các lớp phân vùng tương đương: hợp lệ / rỗng / thiếu chữ hoa / thiếu chữ
  thường / thiếu số / thiếu ký tự đặc biệt. Giá trị biên (BVA): 7 · 8 · 128 · 129. → REQ-PASSWORD-01…04
- **Q2** Mật khẩu tạm của admin reset kiểm thế nào? → đọc từ email `ADMIN_RESET_PASSWORD` trong queue
  (`utils/email.ts → readQueuedEmail`, gọi qua `utils/password.ts → adminResetAndReadTempPassword`) — đúng kênh thật
  mang nó — điều này mở khoá vòng kiểm tra trọn vẹn mà spec cũ đánh dấu là không test được. → REQ-PASSWORD-04
- **Q3** Các hàng ma trận cũ không có case riêng? → hàng change-password 3 (AuthZ — tự phục vụ, `authId` lấy từ JWT), 6
  (lịch sử mật khẩu), 7 (filter/search) và 8 (format) là N/A ở spec cũ và vẫn N/A. Các mục chỉ thuộc Gate-B (text
  tooltip Radix, spinner, `announce.saving` thoáng qua) là thị giác, không thành case riêng; cơ chế ép buộc của chúng
  (trạng thái disable, disable khi đang gửi) là TC-PASSWORD-010 / -015. → REQ-PASSWORD-03
- **Q4** Các `test.fixme` cũ đi đâu? → `test.fixme` cũ cho AuthZ của buộc-đổi nay là TC-PASSWORD-041; cái cho việc thu
  hồi token trước reset là TC-PASSWORD-043. → REQ-PASSWORD-04, REQ-PASSWORD-05
- **Q5** (tự quyết 2026-10-14, cần user duyệt): Cooldown 60 s, giới hạn 3 lần gửi và 5 request / địa chỉ / 15 phút của
  forgot-password chỉ thấy trong code (docs không nói) — là hành vi mong muốn hay tình cờ? → coi là requirement: chúng
  cùng họ với giới hạn đã được docs chốt cho login / sign-up (README "Too many wrong passwords…", REQ-AUTH-12) và là
  hàng rào chống dò / spam email; viết thành REQ mới thay vì gắn thêm vào REQ-01/02. → REQ-PASSWORD-06 (TC-PASSWORD-082
  … -084)
- **Q6** (tự quyết 2026-10-14, cần user duyệt): Trang khôi phục khi đã đăng nhập (GuestGuardLayout bọc cả nhóm route
  public) — requirement hay chi tiết cài đặt? → requirement: `docs/project-goals.md` xếp `/forgot-password` vào trang
  public của Guest, và TC-AUTH-058 đã chốt cùng hành vi cho `/login`, `/signup` nhưng không gồm `/forgot-password`. →
  REQ-PASSWORD-07 (TC-PASSWORD-087)
- **Q7** (tự quyết 2026-10-14, cần user duyệt): Lựa chọn "Contact administrator" trên trang khôi phục — thuộc module
  `support` hay `password`? → `password` chỉ kiểm lối vào (dialog mở, email điền sẵn, sửa được); gửi form là việc của
  `support` (TC-SUPPORT-030 đi từ `/login/alternative`), không lặp lại ở đây. → REQ-PASSWORD-08 (TC-PASSWORD-088)
- **Q8** (tự quyết 2026-10-14, cần user duyệt): `otp/verify` cho email không có tài khoản trả 401
  `FORGOT_PASSWORD_AUTH_NOT_FOUND`, khác với 401 `FORGOT_PASSWORD_OTP_INVALID` của tài khoản thật — đó là một kênh dò
  tài khoản, trong khi `otp/send` cố ý giấu điều đó (TC-PASSWORD-070). Có ghi thành bug không? → không: docs không nói
  gì về `verify`, test đã gom (TC-PASSWORD-072) chốt đúng mã này, và người dò phải đoán được mã 6 số trước khi cửa sổ
  khoá sau 5 lần. Giữ kỳ vọng của TC-PASSWORD-072; nếu user muốn verify cũng giấu tài khoản thì đổi kỳ vọng thành
  cùng mã lỗi và mở bug. → REQ-PASSWORD-01
- **Q9** (tự quyết 2026-10-14, cần user duyệt): Email khôi phục có được trim và không phân biệt hoa thường? → có —
  `emailSchema` (Joi `trim().lowercase()`) áp cho mọi endpoint forgot-password, và TC-AUTH-004 đã chốt cùng điều đó cho
  đăng nhập. → REQ-PASSWORD-01 (TC-PASSWORD-086)
- **Q10** (tự quyết 2026-10-14, cần user duyệt): Kiểu dữ liệu sai (số, mảng, body rỗng) gửi tới change-password phải ra
  gì? → 400 `VALIDATION_ERROR`, không bao giờ 5xx (lăng kính 6; Joi `string()` không ép số sang chuỗi). →
  REQ-PASSWORD-03 (TC-PASSWORD-090)
- **Q11** (tự quyết 2026-10-14, cần user duyệt): Page object cho card đổi mật khẩu đặt ở đâu khi `/profile` thuộc module
  `profile`? → `pages/settings/profile-password.page.ts` (`ProfilePasswordPage`) chỉ mô tả card đổi mật khẩu; phần còn
  lại của `/profile` để page object của module profile. Màn buộc đổi là `pages/force-password/force-change-password.page.ts`
  (theo nhóm route `(force-password)`). Không đổi hành vi test nào.
- **Q12** (tự quyết 2026-10-14, cần user duyệt): Text "Server error. Please try again later." không nằm trong catalogue
  nào (viết cứng trong `client/src/libs/query-client.ts`) — assert thế nào khi spec không được viết chuỗi? → thêm
  `clientLiteral.serverErrorToast` vào `data/copy.ts`, kèm đường dẫn nguồn. → REQ-PASSWORD-03, REQ-PASSWORD-04

## Tài khoản test

- Mọi case đổi, reset hoặc khôi phục mật khẩu đều dùng một tài khoản dùng một lần từ `createAccount()`.
- `user@test.com` đã seed chỉ được dùng ở chỗ mọi phản hồi của server là mock `page.route`, hoặc validation phía client
  chặn request. TC-PASSWORD-087 dùng phiên `user` chỉ để mở trang (không gửi gì).
- `admin@test.com` chỉ dùng để gọi `PATCH /admin/users/:id/lock` và `POST /admin/users/:id/reset-password` lên tài
  khoản dùng một lần.
- OTP và token magic link được cài (`plantCode`) sau lời gọi gửi thật; việc chờ hết cooldown 60 s được giả lập bằng
  cách xoá key cooldown sau khi server đã đếm lần gửi (`utils/password.ts → skipRecoveryCooldown`).
- Mật khẩu tạm của admin reset đọc từ email `ADMIN_RESET_PASSWORD` trong queue (xem Q2).
- Case rate limit (TC-PASSWORD-025, -084) dùng `keepRateLimits` và xoá `rate-limit:*` khi xong.

## Dữ kiện server

- **forgot-password:** mã 6 chữ số, sống 300 s; link 128 hex, sống 900 s; reset token 128 hex, sống 600 s. Cooldown gửi
  60 s; lần gửi thứ 4 trong cửa sổ → 400 `…_RESEND_LIMIT`; 5 mã sai → 400 `FORGOT_PASSWORD_OTP_LOCKED` (15 phút).
  Rate limit: `otp/*` và `magic-link/*` 10 / IP và 5 / email mỗi 15 phút, `reset` 10 / IP — 429 `TOO_MANY_REQUESTS`.
- **change-password:** `authGuard` → limiter 5 / 15 phút theo IP + authId (đếm mọi lần thử, trước validation) → Joi.
- Message của change-password là key thô vì namespace `changePassword` không được nạp (BUG-PASSWORD-04).

## Ngoài phạm vi

- Hàng change-password 3 (AuthZ — tự phục vụ, `authId` từ JWT), 6 (lịch sử mật khẩu), 7 (filter/search), 8 (format) — N/A.
- Mục chỉ thuộc Gate-B: text tooltip Radix, spinner, `announce.saving` thoáng qua — thuần thị giác.
- Hết hạn reset token (10 phút) và mã (5 phút): cần chờ thật hoặc sửa TTL trong Redis — không tự động.
- Lựa chọn 2FA để khôi phục: chưa build (card hiện "Unavailable"); chỉ kiểm nó không thao tác được (TC-PASSWORD-051 / -062).
- Rate limit theo IP của forgot-password (10 / 15 phút) và của admin reset: cùng cơ chế với giới hạn theo email
  (TC-PASSWORD-084) và giới hạn admin của module `admin-users`; không lặp.
- Thông báo (notification) khi đổi / reset mật khẩu: module `notifications` (TC-NOTIFICATIONS-053 / -054).

## Tech debt liên quan

_(không có)_
