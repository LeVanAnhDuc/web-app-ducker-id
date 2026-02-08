# Sign-in Feature - Requirements Analysis

## Prompt Context

```
Bạn là một chuyên gia phân tích yêu cầu phần mềm (Requirement Analyst) với kinh nghiệm 10 năm. Phân tích & Định nghĩa yêu cầu (Requirement Analysis).

Ngữ cảnh: Chúng ta đang phát triển một feature mới cho app, tính năng đăng nhập.

Tôi mong muốn có 3 loại đăng nhập: đăng nhập với email + password, đăng nhập với email + otp gửi về email, đăng nhập với email + magic link gửi về email

Nhiệm vụ của bạn:
1. Phân tích yêu cầu ban đầu: Bạn là một Technical Architect hãy xác định các:
   - User Story: Dưới góc độ người dùng.
   - Functional requirements: Các chức năng bắt buộc phải có.
   - Non-functional requirements
   - Constraints
   - Edge cases

2. Định nghĩa rõ ràng: Liệt kê các yêu cầu dưới dạng bullet points, bao gồm:
   - Mục tiêu chính của feature.
   - Đối tượng người dùng (users/stakeholders).
   - Các tính năng cụ thể.
   - Yêu cầu về hiệu suất, bảo mật, và giao diện.
   - Các rủi ro tiềm ẩn hoặc giả định.
   - Edge cases: Liệt kê các edge cases và logic lỗi có thể xảy ra mà tôi cần phải xử lý
```

---

## Executive Summary

Tài liệu này phân tích yêu cầu cho tính năng **Đăng nhập (Sign-in)** của ứng dụng web. Feature cung cấp **3 phương thức đăng nhập** linh hoạt nhằm đáp ứng nhu cầu đa dạng của người dùng:

1. **Email + Password**: Đăng nhập truyền thống với thông tin đã đăng ký
2. **Email + OTP**: Đăng nhập passwordless, xác thực qua mã OTP 6 số gửi về email
3. **Email + Magic Link**: Đăng nhập một chạm qua link đặc biệt gửi về email

**Mục tiêu chính:**
- Cung cấp trải nghiệm đăng nhập **an toàn** và **tiện lợi**
- Hỗ trợ **multiple login methods** để user có thể chọn phương thức phù hợp
- Bảo vệ tài khoản khỏi brute force attacks thông qua **progressive lockout** và **rate limiting**
- Đảm bảo **security best practices** (password hashing, token encryption, generic error messages)

**Đối tượng người dùng:**
- Registered users muốn đăng nhập vào hệ thống
- Users quên password (sử dụng OTP hoặc Magic Link)
- Users ưu tiên convenience hơn security (chọn Magic Link)
- Users ưu tiên security cao (chọn Password)

---

## 1. User Stories

### US-001: Đăng nhập bằng Email + Password
> **As a** registered user
> **I want to** log in using my email and password
> **So that** I can quickly access my account with credentials I remember

**Acceptance Criteria:**
- User nhập email đã đăng ký
- User nhập mật khẩu chính xác
- Hệ thống xác thực và cấp tokens (accessToken, idToken, refreshToken)
- Có link "Forgot password" để khôi phục mật khẩu khi quên
- Nếu sai password nhiều lần, account bị lock tạm thời (progressive lockout)

---

### US-002: Đăng nhập bằng Email + OTP
> **As a** registered user who forgot my password or prefers passwordless login
> **I want to** log in using a one-time code sent to my email
> **So that** I can access my account without remembering my password

**Acceptance Criteria:**
- User nhập email đã đăng ký
- Hệ thống gửi mã OTP 6 số về email
- OTP có hiệu lực trong **5 phút**
- User có thể yêu cầu gửi lại OTP sau **60 giây** cooldown
- Sau khi nhập đúng OTP, được cấp tokens
- Sau **5 lần nhập sai**, account bị lock **15 phút**

---

### US-003: Đăng nhập bằng Email + Magic Link
> **As a** registered user who wants the most convenient login experience
> **I want to** receive a special link in my email that logs me in automatically
> **So that** I can access my account with just one click

**Acceptance Criteria:**
- User nhập email đã đăng ký
- Hệ thống gửi magic link về email
- Magic link có hiệu lực trong **15 phút**
- Click vào link sẽ tự động đăng nhập (mở trang web với tokens)
- Link chỉ sử dụng được **một lần** (single-use)
- User có thể yêu cầu gửi lại link sau **60 giây** cooldown

---

### US-004: Chọn phương thức đăng nhập
> **As a** user
> **I want to** choose my preferred login method
> **So that** I can use the method most convenient for my situation

**Acceptance Criteria:**
- Màn hình đăng nhập mặc định hiển thị **Email + Password**
- Có các nút/link rõ ràng để chuyển sang **OTP** hoặc **Magic Link**
- UI giải thích ngắn gọn ưu điểm của từng phương thức
- Chuyển đổi giữa các phương thức không làm mất dữ liệu đã nhập (email)

---

## 2. Functional Requirements

### 2.1 Email + Password Login

| ID | Requirement |
|----|-------------|
| FR-001.1 | Hệ thống phải cho phép user nhập email và password |
| FR-001.2 | Hệ thống phải validate format email (RFC 5322) và password strength |
| FR-001.3 | Hệ thống phải kiểm tra account không bị lock trước khi xác thực |
| FR-001.4 | Hệ thống phải xác thực email tồn tại và account đang active |
| FR-001.5 | Hệ thống phải verify email đã được xác nhận (email verified = true) |
| FR-001.6 | Hệ thống phải so sánh password với hash đã lưu (bcrypt) |
| FR-001.7 | Nếu password sai: track failed attempts với **progressive lockout** (30s → 30min) |
| FR-001.8 | Nếu password đúng: reset failed attempts counter và cấp tokens |
| FR-001.9 | Hệ thống phải trả về generic error "Invalid credentials" (không leak thông tin email tồn tại hay không) |

**Progressive Lockout:**
- 4 lần đầu: không bị lock (free attempts)
- Lần 5: lock 30 giây
- Lần 6: lock 60 giây (1 phút)
- Lần 7: lock 120 giây (2 phút)
- Lần 8: lock 240 giây (4 phút)
- Lần 9: lock 480 giây (8 phút)
- Lần 10+: lock 1800 giây (30 phút)

---

### 2.2 Email + OTP Login

#### 2.2.1 OTP Send
| ID | Requirement |
|----|-------------|
| FR-002.1 | Hệ thống phải kiểm tra cooldown (60s) trước khi gửi OTP mới |
| FR-002.2 | Hệ thống phải validate email tồn tại, account active, email verified |
| FR-002.3 | Hệ thống phải kiểm tra resend limit (tối đa **3 lần trong 5 phút**) |
| FR-002.4 | Hệ thống phải generate OTP **6 số** bằng crypto-secure random |
| FR-002.5 | Hệ thống phải **hash OTP** trước khi lưu vào storage (Redis) |
| FR-002.6 | OTP phải có TTL = **5 phút** (300 seconds) |
| FR-002.7 | Hệ thống phải gửi email chứa OTP trong vòng **5 giây** |
| FR-002.8 | Hệ thống phải set cooldown 60s và increment resend counter |

#### 2.2.2 OTP Verify
| ID | Requirement |
|----|-------------|
| FR-002.9 | Hệ thống phải kiểm tra OTP không bị lock (max 5 failed attempts) trước khi verify |
| FR-002.10 | Hệ thống phải so sánh OTP input với hash trong storage |
| FR-002.11 | Nếu OTP sai: increment failed attempts counter |
| FR-002.12 | Sau **5 lần nhập sai**: lock account **15 phút** |
| FR-002.13 | Hệ thống phải hiển thị số lần còn lại khi OTP sai (VD: "Invalid OTP. 3 attempts remaining") |
| FR-002.14 | Nếu OTP đúng: xóa OTP data, reset counters, cấp tokens |
| FR-002.15 | OTP phải **single-use** (xóa ngay sau khi verify thành công) |

---

### 2.3 Email + Magic Link Login

#### 2.3.1 Magic Link Send
| ID | Requirement |
|----|-------------|
| FR-003.1 | Hệ thống phải kiểm tra cooldown (60s) trước khi gửi magic link mới |
| FR-003.2 | Hệ thống phải validate email tồn tại, account active, email verified |
| FR-003.3 | Hệ thống phải generate token **64 bytes** (128 hex characters) |
| FR-003.4 | Hệ thống phải **hash token** trước khi lưu vào storage (Redis) |
| FR-003.5 | Token phải có TTL = **15 phút** (900 seconds) |
| FR-003.6 | Magic link format: `{BASE_URL}/auth/magic-link?token={TOKEN}&email={EMAIL}` |
| FR-003.7 | Hệ thống phải gửi email chứa magic link trong vòng **5 giây** |
| FR-003.8 | Hệ thống phải set cooldown 60s |

#### 2.3.2 Magic Link Verify
| ID | Requirement |
|----|-------------|
| FR-003.9 | Client phải gửi POST request với email và token từ URL query params |
| FR-003.10 | Hệ thống phải verify token bằng cách compare với hash trong storage |
| FR-003.11 | Token phải **single-use** (xóa ngay sau khi verify thành công) |
| FR-003.12 | Nếu token invalid hoặc expired: trả về error "Invalid or expired magic link" |
| FR-003.13 | Nếu token valid: xóa token data, cấp tokens |
| FR-003.14 | Magic link phải hoạt động trên **bất kỳ browser/device nào** (cross-device) |

---

### 2.4 Token Response

| ID | Requirement |
|----|-------------|
| FR-004.1 | Hệ thống phải trả về **3 loại tokens**: accessToken, idToken, refreshToken |
| FR-004.2 | **refreshToken** phải được set vào **httpOnly cookie** với flags: Secure, SameSite |
| FR-004.3 | **accessToken** và **idToken** được trả về trong response body |
| FR-004.4 | Response body **không chứa refreshToken** (đã set vào cookie) |
| FR-004.5 | Token response phải bao gồm thông tin expiry time |

---

### 2.5 Security & Rate Limiting

| ID | Requirement |
|----|-------------|
| FR-005.1 | Hệ thống phải implement **rate limiting** per IP cho login endpoints |
| FR-005.2 | Hệ thống phải implement **rate limiting** per email cho OTP/Magic Link send |
| FR-005.3 | Hệ thống phải có **cooldown 60s** giữa các lần gửi OTP/Magic Link |
| FR-005.4 | Hệ thống phải kiểm tra **account active** trước khi cho phép login |
| FR-005.5 | Hệ thống phải kiểm tra **email verified** trước khi cho phép login |
| FR-005.6 | Hệ thống phải trả về **generic error messages** (không leak user existence) |
| FR-005.7 | Hệ thống phải reset tất cả failed attempts counters khi login thành công |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Login API response time | < 500ms (P95) |
| NFR-002 | OTP email delivery time | < 5 seconds |
| NFR-003 | Magic link email delivery time | < 5 seconds |
| NFR-004 | Concurrent login requests | 1000 req/sec |
| NFR-005 | Page load time sau khi login | < 2 seconds |

---

### 3.2 Security

| ID | Requirement |
|----|-------------|
| NFR-006 | Password phải được hash bằng **bcrypt** (cost factor >= 12) |
| NFR-007 | OTP và Magic Link token phải được **hash** trước khi lưu storage |
| NFR-008 | Sử dụng **crypto-secure random** để generate OTP và tokens (không dùng Math.random) |
| NFR-009 | HTTPS bắt buộc cho tất cả login endpoints |
| NFR-010 | JWT phải được signed với strong algorithm (RS256 hoặc HS256) |
| NFR-011 | Không leak thông tin user existence trong error messages |
| NFR-012 | Implement **CSRF protection** cho login endpoints |
| NFR-013 | RefreshToken phải lưu trong **httpOnly + Secure + SameSite** cookie |

---

### 3.3 Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-014 | Service availability | 99.9% uptime |
| NFR-015 | Graceful degradation khi email service down | Trả về error message rõ ràng |
| NFR-016 | Graceful degradation khi Redis down | Fallback to password-only login |

---

### 3.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-017 | Error messages phải **user-friendly** và hỗ trợ đa ngôn ngữ (i18n: EN, VI) |
| NFR-018 | Hệ thống phải support multiple platforms (web, mobile web) |
| NFR-019 | Accessibility compliance (WCAG 2.1 Level AA) |

---

### 3.5 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-023 | Code phải tuân thủ coding standards và best practices |
| NFR-024 | Authentication logic phải **extensible** cho 2FA trong tương lai |
| NFR-025 | Phải có interface để thêm Social Login (Google, Facebook) trong tương lai |
| NFR-026 | Logging đầy đủ cho debugging và monitoring |

---

## 4. Constraints

### 4.1 Technical Constraints
- Backend: Node.js + Express + TypeScript
- Database: MongoDB (user data), Redis (OTP, magic link tokens, rate limiting)
- Email Service: SMTP-based (Nodemailer hoặc tương tự)
- Authentication: JWT-based tokens

### 4.2 Business Constraints
- Phải tương thích với hệ thống **Signup** hiện có
- Không yêu cầu **2FA** cho MVP (nhưng thiết kế để mở rộng)
- Magic link phải hoạt động trên cả **mobile và desktop email clients**
- Không có tính năng "Remember me" (security concern)

### 4.3 Regulatory Constraints
- Tuân thủ **GDPR** (EU users) - không log PII không cần thiết
- Password không được lưu **plaintext**
- Phải có khả năng **audit** login attempts (cho security investigation)

---

## 5. Edge Cases

### 5.1 Email + Password Login

| Tình huống | Hệ quả | Cách xử lý đề xuất |
|------------|--------|-------------------|
| Email không tồn tại trong hệ thống | Leak thông tin user existence | Trả về generic error "Invalid credentials" |
| Password sai | Brute force risk | Increment failed attempts, progressive lockout (30s → 30min) |
| Account đã bị lock | User không thể đăng nhập | Hiển thị thời gian còn lại để unlock hoặc gợi ý dùng OTP/Magic Link |
| Account inactive (bị ban) | Should not login | Trả về error "Account suspended" |
| Email chưa verify | Incomplete registration | Trả về error "Please verify your email" với link resend verification |
| User nhập email với spaces/uppercase | Input error | Trim và lowercase email trước khi validate |
| Concurrent login requests | Race condition | Implement request deduplication hoặc accept multiple sessions |

---

### 5.2 Email + OTP Login

| Tình huống | Hệ quả | Cách xử lý đề xuất |
|------------|--------|-------------------|
| Email không tồn tại | Leak user existence | Validate email exists trước khi gửi, trả về error nếu không tồn tại |
| Account inactive hoặc email chưa verify | Should not send OTP | Validate trước khi gửi, trả về error rõ ràng |
| OTP expired (>5 phút) | Login fail | Redis TTL tự động xóa OTP, verify sẽ fail với error "OTP expired" |
| OTP sai | Brute force risk | Increment failed attempts, hiển thị remaining attempts |
| 5 lần nhập sai | Account compromised risk | Lock account 15 phút, trả về error "Too many failed attempts" |
| Resend OTP trước 60s | Spam prevention | Trả về error "Please wait X seconds before resending" với countdown |
| Resend OTP quá 3 lần trong 5 phút | Resource abuse | Trả về error "Resend limit exceeded, please try again later" |
| User không nhận được email | Frustration | Gợi ý check spam folder, cho phép resend sau cooldown |
| Copy-paste OTP với spaces | Input error | Trim whitespace và validate chỉ chứa digits |
| OTP đã dùng (click verify lần 2) | Replay attack | OTP đã bị xóa, verify fail với error "Invalid OTP" |
| Email service down | Cannot send OTP | Catch error, trả về "Unable to send OTP, please try again later" |

---

### 5.3 Email + Magic Link Login

| Tình huống | Hệ quả | Cách xử lý đề xuất |
|------------|--------|-------------------|
| Email không tồn tại | Leak user existence | Validate email exists trước khi gửi |
| Account inactive hoặc email chưa verify | Should not send link | Validate trước khi gửi, trả về error rõ ràng |
| Link expired (>15 phút) | Login fail | Redis TTL tự động xóa token, verify fail với error "Link expired" |
| Link đã sử dụng (click lần 2) | Replay attack | Token đã bị xóa, verify fail với error "Link already used" |
| Link bị modified (token tampered) | Security breach | Hash verification fail, trả về error "Invalid link" |
| User forward email cho người khác | Account hijack risk | Thêm warning trong email "Do not share this link" |
| Click link trên device khác | Cross-device login | Allow, tạo tokens mới cho device đó (không yêu cầu same device) |
| Email client preview link (auto-fetch) | Token consumed prematurely | Sử dụng POST verify thay vì GET auto-login, client phải click "Continue" button |
| Multiple magic link requests | Which link valid? | Invalidate tất cả tokens cũ khi generate token mới |
| Browser blocks redirect/popup | Broken flow | Hiển thị manual "Click here to continue" button thay vì auto-redirect |
| Link opened trong incognito mode | No cookies persisted | Vẫn hoạt động, refreshToken set vào cookie response |
| Resend link trước 60s | Spam prevention | Trả về error "Please wait X seconds before resending" |
| Email service down | Cannot send link | Catch error, trả về "Unable to send magic link, please try again later" |

---

### 5.4 General Edge Cases

| Tình huống | Hệ quả | Cách xử lý đề xuất |
|------------|--------|-------------------|
| Redis down | OTP/Magic Link không hoạt động | Graceful degradation - chỉ cho phép password login, log error |
| Database down | Cannot validate credentials | Trả về 503 Service Unavailable, log error |
| Network timeout during login | Uncertain state | Client retry với idempotency key để tránh duplicate |
| User đổi password trong lúc đang login | Race condition | Accept, mật khẩu mới có hiệu lực ngay lập tức |
| Multiple tabs login cùng lúc | Multiple tokens issued | Accept, mỗi tab có tokens riêng |
| Timezone differences | Expiry time confusion | Sử dụng UTC, hiển thị relative time "expires in X minutes" |

---

## 6. API Endpoints Design

### 6.1 Password Login
```
Endpoint: POST /login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response Success (200):
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "idToken": "eyJhbGc...",
    "refreshToken": "..." // Set vào httpOnly cookie
  }
}

Response Error (400 - Account Locked):
{
  "statusCode": 400,
  "message": "Account locked. Try again in 2 minutes."
}

Response Error (401 - Invalid Credentials):
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

---

### 6.2 OTP Login - Send
```
Endpoint: POST /login/otp/send
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response Success (200):
{
  "statusCode": 200,
  "message": "OTP sent successfully",
  "data": {
    "success": true,
    "expiresIn": 300,    // seconds
    "cooldown": 60       // seconds
  }
}

Response Error (400 - Cooldown):
{
  "statusCode": 400,
  "message": "Please wait 45 seconds before resending"
}

Response Error (400 - Resend Limit):
{
  "statusCode": 400,
  "message": "Resend limit exceeded. Try again later."
}
```

---

### 6.3 OTP Login - Verify
```
Endpoint: POST /login/otp/verify
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response Success (200):
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "idToken": "eyJhbGc...",
    "refreshToken": "..." // Set vào httpOnly cookie
  }
}

Response Error (400 - OTP Locked):
{
  "statusCode": 400,
  "message": "Account locked for 15 minutes due to too many failed attempts"
}

Response Error (401 - Invalid OTP):
{
  "statusCode": 401,
  "message": "Invalid OTP. 3 attempts remaining."
}
```

---

### 6.4 Magic Link - Send
```
Endpoint: POST /login/magic-link/send
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response Success (200):
{
  "statusCode": 200,
  "message": "Magic link sent successfully",
  "data": {
    "success": true,
    "expiresIn": 900,    // seconds (15 min)
    "cooldown": 60       // seconds
  }
}

Magic Link Format:
{BASE_URL}/auth/magic-link?token={128_HEX_CHARS}&email={EMAIL}
```

---

### 6.5 Magic Link - Verify
```
Endpoint: POST /login/magic-link/verify
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "token": "a1b2c3d4e5f6..." // 128 hex characters
}

Response Success (200):
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "idToken": "eyJhbGc...",
    "refreshToken": "..." // Set vào httpOnly cookie
  }
}

Response Error (401 - Invalid Token):
{
  "statusCode": 401,
  "message": "Invalid or expired magic link"
}
```

---

## 7. Business Requirements

### 7.1 User Flow Requirements

| ID | Requirement |
|----|-------------|
| BIZ-001 | Phương thức đăng nhập mặc định là **Email + Password** |
| BIZ-002 | **Không có** tính năng "Remember me" (security concern) |
| BIZ-003 | User phải có khả năng **switch** giữa 3 phương thức login một cách dễ dàng |
| BIZ-004 | Hệ thống phải hỗ trợ **passwordless accounts** (user có thể chỉ dùng OTP/Magic Link) |

---

### 7.2 Security Requirements

| ID | Requirement |
|----|-------------|
| BIZ-005 | Progressive lockout thay vì fixed lockout để **improve UX** |
| BIZ-006 | Generic error messages để **không leak** thông tin user existence |
| BIZ-007 | OTP và Magic Link phải **single-use** để prevent replay attacks |
| BIZ-008 | Cooldown periods để **prevent spam** và resource abuse |

---

### 7.3 Magic Link Behavior Requirements

| ID | Requirement |
|----|-------------|
| BIZ-009 | Magic link phải **cross-device compatible** (mở từ bất kỳ browser nào) |
| BIZ-010 | Email template phải có **warning** về không share link với người khác |

---

## 8. Assumptions

1. User đã có tài khoản được tạo qua **Signup flow**
2. Email đã được **verify** trong quá trình Signup (hoặc sau đó)
3. Email service (SMTP) đã được cấu hình và hoạt động ổn định
4. Redis đã được setup cho OTP, Magic Link tokens, và rate limiting
5. JWT infrastructure đã được implement
6. Không yêu cầu **Social Login** (Google, Facebook) cho MVP
7. Không yêu cầu **2FA** (TOTP/SMS) cho MVP nhưng thiết kế extensible
8. Không yêu cầu **Remember me** functionality

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Email service downtime | High | Low | Implement retry queue, fallback to password-only, clear error messages |
| Redis downtime | High | Low | Graceful degradation - password-only fallback, monitoring alerts |
| Brute force attacks | High | Medium | Progressive lockout, rate limiting, monitoring failed attempts |
| OTP interception (MITM) | High | Low | HTTPS required, short TTL (5 min), single-use tokens |
| Magic link forwarding | Medium | Medium | Warning in email, single-use token, short TTL (15 min) |
| Email client auto-preview | Medium | Medium | Use POST verify instead of GET, require manual click |
| Token theft (XSS) | High | Low | httpOnly + Secure cookies, CSP headers, input sanitization |
| Account enumeration | Medium | Medium | Generic error messages, rate limiting |
| Resource exhaustion (spam) | Medium | High | Cooldown periods, resend limits, rate limiting |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Login success rate | > 95% | Successful logins / Total attempts |
| Average login time (Password) | < 5 seconds | From submit to dashboard |
| Average login time (OTP) | < 30 seconds | From OTP request to dashboard |
| Average login time (Magic Link) | < 45 seconds | From link request to dashboard |
| OTP delivery rate | > 99% | Emails delivered / OTPs requested |
| Magic link click rate | > 80% | Links clicked / Links sent |
| Account lockout rate | < 1% | Locked accounts / Total users |
| Support tickets (login issues) | < 0.1% | Tickets / Monthly active users |
| Password method usage | ~70% | Password logins / Total logins |
| OTP method usage | ~20% | OTP logins / Total logins |
| Magic Link method usage | ~10% | Magic link logins / Total logins |

---

## 11. Out of Scope (Future Enhancements)

### Authentication Methods
- ❌ Social login (Google, Facebook, Apple)
- ❌ Two-factor authentication (TOTP/SMS)
- ❌ Biometric authentication (FaceID, Touch ID, WebAuthn)
- ❌ SSO (Single Sign-On) integration
- ❌ Login with phone number

### Session Management
- ❌ Multi-device session tracking
- ❌ View active sessions/devices
- ❌ Logout specific device
- ❌ Logout all other devices

### Security Features
- ❌ Login notification emails (new device/location)
- ❌ IP geolocation tracking
- ❌ Device fingerprinting
- ❌ CAPTCHA for failed attempts
- ❌ Account unlock via email verification

### User Experience
- ❌ Remember me functionality
- ❌ Trusted devices
- ❌ Login history view for users
- ❌ Security dashboard

---

## 12. Business Analyst Questions

Để làm rõ yêu cầu, Business Analyst cần đặt các câu hỏi sau:

### Account Management
1. User có thể login nếu email chưa verify không? → **Không, phải verify trước**
2. Passwordless account (không có password) có được phép không? → **Có, chỉ dùng OTP/Magic Link**
3. User có thể đổi phương thức login preferred không? → **Out of scope MVP**

### Security Policy
4. Progressive lockout có apply cho cả 3 phương thức không? → **Chỉ password, OTP có fixed lockout**
5. Account lockout có tự động unlock không? → **Có, sau thời gian định sẵn**
6. Admin có thể manual unlock account không? → **Out of scope MVP**

### User Experience
7. Có hiển thị login method nào đang được dùng nhiều nhất không? → **Out of scope MVP**
8. User có thể set phương thức login mặc định không? → **Out of scope MVP**
9. Có notification khi login từ device/location mới không? → **Out of scope MVP**

### Business Logic
10. OTP/Magic Link có khác TTL cho user VIP không? → **Không, same policy**
11. Có giới hạn số lượng login attempts trong 24h không? → **Có, qua progressive lockout**
12. User bị ban có thể dùng OTP/Magic Link để "bypass" không? → **Không, check account status trước**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 12/2025 | Le Van Anh Duc | Initial requirements analysis |
| 2.0 | 02/2026 | Le Van Anh Duc | Updated to focus on requirements only, removed implementation details |
