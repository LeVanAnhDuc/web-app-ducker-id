# AUTH — test case

Đăng nhập (email trước, mật khẩu, mã một lần, magic link, cách khác), đăng ký bằng mã gửi qua email, khoá và tự mở khoá, từ chối theo trạng thái tài khoản, rate limit, duy trì session, logout và guard trang guest / private (REQ-AUTH-01…17).
Bối cảnh, nguồn và dữ liệu test: ../docs/decisions/auth.md

### TC-AUTH-001 — A registered email continues to the password step

- **Requirement:** REQ-AUTH-01
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (địa chỉ đã đăng ký)
- **Tiền điều kiện:** `user@test.com` đã seed
- **Bước:**
  1. Mở `/login`, nhập `user@test.com`, bấm **Continue with email**.
- **Mong đợi:** URL là `/login/password?email=user%40test.com`; hiện heading
  "Enter your password", badge email và ô mật khẩu.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-002 — The email step validates the address before calling the API

- **Requirement:** REQ-AUTH-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (rỗng, sai định dạng)
- **Bước:**
  1. Bấm **Continue with email** khi ô còn trống.
  2. Nhập `user@` rồi bấm lại.
- **Mong đợi:** "Please enter email", rồi "Invalid email format" kèm
  `aria-invalid="true"`; trang vẫn ở `/login` và không có request
  `/auth/signup/*` nào được gửi.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-003 — Email equivalence classes and length boundaries on the sign-in endpoint

- **Requirement:** REQ-AUTH-01, REQ-AUTH-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (rỗng, không có domain, không có `@`, hai `@`, ký tự
  zero-width), giá trị biên (BVA) (254 / 255 ký tự)
- **Bước:**
  1. `POST /auth/login` với từng email không hợp lệ; rồi không có `password`.
  2. `POST /auth/login` với một địa chỉ đúng định dạng dài 254 ký tự.
- **Mong đợi:** mọi email không hợp lệ → 400 `VALIDATION_ERROR` chỉ đúng field
  `email`; thiếu mật khẩu → 400 "Password is required"; 254 ký tự
  qua được validation (401 `LOGIN_INVALID_CREDENTIALS`).
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-004 — The email is trimmed and case-insensitive

- **Requirement:** REQ-AUTH-01, REQ-AUTH-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (cùng địa chỉ, cách viết khác)
- **Bước:**
  1. `POST /auth/login` với `"  USER@TEST.COM  "` và mật khẩu đúng.
- **Mong đợi:** 200; `email` trong idToken là `user@test.com`.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-005 — Flow sub-steps without their parameters send the user back to login

- **Requirement:** REQ-AUTH-01, REQ-AUTH-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (deep link / bookmark không có query)
- **Bước:**
  1. Mở `/login/password`, `/login/otp`, `/login/magic-link`,
     `/login/alternative`, `/login/verify-magic-link?email=…` (không có token),
     `/signup`, `/signup/otp`, `/signup/info?email=…` (không có session token).
- **Mong đợi:** mỗi trang đều kết thúc ở `/login` với bước email "Welcome".
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-006 — An unknown email is sent a sign-up code and continues to verification

- **Requirement:** REQ-AUTH-02
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (địa chỉ chưa đăng ký)
- **Bước:**
  1. Trên `/login` nhập một địa chỉ chưa từng đăng ký và tiếp tục.
- **Mong đợi:** URL `/signup/otp?email=…`; hiện heading "Verify Email", email
  và hướng dẫn nhập 6 chữ số; server đang giữ một mã đăng ký cho
  địa chỉ đó và chưa có tài khoản nào.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-007 — check-email tells a registered address from a free one

- **Requirement:** REQ-AUTH-02
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (đã đăng ký, còn trống, sai định dạng)
- **Bước:**
  1. `GET /auth/signup/check-email/:email` cho `user@test.com`, một địa chỉ
     còn trống và `not-an-email`.
- **Mong đợi:** `{ available: false }`, `{ available: true }`, 400
  `VALIDATION_ERROR`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-008 — A new user signs up end to end and lands signed in on home

- **Requirement:** REQ-AUTH-03, REQ-AUTH-04
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (email → đã gửi mã → đã xác minh → có tài khoản)
- **Tiền điều kiện:** một địa chỉ chưa từng đăng ký
- **Bước:**
  1. Nhập địa chỉ trên `/login`; gõ mã (đã plant) trên
     `/signup/otp`.
  2. Trên `/signup/info` điền tên, giới tính, ngày sinh `15/06/1995`, mật khẩu
     `Signup@123` hai lần; bấm **Create Account**.
- **Mong đợi:** `/signup/info?sessionToken=<64 hex>&email=…` sau khi nhập mã;
  trang chủ `/` sau khi submit; bản ghi user tồn tại với tên đã nhập.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-009 — A wrong sign-up code shows the remaining attempts and clears the input

- **Requirement:** REQ-AUTH-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (mã sai), chuyển trạng thái (được thử lại)
- **Bước:**
  1. Gõ `111111` trên `/signup/otp`, rồi gõ mã đúng.
- **Mong đợi:** "Invalid OTP. You have 4 attempt(s) remaining", ô nhập
  được xoá, URL không đổi; sau đó mã đúng dẫn tới `/signup/info`.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-010 — Resend waits out the 60-second cooldown, then sends a new code

- **Requirement:** REQ-AUTH-03
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (cooldown → sẵn sàng → cooldown), giá trị biên (BVA) (60 s)
- **Bước:**
  1. Tới `/signup/otp`; quan sát nút gửi lại.
  2. Tua đồng hồ 61 s (và cho cooldown phía server hết hạn); bấm **Resend
     OTP**.
- **Mong đợi:** ban đầu "Resend in Ns" bị disable; sau 61 s **Resend OTP**
  bật; bấm vào hiện "OTP has been resent!" và đếm ngược lại từ
  đầu.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-011 — send-otp issues a code and verify-otp exchanges it for a session token

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (chưa có → đã gửi mã → đã xác minh)
- **Bước:**
  1. `POST /auth/signup/send-otp`; plant một mã đã biết; `POST /verify-otp`.
- **Mong đợi:** send → `{ success, expiresIn: 300, cooldownSeconds: 60 }`
  và một mã được lưu; verify → `sessionToken` dài 64 ký tự hex,
  `expiresIn: 1800`; vẫn chưa có bản ghi user.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-012 — The sign-up code must be exactly 6 digits

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (5 / 6 / 7 chữ số), phân vùng tương đương (EP) (không phải chữ số, rỗng)
- **Bước:**
  1. `POST /verify-otp` với `12345`, `1234567`, `12a456`, `""`, `000000`.
- **Mong đợi:** bốn giá trị đầu → 400 `VALIDATION_ERROR` trên `otp`
  (`string.length` / `string.pattern.base` / `string.empty`); `000000` qua
  validation và thất bại với `SIGNUP_OTP_INVALID`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-013 — A registered email cannot start sign-up

- **Requirement:** REQ-AUTH-02, REQ-AUTH-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (địa chỉ đã đăng ký)
- **Bước:**
  1. `POST /auth/signup/send-otp` với `user@test.com`.
- **Mong đợi:** 409 `SIGNUP_EMAIL_EXISTS` "Email is already registered".
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-014 — Resend is refused during the cooldown and counted once it has passed

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (cooldown → sẵn sàng), đoán lỗi (error guessing) (gửi
  hai lần)
- **Bước:**
  1. Gửi một mã; ngay lập tức gọi lại send-otp và resend-otp.
  2. Cho cooldown hết hạn; resend; verify bằng mã đã plant.
- **Mong đợi:** cả hai lời gọi sớm → 400 `SIGNUP_OTP_COOLDOWN`; resend →
  `resendCount: 1, maxResends: 5, remainingResends: 4`; mã gửi lại
  verify được.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-015 — Five wrong codes lock sign-up verification, even for the right code

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (lần thử 4 / 5), chuyển trạng thái (mở → bị khoá)
- **Bước:**
  1. Verify bằng mã sai năm lần, rồi bằng mã đúng.
- **Mong đợi:** lần 1–4 → `SIGNUP_OTP_INVALID` "… You have N attempt(s)
  remaining" (4…1); lần 5 và mã đúng → `SIGNUP_OTP_LOCKED`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-016 — A sign-up code that was already used cannot verify again

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: đã xác minh → xác minh lại)
- **Bước:**
  1. Verify một mã thành công; verify lại đúng mã đó.
- **Mong đợi:** 400 `SIGNUP_OTP_INVALID`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-017 — Sign-up cannot be completed without a verified code

- **Requirement:** REQ-AUTH-03, REQ-AUTH-04
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: đã gửi mã → complete), đoán lỗi
  (error guessing) (session token của địa chỉ khác)
- **Bước:**
  1. Gửi mã nhưng không verify; `POST /complete` với một session token
     bịa dài 64 ký tự.
  2. Verify một địa chỉ thứ hai; complete địa chỉ thứ nhất bằng token của nó.
- **Mong đợi:** cả hai → 400 `SIGNUP_SESSION_INVALID` "Session expired or
  invalid. Please verify OTP again"; không tài khoản nào được tạo.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-018 — The sign-up session token works once

- **Requirement:** REQ-AUTH-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (đã xác minh → có tài khoản; không hợp lệ: replay)
- **Bước:**
  1. Complete đăng ký với token hợp lệ; replay đúng request đó; đăng nhập.
- **Mong đợi:** lần đầu → 201 kèm user và token; replay → 400
  `SIGNUP_SESSION_INVALID`; mật khẩu đã chọn đăng nhập được (200).
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-019 — Password strength policy at sign-up

- **Requirement:** REQ-AUTH-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (7 / 8 / 128 / 129 ký tự), phân vùng tương đương (EP) (thiếu chữ thường, chữ hoa,
  chữ số, ký tự đặc biệt; `#` không được phép)
- **Bước:**
  1. `POST /complete` (session giả) chỉ thay đổi `password` /
     `confirmPassword`.
- **Mong đợi:** 7 → `string.min`, 129 → `string.max`, mỗi lỗi về loại ký tự →
  `string.pattern.base` (400 `VALIDATION_ERROR` trên `password`); 8 và 128 qua
  validation (`SIGNUP_SESSION_INVALID`).
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-020 — Profile fields, confirmation and terms acceptance are validated

- **Requirement:** REQ-AUTH-04
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (tên 1 / 2 ký tự; tuổi 12 / 14 / 121), phân vùng tương đương (EP) (tên
  có chữ số, giới tính không xác định, xác nhận không khớp, session token ngắn),
  bảng quyết định (`acceptTerms`: `true` → ok, `false` / `"true"` / thiếu →
  bị từ chối)
- **Bước:**
  1. `POST /complete` (session giả) mỗi lần đổi một field.
- **Mong đợi:** mỗi giá trị không hợp lệ → 400 `VALIDATION_ERROR` chỉ đúng field
  và rule Joi; `fullName: "Al"` với ngày sinh của người 14 tuổi qua
  validation.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-021 — The info step validates every field on the client

- **Requirement:** REQ-AUTH-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (rỗng, quá ngắn, mật khẩu yếu, không khớp)
- **Bước:**
  1. Submit form trống; rồi tên `A` với mật khẩu `abcdefgh`; rồi một
     form hợp lệ nhưng xác nhận mật khẩu khác.
- **Mong đợi:** "Please enter full name", "Please select birthday", "Please
  enter password", "Please confirm your password"; rồi "Full name must be at
  least 2 characters" và "Password must contain uppercase, lowercase, number
  and special character"; rồi "Passwords do not match". Không có request
  `/signup/complete` nào được gửi.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-022 — The info step asks the user to accept the terms

- **Requirement:** REQ-AUTH-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (requirement so với màn hình)
- **Bước:**
  1. Mở bước info.
- **Mong đợi:** hiện checkbox chấp nhận điều khoản. **Bug đã biết** — không có
  checkbox nào; `InfoStepForm` luôn gửi `acceptTerms: true` (test đánh dấu
  `test.fail`).
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-023 — A freshly signed-up user stays signed in after a reload

- **Requirement:** REQ-AUTH-13, REQ-AUTH-04
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (vừa tạo tài khoản → reload)
- **Bước:**
  1. Đăng ký qua UI; reload trang chủ; mở user menu.
- **Mong đợi:** vẫn đăng nhập bằng địa chỉ mới. **Bug đã biết** —
  `/signup/complete` không bao giờ đặt cookie `refreshToken`, nên reload làm
  user bị đăng xuất (test đánh dấu `test.fail`).
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-024 — A user signs in with email and password and lands on home

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (thông tin đăng nhập hợp lệ)
- **Bước:**
  1. Bước email → bước mật khẩu với `user@test.com` / `User@123`.
- **Mong đợi:** trang chủ `/`; user menu hiện `user@test.com`.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-025 — A wrong password shows the error and keeps the user on the step

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (mật khẩu đúng policy nhưng sai)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. Submit `Wrong@1234` ở bước mật khẩu.
- **Mong đợi:** "Invalid email or password"; vẫn ở `/login/password`;
  **Sign in** bật lại.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-026 — Password login contract: tokens in the body, refresh token only in an HttpOnly cookie

- **Requirement:** REQ-AUTH-05, REQ-AUTH-13
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (thông tin đăng nhập hợp lệ)
- **Bước:**
  1. `POST /auth/login` với `user@test.com` / `User@123`.
- **Mong đợi:** 200; `data` có đúng `accessToken`, `idToken`,
  `expiresIn` (8 h) — không có `refreshToken`; `Set-Cookie: refreshToken=…;
HttpOnly; SameSite=Lax; Path=/` và một `sid` HttpOnly.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-027 — A wrong password and an unknown email get the same answer

- **Requirement:** REQ-AUTH-05
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** bảng quyết định (tài khoản tồn tại × mật khẩu đúng), đoán lỗi
  (error guessing) (dò tài khoản)
- **Bước:**
  1. `POST /auth/login` với tài khoản dùng một lần + mật khẩu sai, và với một
     địa chỉ không tồn tại.
- **Mong đợi:** cả hai 401 `LOGIN_INVALID_CREDENTIALS` "Invalid email or
  password"; không có cookie.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-028 — Double-clicking Sign in sends a single login request

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (submit hai lần)
- **Bước:**
  1. Double-click **Sign in** với mật khẩu đúng.
- **Mong đợi:** đúng một `POST /auth/login`; tới được trang chủ.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-029 — Back after signing in does not return to the login form

- **Requirement:** REQ-AUTH-05, REQ-AUTH-15
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (nút back của trình duyệt)
- **Bước:**
  1. Đăng nhập qua UI; bấm Back.
- **Mong đợi:** guest guard đưa user về `/`; không có ô mật khẩu.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-030 — Sign-in errors are translated for Accept-Language: vi

- **Requirement:** REQ-AUTH-05
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi)
- **Bước:**
  1. `POST /auth/login` với `Accept-Language: vi`: địa chỉ không tồn tại; rồi một
     email sai định dạng.
- **Mong đợi:** "Email hoặc mật khẩu không chính xác"; lỗi field là
  "Email không hợp lệ".
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-031 — Inactive and unverified accounts are told why they cannot sign in

- **Requirement:** REQ-AUTH-11
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (inactive, chưa xác minh)
- **Tiền điều kiện:** hai tài khoản dùng một lần, một cái `isActive: false`, một cái
  `verifiedEmail: false`
- **Bước:**
  1. Với mỗi tài khoản: bước email → bước mật khẩu với mật khẩu đúng.
- **Mong đợi:** cả hai tới được bước mật khẩu (địa chỉ được coi là đã đăng ký);
  "Your account has been deactivated. Please contact support" /
  "Please verify your email address before logging in"; vẫn ở bước đó.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-032 — A user signs in with a one-time code from the alternative screen

- **Requirement:** REQ-AUTH-06, REQ-AUTH-08
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (alternative → đã gửi mã → đã đăng nhập)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. `/login/alternative` → **Login with OTP**; gõ mã (đã plant).
- **Mong đợi:** `/login/otp` với "Enter verification code" và hướng dẫn nhập 6
  chữ số; sau khi nhập mã, về trang chủ với tài khoản đó trong user menu.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-033 — A wrong one-time code shows how many attempts remain

- **Requirement:** REQ-AUTH-06
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (mã sai)
- **Bước:**
  1. Trên `/login/otp` gõ `999999`.
- **Mong đợi:** "Invalid OTP code. 4 attempts remaining"; ô nhập được xoá; vẫn
  ở `/login/otp`.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-034 — Code send hides whether the address exists and enforces a cooldown

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (đã đăng ký / không tồn tại), đoán lỗi (error guessing) (dò tài khoản,
  gửi hai lần)
- **Bước:**
  1. `POST /auth/login/otp/send` cho một tài khoản dùng một lần và một địa chỉ
     không tồn tại; gửi lại cho tài khoản đó.
- **Mong đợi:** cùng một 200 `{ success, expiresIn: 300, cooldown: 60 }`;
  chỉ tài khoản thật có mã; lần lặp → 400 `LOGIN_OTP_COOLDOWN`
  "Please wait N seconds before requesting a new OTP".
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-035 — A valid code signs in once and cannot be reused

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (đã cấp mã → đã dùng; không hợp lệ: dùng lại)
- **Bước:**
  1. Send, plant, verify; verify lại đúng mã đó.
- **Mong đợi:** 200 kèm access token và refresh cookie HttpOnly (không có
  refresh token trong body); replay → 401 `LOGIN_OTP_INVALID`.
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-036 — Five wrong codes lock code sign-in, even for the right code

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (lần thử 4 / 5), chuyển trạng thái (mở → bị khoá)
- **Bước:**
  1. Verify mã sai năm lần, rồi mã đúng.
- **Mong đợi:** lần 1–4 → 401 "Invalid OTP code. N attempts remaining";
  lần 5 và mã đúng → 429 `LOGIN_OTP_LOCKED` "Too many failed OTP
  attempts. Please try again in 15 minutes".
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-037 — A user signs in by opening the magic link

- **Requirement:** REQ-AUTH-07, REQ-AUTH-08
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (alternative → đã gửi link → đã đăng nhập)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. `/login/alternative` → **Login with Magic Link**.
  2. Mở `/login/verify-magic-link?token=<planted>&email=…`.
- **Mong đợi:** "Check your email" kèm địa chỉ; mở link thì về
  trang chủ, đăng nhập bằng tài khoản đó.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-038 — An invalid magic link sends the user back to login

- **Requirement:** REQ-AUTH-07
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (link giả / hết hạn)
- **Bước:**
  1. Mở trang verify với một token đúng định dạng nhưng chưa từng được cấp.
- **Mong đợi:** "Verifying magic link..." trong lúc API trả 401, rồi
  bước "Welcome" trên `/login`.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-039 — A magic link works once; malformed tokens fail validation

- **Requirement:** REQ-AUTH-07
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (127 / 128 / 129 ký tự), phân vùng tương đương (EP) (hex chữ hoa, rỗng,
  giá trị sai), chuyển trạng thái (không hợp lệ: dùng lại)
- **Bước:**
  1. Send, plant một token; verify với các token sai định dạng, một token sai,
     token đúng, rồi token đúng lần nữa.
- **Mong đợi:** sai định dạng → 400 trên `token` (`string.length` /
  `string.pattern.base` / `string.empty`); sai → 401
  `LOGIN_MAGIC_LINK_INVALID` và link thật vẫn dùng được; đúng → 200 kèm
  refresh cookie HttpOnly; replay → 401 "Invalid or expired magic link".
- **Automated:** `tests/api/auth/magic-link.api.ts`

### TC-AUTH-040 — Magic-link send hides whether the address exists and enforces a cooldown

- **Requirement:** REQ-AUTH-07
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (đã đăng ký / không tồn tại), đoán lỗi (error guessing) (dò tài khoản)
- **Bước:**
  1. Gửi cho một tài khoản dùng một lần và một địa chỉ không tồn tại; gửi lại cả hai.
- **Mong đợi:** cùng một 200 `{ success, expiresIn: 900, cooldown: 60 }`;
  chỉ tài khoản đó có token; cả hai lần lặp → 400
  `LOGIN_MAGIC_LINK_COOLDOWN`.
- **Automated:** `tests/api/auth/magic-link.api.ts`

### TC-AUTH-041 — The alternative screen switches between password, code and magic link

- **Requirement:** REQ-AUTH-08
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (password ⇄ alternative ⇄ code / link)
- **Bước:**
  1. Bước mật khẩu → **Try another way**; chọn từng cách rồi quay lại bằng
     **Try another method**; cuối cùng **Change email**.
- **Mong đợi:** "Choose login method" liệt kê Magic Link, OTP, password và
  Contact administrator, email được giữ qua mọi bước chuyển; mỗi lựa chọn mở
  đúng bước của nó; **Change email** quay về `/login`.
- **Automated:** `tests/e2e/auth/alternative.e2e.ts`

### TC-AUTH-042 — The 10th wrong password locks the account and says for how long

- **Requirement:** REQ-AUTH-09
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (active → bị khoá), giá trị biên (BVA) (lần thử 9 / 10)
- **Tiền điều kiện:** một tài khoản dùng một lần; đã gửi sẵn 9 lần mật khẩu sai
- **Bước:**
  1. Submit lần sai thứ 10; reload rồi submit mật khẩu đúng.
- **Mong đợi:** cả hai trả 429 và hiện "Account temporarily locked after 10
  failed attempts. Please try again in N seconds"; user vẫn ở
  bước mật khẩu.
- **Automated:** `tests/e2e/auth/lockout.e2e.ts`

### TC-AUTH-043 — Lockout boundary: attempt 9 fails, attempt 10 locks, the right password is refused

- **Requirement:** REQ-AUTH-09
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (9 / 10 / 11), chuyển trạng thái (active → bị khoá)
- **Bước:**
  1. Chín lần mật khẩu sai; lần thứ mười; rồi mật khẩu đúng.
- **Mong đợi:** lần 9 → 401 `LOGIN_INVALID_CREDENTIALS`; lần 10 → 429
  `LOGIN_ACCOUNT_LOCKED` "… in 1800 seconds"; mật khẩu đúng → 429 với
  1700 < N ≤ 1800 và không có cookie.
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-044 — A successful sign-in resets the failed-attempt counter

- **Requirement:** REQ-AUTH-09
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (9 lần sai → thành công → bộ đếm 0)
- **Bước:**
  1. Chín lần mật khẩu sai; mật khẩu đúng; lại chín lần mật khẩu sai.
- **Mong đợi:** lần thành công là 200, key bộ đếm biến mất, và loạt chín lần
  thứ hai vẫn trả 401 (không bị khoá).
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-045 — A locked user requests an unlock code, verifies it and gets back in

- **Requirement:** REQ-AUTH-10
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (bị khoá → đã yêu cầu mở khoá → đã mở khoá)
- **Bước:**
  1. Khoá một tài khoản dùng một lần; `POST /auth/unlock/request`; plant
     mật khẩu tạm; `POST /auth/unlock/verify`; đăng nhập bằng mật khẩu
     gốc.
- **Mong đợi:** request → 200 `{ success: true }` và một mã được lưu; verify
  → 200 kèm token, refresh cookie HttpOnly và `mustChangePassword: true`
  trong idToken; sau đó mật khẩu gốc đăng nhập được (200).
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-046 — Unlock refuses invalid transitions

- **Requirement:** REQ-AUTH-10
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: active → request; mã đã dùng →
  verify), đoán lỗi (error guessing) (đoán sai không được làm mất mã)
- **Bước:**
  1. Yêu cầu mở khoá cho một tài khoản đang active; khoá nó rồi yêu cầu lại.
  2. Verify với mã sai, mã đúng, mã đúng lần nữa; verify
     một địa chỉ không tồn tại.
- **Mong đợi:** chưa bị khoá → 400 `UNLOCK_ACCOUNT_NOT_LOCKED`; mã sai → 401
  `UNLOCK_INVALID_TEMP_PASSWORD` trong khi mã thật vẫn dùng được; dùng lại →
  401; địa chỉ không tồn tại → 401 với cùng message.
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-047 — Unlock request guards: no enumeration, disabled account, cooldown, hourly limit, code length

- **Requirement:** REQ-AUTH-10, REQ-AUTH-12
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (không tồn tại, bị vô hiệu), giá trị biên (BVA) (3 / 4 request mỗi giờ;
  mật khẩu tạm 11 / 12 ký tự), chuyển trạng thái (cooldown)
- **Bước:**
  1. Yêu cầu cho một địa chỉ không tồn tại; lặp lại ngay; thêm hai lần nữa khi
     cooldown đã hết; lần thứ tư.
  2. Yêu cầu cho một tài khoản dùng một lần có `isActive: false`.
  3. Verify với mật khẩu tạm dài 11 và 12 ký tự.
- **Mong đợi:** không tồn tại → 200 `{ success: true }`, không lưu gì; lặp ngay →
  400 `UNLOCK_COOLDOWN`; lần 2 và 3 → 200; lần 4 → 429 `UNLOCK_RATE_LIMIT`;
  bị vô hiệu → 400 `UNLOCK_ACCOUNT_DISABLED`; 11 ký tự → 400 "Temporary
  password must be at least 12 characters"; 12 ký tự → 401.
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-048 — A locked user is offered the self-service unlock from the sign-in screen

- **Requirement:** REQ-AUTH-10
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (requirement so với màn hình)
- **Tiền điều kiện:** một tài khoản dùng một lần đang bị khoá
- **Bước:**
  1. Submit bước mật khẩu.
- **Mong đợi:** cạnh message khoá có link hoặc nút mở khoá.
  **Bug đã biết** — client không có màn hình, route hay link mở khoá nào (test đánh dấu
  `test.fail`).
- **Automated:** `tests/e2e/auth/lockout.e2e.ts`

### TC-AUTH-049 — Account status × sign-in method decision table

- **Requirement:** REQ-AUTH-11
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** bảng quyết định (`isActive` × `verifiedEmail` × cách đăng nhập)
- **Tiền điều kiện:** các tài khoản dùng một lần đã đặt sẵn cờ
- **Bước:**
  1. Với mỗi dòng: đăng nhập bằng mật khẩu đúng, verify OTP và
     verify magic link; rồi send OTP và send magic link.
- **Mong đợi:**

  | isActive | verifiedEmail | password / OTP / magic link    | send             |
  | -------- | ------------- | ------------------------------ | ---------------- |
  | false    | true          | 401 `LOGIN_ACCOUNT_INACTIVE`   | 200, không có mã |
  | false    | false         | 401 `LOGIN_ACCOUNT_INACTIVE`   | 200, không có mã |
  | true     | false         | 401 `LOGIN_EMAIL_NOT_VERIFIED` | 200, không có mã |
  | true     | true          | 200 (password)                 | —                |

- **Automated:** `tests/api/auth/account-status.api.ts`

### TC-AUTH-050 — Password sign-in is limited to 30 requests per IP

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (30 / 31 request)
- **Bước:**
  1. 30 `POST /auth/login` từ một IP; lần 31; lần 32 cho một địa chỉ khác.
- **Mong đợi:** 1–30 → 401 (`RateLimit-Remaining: 0` ở lần 30); lần 31 →
  429 `TOO_MANY_REQUESTS` "Too many login attempts. Please try again later",
  `RateLimit-Limit: 30`; địa chỉ khác cũng bị chặn.
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-051 — Code and magic-link sends are limited to 5 per email

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (5 / 6 request), phân vùng tương đương (EP) (cùng địa chỉ / địa chỉ khác)
- **Bước:**
  1. Với `otp/send` và `magic-link/send`: 5 request cho một địa chỉ, lần
     thứ 6, rồi một request cho địa chỉ khác.
- **Mong đợi:** lần 1 200, lần 2–5 400 (cooldown), lần 6 429
  `TOO_MANY_REQUESTS`; địa chỉ khác → 200.
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-052 — Sign-up codes are limited to 3 per email and 5 per IP

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (3 / 4 mỗi email, 5 / 6 mỗi IP)
- **Bước:**
  1. Bốn lần gửi cho một địa chỉ; reset cửa sổ IP; sáu lần gửi cho sáu
     địa chỉ.
- **Mong đợi:** lần 4 cho địa chỉ đó → 429; địa chỉ 1–5 → 200, địa chỉ 6 → 429,
  cả hai đều "You have exceeded the allowed number of attempts".
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-053 — The session survives a reload; the access token is never stored in the browser

- **Requirement:** REQ-AUTH-13
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (đã đăng nhập → reload → vẫn đăng nhập)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. Đăng nhập qua UI; reload; kiểm tra storage và cookie.
- **Mong đợi:** reload gọi `/auth/token/refresh` (200) và user vẫn
  đăng nhập; cả localStorage, sessionStorage lẫn `document.cookie` đều không
  giữ access token hay refresh token; cookie `refreshToken` là
  HttpOnly, SameSite=Lax.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-054 — Refresh issues a new access token from the cookie and refuses a missing or forged one

- **Requirement:** REQ-AUTH-13
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (cookie hợp lệ, thiếu, giả mạo)
- **Bước:**
  1. Đăng nhập; `POST /auth/token/refresh` kèm cookie; gọi `GET
/users/me` với token mới.
  2. Refresh không có cookie; với một JWT giả mạo.
- **Mong đợi:** 200 kèm access token mới cho cùng subject mà
  `/users/me` chấp nhận; không có cookie → 401
  `REFRESH_TOKEN_REQUIRED`; giả mạo → 403 `REFRESH_TOKEN_INVALID`.
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-055 — Logging out from the user menu ends the session

- **Requirement:** REQ-AUTH-14
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (đã đăng nhập → đã đăng xuất)
- **Tiền điều kiện:** một tài khoản dùng một lần đã đăng nhập qua UI
- **Bước:**
  1. User menu → **Log out**; rồi mở `/profile`.
- **Mong đợi:** `POST /auth/logout` → 204 và bước "Welcome" trên `/login`;
  `/profile` bị đẩy về `/login`; menu không còn hiện tài khoản.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-056 — After logout the old refresh token no longer works

- **Requirement:** REQ-AUTH-14
- **Layer:** api · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (không hợp lệ: đã đăng xuất → refresh), đoán lỗi
  (error guessing) (replay token)
- **Bước:**
  1. Đăng nhập và giữ lại refresh token; logout; refresh bằng cookie jar;
     refresh bằng token đã giữ.
- **Mong đợi:** logout 204 xoá rỗng `refreshToken` và `sid`; refresh bằng jar →
  401; token đã giữ → bị từ chối. **Bug đã biết** — logout không bao giờ thu hồi
  refresh JWT, nên token đã giữ vẫn trả 200 (test đánh dấu `test.fail`).
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-057 — Logout requires a signed-in caller

- **Requirement:** REQ-AUTH-14
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (không có token, token sai định dạng)
- **Bước:**
  1. `POST /auth/logout` không có `Authorization`, và với `Bearer
not-a-jwt`.
- **Mong đợi:** không có token → 401 `AUTH_MISSING_TOKEN`; token sai định dạng →
  bị từ chối với `JWT_INVALID` (hiện là 403 — xem REQ-AUTHZ-01); không session
  nào bị đụng tới.
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-058 — A signed-in user is kept out of the login and sign-up pages

- **Requirement:** REQ-AUTH-15
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** user
- **Kỹ thuật:** phân vùng tương đương (EP) (từng trang guest)
- **Bước:**
  1. Mở `/login`, `/login/password?email=…`, `/login/alternative?email=…`,
     `/signup/otp?email=…`, `/vi/login`.
- **Mong đợi:** mỗi trang redirect về trang chủ (`/` hoặc `/vi`) mà không hiện
  bước email; session vẫn là `user@test.com`.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-059 — A guest opening a private page is sent to login and returned there after signing in

- **Requirement:** REQ-AUTH-15
- **Layer:** e2e · **Priority:** P0 · **Tags:** @smoke · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (từng trang private), chuyển trạng thái (guest → đã đăng nhập
  → trang ban đầu)
- **Bước:**
  1. Mở `/`, `/profile`, `/login-history`.
  2. Từ `/profile` đăng nhập bằng một tài khoản dùng một lần.
- **Mong đợi:** mỗi trang private redirect về `/login`; sau khi đăng nhập
  user về `/profile`, không phải trang chủ.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-060 — Vietnamese: guests are sent to /vi/login, which speaks Vietnamese

- **Requirement:** REQ-AUTH-15, REQ-AUTH-01
- **Layer:** e2e · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (locale vi; email rỗng / sai định dạng / đã đăng ký)
- **Bước:**
  1. Mở `/vi/profile`; submit bước email khi trống; `abc`; rồi
     `user@test.com`.
- **Mong đợi:** `/vi/login` với "Chào mừng" / "Tiếp tục để sử dụng dịch vụ";
  "Vui lòng nhập email", "Email không đúng định dạng"; rồi
  `/vi/login/password` với "Nhập mật khẩu để đăng nhập" và "Thử cách khác".
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-061 — The login code must be exactly 6 digits

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (5 / 6 / 7 chữ số), phân vùng tương đương (EP) (không phải chữ số, rỗng)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. `POST /auth/login/otp/verify` với `12345`, `1234567`, `12a456`, `""`, rồi `000000`.
- **Mong đợi:** bốn giá trị đầu → 400 `VALIDATION_ERROR` trên `otp` (`string.length` / `string.pattern.base` /
  `string.empty`); `000000` qua validation và thất bại với 401 `LOGIN_OTP_INVALID`.
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-062 — Login code sends are capped at three per code lifetime

- **Requirement:** REQ-AUTH-16
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (lần gửi 3 / 4), chuyển trạng thái (cooldown → sẵn sàng)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. `POST /auth/login/otp/send` ba lần, xoá key cooldown giữa các lần (giả lập 60 s trôi qua).
  2. Xoá cooldown, gửi lần thứ tư.
- **Mong đợi:** lần 1–3 → 200; lần 4 → 400 `LOGIN_OTP_RESEND_LIMIT` "Maximum OTP requests reached. Please try again
  later".
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-063 — The code-send cap answers an unknown address the same way

- **Requirement:** REQ-AUTH-16, REQ-AUTH-06
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (dò tài khoản qua giới hạn gửi), bảng quyết định (tồn tại × lần gửi thứ 4)
- **Bước:**
  1. Lặp bốn lần gửi của TC-AUTH-062 cho một tài khoản dùng một lần và cho một địa chỉ không tồn tại.
- **Mong đợi:** lần gửi thứ tư của hai địa chỉ có cùng status và cùng error code. **Bug đã biết** — tài khoản thật nhận
  400 `LOGIN_OTP_RESEND_LIMIT`, địa chỉ không tồn tại nhận 200 (test đánh dấu `test.fail`).
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-064 — A password-locked account cannot sign in with a code or a magic link

- **Requirement:** REQ-AUTH-09
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (bị khoá → đổi cách đăng nhập), đoán lỗi (error guessing) (vòng qua khoá)
- **Tiền điều kiện:** một tài khoản dùng một lần đã bị khoá bằng 10 lần sai mật khẩu
- **Bước:**
  1. Send + plant + verify mã đăng nhập.
  2. Send + plant + verify magic link.
- **Mong đợi:** cả hai verify → 429 `LOGIN_ACCOUNT_LOCKED`, không có cookie `refreshToken`. **Bug đã biết** — chỉ bước
  mật khẩu kiểm khoá, mã và magic link vẫn đăng nhập được (test đánh dấu `test.fail`).
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-065 — Refresh is refused once the account is deactivated

- **Requirement:** REQ-AUTH-17
- **Layer:** api · **Priority:** P1 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (đã đăng nhập → bị vô hiệu → refresh)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. Đăng nhập; đặt `isActive: false`; `POST /auth/token/refresh` bằng cookie jar.
- **Mong đợi:** 403 `REFRESH_TOKEN_INVALID` "Invalid or expired refresh token"; không có access token mới.
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-066 — Refresh keeps the refresh token out of the response body

- **Requirement:** REQ-AUTH-13
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (so hợp đồng refresh với hợp đồng đăng nhập)
- **Bước:**
  1. Đăng nhập; `POST /auth/token/refresh` bằng cookie jar.
- **Mong đợi:** 200; `data` có đúng `accessToken`, `idToken`, `expiresIn` — không có `refreshToken`. **Bug đã biết** —
  refresh trả cả `refreshToken` trong body (test đánh dấu `test.fail`).
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-067 — check-email is limited to 10 requests per IP per minute

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (10 / 11 request)
- **Bước:**
  1. 10 `GET /auth/signup/check-email/:email` từ một IP; lần 11.
- **Mong đợi:** 1–10 → 200; lần 11 → 429 `TOO_MANY_REQUESTS` "You have exceeded the allowed number of attempts".
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-068 — Sign-up resends are capped at five

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** giá trị biên (BVA) (lần gửi lại 5 / 6)
- **Bước:**
  1. `send-otp`; năm lần `resend-otp`, mỗi lần xoá cooldown và bộ đếm rate limit (để chỉ còn giới hạn gửi lại); lần
     thứ sáu.
- **Mong đợi:** lần gửi lại thứ 5 → 200 với `resendCount: 5, remainingResends: 0`; lần thứ 6 → 400
  `SIGNUP_RESEND_LIMIT` "You have exceeded the maximum number of OTP resends".
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-069 — A registered address in another case cannot start sign-up

- **Requirement:** REQ-AUTH-02
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (viết HOA, khoảng trắng)
- **Bước:**
  1. `GET /auth/signup/check-email/USER@TEST.COM`.
  2. `POST /auth/signup/send-otp` với `"  USER@TEST.COM  "`.
- **Mong đợi:** `{ available: false }`; 409 `SIGNUP_EMAIL_EXISTS`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-070 — Wrong-typed sign-in and sign-up fields are a validation error, never a 5xx

- **Requirement:** REQ-AUTH-05, REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (sai kiểu JSON)
- **Bước:**
  1. `POST /auth/login` với `email: 123`, rồi `password: { "$ne": "" }`.
  2. `POST /auth/login/otp/verify` với `otp: 123456` (số); `POST /auth/login/magic-link/verify` với `token: ["a"]`.
  3. `POST /auth/signup/send-otp` với `email: true`.
- **Mong đợi:** mỗi request → 400 `VALIDATION_ERROR`; không request nào trả 5xx.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-071 — The password step validates the field before calling the API

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** phân vùng tương đương (EP) (rỗng), giá trị biên (BVA) (ngắn hơn 8 ký tự)
- **Bước:**
  1. Trên `/login/password?email=…` bấm **Sign in** khi ô trống; rồi nhập `abc` và bấm lại.
- **Mong đợi:** "Please enter password", rồi "Password must be at least 8 characters"; vẫn ở bước mật khẩu và không
  có `POST /auth/login` nào được gửi.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-072 — Resend on the code and magic-link screens waits out the cooldown

- **Requirement:** REQ-AUTH-16
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (cooldown → sẵn sàng → cooldown), giá trị biên (BVA) (60 s)
- **Tiền điều kiện:** một tài khoản dùng một lần cho mỗi màn hình
- **Bước:**
  1. `/login/alternative` → **Login with OTP**; quan sát nút gửi lại; tua đồng hồ 61 s (và xoá cooldown phía server);
     bấm **Resend OTP code**.
  2. Làm lại với **Login with Magic Link** và **Resend magic link**.
- **Mong đợi:** ban đầu "Resend in Ns" bị disable; sau 61 s nút gửi lại bật; bấm vào hiện "OTP code has been resent!" /
  "Magic link has been resent!" và đếm ngược lại.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-073 — Re-entering an unknown email during the code cooldown still continues to verification

- **Requirement:** REQ-AUTH-02
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (quay lui: `/signup/otp` → `/login` → `/signup/otp`), đoán lỗi (error guessing)
- **Bước:**
  1. Trên `/login` nhập một địa chỉ chưa đăng ký → `/signup/otp`.
  2. Bấm **Change email**; nhập lại đúng địa chỉ đó trong vòng 60 s.
- **Mong đợi:** lại tới `/signup/otp?email=…` với heading "Verify Email". **Bug đã biết** — `send-otp` trả 400
  `SIGNUP_OTP_COOLDOWN` và user đứng lại ở `/login` với toast (test đánh dấu `test.fail`).
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-074 — Submitting the info step with an expired session shows the error and stays on the step

- **Requirement:** REQ-AUTH-04
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** chuyển trạng thái (nhảy cóc: vào thẳng `/signup/info` không qua xác minh)
- **Bước:**
  1. Mở `/signup/info` với một session token đúng định dạng nhưng chưa từng được cấp; điền form hợp lệ; bấm
     **Create Account**.
- **Mong đợi:** toast "Session expired or invalid. Please verify OTP again"; vẫn ở `/signup/info`; không tài khoản nào
  được tạo.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-075 — Logging out in one tab ends the session in the other tab after a reload

- **Requirement:** REQ-AUTH-14
- **Layer:** e2e · **Priority:** P2 · **Vai trò:** guest
- **Kỹ thuật:** đoán lỗi (error guessing) (2 tab), chuyển trạng thái (đã đăng nhập → đã đăng xuất)
- **Tiền điều kiện:** một tài khoản dùng một lần
- **Bước:**
  1. Đăng nhập ở tab 1; mở `/` ở tab 2 (cùng trình duyệt).
  2. Đăng xuất ở tab 1; reload tab 2.
- **Mong đợi:** tab 2 ban đầu đã đăng nhập bằng tài khoản đó; sau reload bị đưa về `/login`.
- **Automated:** `tests/e2e/auth/session.e2e.ts`
