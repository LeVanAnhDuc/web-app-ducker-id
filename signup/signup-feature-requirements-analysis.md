# Signup Feature - Business Requirements Analysis

---

## Executive Summary

**Feature**: User Registration (Signup) System

**Version**: 1.0 (Updated based on actual implementation)

**Date**: February 2026

**Author**: System Analysis Team

### Overview

Hệ thống đăng ký người dùng cho nền tảng App Store với quy trình xác thực email qua OTP (One-Time Password).

### Core Process Flow

1. **Email Verification** - Người dùng nhập email, hệ thống gửi OTP
2. **OTP Verification** - Xác thực mã OTP từ email
3. **Profile Creation** - Hoàn tất đăng ký với thông tin cá nhân

### Key Objectives

- Đảm bảo email thực sự thuộc về người đăng ký
- Ngăn chặn bot và spam registration
- Bảo mật cao cho tài khoản người dùng
- Thu thập thông tin cơ bản cần thiết

---

## 1. User Stories

### Primary User Stories

| ID | As a... | I want to... | So that... |
|---|---------|-------------|-----------|
| US-01 | Người dùng mới | Đăng ký tài khoản bằng email | Tôi có thể truy cập các app trên nền tảng |
| US-02 | Người dùng mới | Nhận mã OTP qua email | Tôi có thể xác thực quyền sở hữu email |
| US-03 | Người dùng mới | Gửi lại OTP khi chưa nhận được | Tôi không bị stuck trong quá trình đăng ký |
| US-04 | Người dùng mới | Thiết lập mật khẩu an toàn | Tài khoản của tôi được bảo vệ |
| US-05 | Người dùng mới | Cung cấp thông tin cá nhân cơ bản | Hệ thống có thông tin để quản lý tài khoản |

### Secondary User Stories

| ID | As a... | I want to... | So that... |
|---|---------|-------------|-----------|
| US-06 | System Admin | Ngăn chặn spam registration | Hệ thống không bị lạm dụng |
| US-07 | Security Team | Phát hiện đăng ký bất thường | Bảo vệ nền tảng khỏi tấn công |

---

## 2. Functional Requirements

### 2.1 Email Verification & OTP Sending

| ID | Requirement | Priority | Description |
|---|-------------|----------|-------------|
| FR-01 | Check Email Availability | Must Have | Kiểm tra email đã được đăng ký chưa |
| FR-02 | OTP Generation | Must Have | Tạo mã OTP 6 chữ số ngẫu nhiên (cryptographically secure) |
| FR-03 | OTP Email Sending | Must Have | Gửi email chứa OTP đến người dùng |
| FR-04 | OTP Storage | Must Have | Lưu OTP (hash) vào Redis với TTL 5 phút |
| FR-05 | Cooldown Mechanism | Must Have | Chặn gửi OTP liên tiếp, yêu cầu chờ 60 giây |
| FR-06 | Email Format Validation | Must Have | Validate định dạng email RFC 5322 |

### 2.2 OTP Verification

| ID | Requirement | Priority | Description |
|---|-------------|----------|-------------|
| FR-07 | OTP Verification | Must Have | So sánh OTP nhập với OTP hash đã lưu |
| FR-08 | Failed Attempt Tracking | Must Have | Theo dõi số lần nhập OTP sai |
| FR-09 | Account Lockout | Must Have | Khóa tài khoản sau 5 lần nhập OTP sai trong 15 phút |
| FR-10 | OTP Expiration | Must Have | OTP hết hạn sau 5 phút |
| FR-11 | Session Creation | Must Have | Tạo session token sau khi verify thành công (TTL 30 phút) |
| FR-12 | OTP Cleanup | Must Have | Xóa OTP data sau verify thành công |

### 2.3 OTP Resend

| ID | Requirement | Priority | Description |
|---|-------------|----------|-------------|
| FR-13 | Resend Cooldown | Must Have | Chặn resend trước 60 giây |
| FR-14 | Resend Limit | Must Have | Giới hạn tối đa 5 lần resend trong 1 giờ |
| FR-15 | Resend Count Tracking | Must Have | Theo dõi số lần resend OTP |
| FR-16 | New OTP Generation | Must Have | Tạo OTP mới mỗi lần resend |

### 2.4 Profile Completion & Account Creation

| ID | Requirement | Priority | Description |
|---|-------------|----------|-------------|
| FR-17 | Session Validation | Must Have | Verify session token hợp lệ trước khi tạo tài khoản |
| FR-18 | Full Name Required | Must Have | Thu thập họ tên đầy đủ (2-100 ký tự) |
| FR-19 | Gender Required | Must Have | Thu thập giới tính (male/female/other/prefer_not_to_say) |
| FR-20 | Date of Birth Required | Must Have | Thu thập ngày sinh (tối thiểu 13 tuổi) |
| FR-21 | Password Hashing | Must Have | Hash password bằng bcrypt trước khi lưu |
| FR-22 | Authentication Record Creation | Must Have | Tạo authentication record với email và hashed password |
| FR-23 | User Profile Creation | Must Have | Tạo user profile với thông tin cá nhân |
| FR-24 | Auto Login | Must Have | Tự động tạo JWT tokens (access + refresh) sau đăng ký |
| FR-25 | Signup Data Cleanup | Must Have | Xóa OTP và session data sau hoàn tất đăng ký |

---

## 3. Non-Functional Requirements

### 3.1 Security

| ID | Requirement | Description |
|---|-------------|-------------|
| NFR-01 | Password Hashing | Bcrypt với cost factor phù hợp |
| NFR-02 | OTP Security | Cryptographically secure random (không dùng Math.random) |
| NFR-03 | Rate Limiting - Cooldown | 60 giây giữa các lần gửi OTP |
| NFR-04 | Rate Limiting - Resend | Max 5 lần resend/1 giờ |
| NFR-05 | Brute Force Protection | Khóa sau 5 lần nhập OTP sai trong 15 phút |
| NFR-06 | XSS Prevention | Sanitize tất cả input |
| NFR-07 | NoSQL Injection Prevention | Validate và sanitize input |
| NFR-08 | HTTPS | Bắt buộc sử dụng HTTPS |
| NFR-09 | Session Security | Session token cryptographically secure (32 bytes) |
| NFR-10 | OTP Hash Storage | Lưu hash của OTP, không lưu plain text |

### 3.2 Performance

| ID | Requirement | Target | Description |
|---|-------------|--------|-------------|
| NFR-11 | OTP Email Delivery | < 5 seconds | Thời gian gửi email OTP |
| NFR-12 | OTP Verification | < 500ms | Thời gian verify OTP |
| NFR-13 | Account Creation | < 2 seconds | Thời gian tạo tài khoản |

### 3.3 Reliability

| ID | Requirement | Target |
|---|-------------|--------|
| NFR-14 | Email Delivery Rate | > 98% |
| NFR-15 | Data Consistency | Atomic operations cho account creation |
| NFR-16 | Redis Availability | OTP và session data phải available |

### 3.4 Usability

| ID | Requirement | Description |
|---|-------------|-------------|
| NFR-17 | Multi-language | Hỗ trợ tiếng Anh và tiếng Việt |
| NFR-18 | Clear Error Messages | Thông báo lỗi rõ ràng, hướng dẫn cụ thể |
| NFR-19 | Remaining Attempts | Hiển thị số lần còn lại khi OTP sai |
| NFR-20 | Remaining Resends | Hiển thị số lần resend còn lại |

---

## 4. Business Rules & Configuration

### 4.1 OTP Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| OTP Length | 6 chữ số | Cân bằng giữa security và UX |
| OTP Expiry | 5 phút | Đủ thời gian check email, không quá dài để bị abuse |
| OTP Algorithm | Cryptographically secure random | Bảo mật cao, không thể đoán được |
| Max Failed Attempts | 5 lần | Chống brute force |
| Lockout Duration | 15 phút | Đủ để ngăn automated attacks |
| Resend Cooldown | 60 giây | Ngăn spam email |
| Max Resends | 5 lần/1 giờ | Giới hạn resend abuse |
| Resend Window | 1 giờ | Thời gian tính resend count |
| Storage | Redis hash | Bảo mật, không lưu plain text OTP |

### 4.2 Session Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Session Token Length | 32 bytes (64 hex chars) | Cryptographically secure |
| Session Expiry | 30 phút | Đủ thời gian hoàn tất đăng ký |
| Storage | Redis | Fast access, TTL support |

### 4.3 Password Policy

| Rule | Requirement |
|------|-------------|
| Hashing Algorithm | Bcrypt |
| Storage | Hash only, never plain text |
| Validation | Handled by Joi schema (min length, complexity) |

### 4.4 User Profile Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | String | Yes | RFC 5322 format, unique |
| Password | String | Yes | Min 8 chars, hash với bcrypt |
| Full Name | String | Yes | 2-100 characters |
| Gender | Enum | Yes | male, female, other, prefer_not_to_say |
| Date of Birth | Date | Yes | Min 13 tuổi |

### 4.5 Age Restriction

| Rule | Value | Reason |
|------|-------|--------|
| Minimum Age | 13 tuổi | COPPA compliance |
| Validation | Calculated from dateOfBirth | Block registration nếu < 13 tuổi |

### 4.6 Post-Registration Behavior

| Action | Description |
|--------|-------------|
| Auto-login | Tự động tạo JWT tokens (access + refresh) |
| Token Response | Return access token, refresh token, user info |
| Data Cleanup | Xóa OTP và session data từ Redis |
| Email Notification | (Optional) Gửi welcome email |

---

## 5. Business Logic Flow

### 5.1 Send OTP Flow

1. **Input**: Email
2. **Validations**:
   - Email format hợp lệ
   - Email chưa đăng ký
   - Cooldown đã hết (60s)
3. **Process**:
   - Tạo OTP 6 số (cryptographically secure)
   - Hash OTP bằng bcrypt
   - Lưu hash vào Redis (TTL 5 phút)
   - Set cooldown 60 giây
   - Gửi email chứa OTP (async, không block response)
4. **Output**: Success response với expiresIn và cooldownSeconds

### 5.2 Verify OTP Flow

1. **Input**: Email, OTP
2. **Validations**:
   - Account không bị lock (< 5 failed attempts)
   - OTP chưa expired
3. **Process**:
   - Lấy OTP hash từ Redis
   - So sánh OTP input với hash
   - **Nếu sai**:
     - Increment failed attempts counter (TTL 15 phút)
     - Return error với remaining attempts
     - Nếu failed attempts >= 5: lock account
   - **Nếu đúng**:
     - Tạo session token (32 bytes cryptographically secure)
     - Lưu session vào Redis (TTL 30 phút)
     - Cleanup OTP data (xóa OTP, failed attempts, cooldown)
4. **Output**: Success response với sessionToken và expiresIn

### 5.3 Resend OTP Flow

1. **Input**: Email
2. **Validations**:
   - Cooldown đã hết (60s)
   - Resend count < 5 lần (trong 1 giờ)
   - Email chưa đăng ký
3. **Process**:
   - Tạo OTP mới
   - Clear OTP cũ
   - Hash và lưu OTP mới (TTL 5 phút)
   - Set cooldown 60 giây
   - Increment resend count (với TTL 1 giờ)
   - Gửi email OTP mới
4. **Output**: Success response với resendCount, remainingResends, expiresIn

### 5.4 Check Email Availability Flow

1. **Input**: Email
2. **Process**:
   - Query database để check email existence
3. **Output**: `{ available: true/false }`

### 5.5 Complete Signup Flow

1. **Input**: Email, sessionToken, fullName, gender, dateOfBirth, password
2. **Validations**:
   - Session token hợp lệ
   - Email chưa đăng ký (double-check)
   - Profile fields validation (Joi schema)
   - Age >= 13 tuổi
3. **Process**:
   - Hash password bằng bcrypt
   - Tạo authentication record (email, hashedPassword, role)
   - Tạo user profile (authId, fullName, gender, dateOfBirth)
   - Generate JWT tokens (access + refresh)
   - Cleanup signup data (xóa OTP data, session)
4. **Output**: Success response với user info và tokens

---

## 6. Edge Cases & Error Handling

### 6.1 Email Input & OTP Sending

| Tình huống | Hệ quả | Cách xử lý |
|-----------|--------|------------|
| Email format không hợp lệ | Không thể gửi OTP | Validation error (Joi schema) |
| Email đã được đăng ký | Duplicate account | Error 409: "Email already exists" |
| Email domain không tồn tại | Email bounce | (Email service xử lý) |
| Cooldown chưa hết (< 60s) | Spam prevention | Error 400: "Please wait X seconds" |
| Email service down | Không gửi được OTP | Email async, không block API response |
| Redis connection lost | Không lưu được OTP | Error 500: Service unavailable |
| Người dùng nhập email với spaces | UX issue | Auto-trim spaces (Joi schema) |
| Case sensitivity (User@Email vs user@email) | Duplicate detection fail | Normalize to lowercase (Joi schema) |

### 6.2 OTP Verification

| Tình huống | Hệ quả | Cách xử lý |
|-----------|--------|------------|
| OTP nhập sai | Failed verification | Increment failed attempts, return remaining attempts |
| OTP đã hết hạn (> 5 phút) | Verification fail | Error 400: "OTP expired" |
| Account bị lock (>= 5 failed attempts) | Brute force protection | Error 400: "Too many attempts, try again later" |
| OTP không tồn tại trong Redis | OTP expired hoặc chưa gửi | Error 400: "Invalid or expired OTP" |
| User copy-paste OTP có spaces | Verification fail | Auto-trim OTP input (Joi schema) |
| Redis connection lost | Không verify được | Error 500: Service unavailable |
| Session creation failed | Không thể tiếp tục flow | Error 500, rollback nếu cần |

### 6.3 OTP Resend

| Tình huống | Hệ quả | Cách xử lý |
|-----------|--------|------------|
| Resend trước 60s | Spam prevention | Error 400: "Please wait X seconds" |
| Resend >= 5 lần trong 1 giờ | Abuse prevention | Error 400: "Resend limit exceeded" |
| Email đã được đăng ký (race condition) | User đăng ký giữa chừng | Error 409: "Email already exists" |
| Redis resend counter lost | Counter reset | Acceptable, không critical |

### 6.4 Profile Completion & Account Creation

| Tình huống | Hệ quả | Cách xử lý |
|-----------|--------|------------|
| Session token không hợp lệ | Unauthorized access | Error 400: "Invalid session" |
| Session token expired (> 30 phút) | Session timeout | Error 400: "Session expired, please start over" |
| Email đã được đăng ký (race condition) | Duplicate account | Error 409: "Email already exists" |
| Full name chứa ký tự đặc biệt | Invalid data | Validation error (Joi schema) |
| Age < 13 tuổi | Legal/COPPA compliance | Validation error: "Must be at least 13 years old" |
| Password không đủ mạnh | Security risk | Validation error (Joi schema) |
| Database error khi create user | Failed registration | Error 500, rollback transaction |
| Race condition: 2 requests cùng email | Duplicate account | Database unique constraint + error handling |
| Token generation failed | Cannot auto-login | Error 500 |

### 6.5 Cross-cutting Concerns

| Tình huống | Hệ quả | Cách xử lý |
|-----------|--------|------------|
| Redis down | Không lưu được OTP/session | Error 503: Service unavailable |
| Database down | Không check email/create account | Error 503: Service unavailable |
| Email service down | Không gửi được OTP | Email async, không block API (log error) |
| Network timeout | Request failed | Client retry mechanism |
| Bot/automated registration | Spam accounts | (Future) reCAPTCHA, behavior analysis |

---

## 7. API Endpoints Specification

### 7.1 Send OTP

- **Endpoint**: `POST /api/v1/signup/send-otp`
- **Purpose**: Gửi OTP đến email để bắt đầu quy trình đăng ký
- **Input**: `{ email: string }`
- **Output**: `{ success: true, expiresIn: 300, cooldownSeconds: 60 }`
- **Errors**:
  - 400: Email format không hợp lệ
  - 400: Cooldown chưa hết
  - 409: Email đã tồn tại
  - 500: Server error

### 7.2 Verify OTP

- **Endpoint**: `POST /api/v1/signup/verify-otp`
- **Purpose**: Xác thực OTP và tạo session token
- **Input**: `{ email: string, otp: string }`
- **Output**: `{ success: true, sessionToken: string, expiresIn: 1800 }`
- **Errors**:
  - 400: Account bị lock
  - 400: OTP không đúng (with remaining attempts)
  - 400: OTP expired
  - 500: Server error

### 7.3 Resend OTP

- **Endpoint**: `POST /api/v1/signup/resend-otp`
- **Purpose**: Gửi lại OTP mới
- **Input**: `{ email: string }`
- **Output**: `{ success: true, expiresIn: 300, cooldownSeconds: 60, resendCount: 2, maxResends: 5, remainingResends: 3 }`
- **Errors**:
  - 400: Cooldown chưa hết
  - 400: Resend limit exceeded
  - 409: Email đã tồn tại
  - 500: Server error

### 7.4 Check Email Availability

- **Endpoint**: `GET /api/v1/signup/check-email/:email`
- **Purpose**: Kiểm tra email có sẵn để đăng ký không
- **Input**: Email trong URL params
- **Output**: `{ available: boolean }`
- **Errors**:
  - 400: Email format không hợp lệ
  - 500: Server error

### 7.5 Complete Signup

- **Endpoint**: `POST /api/v1/signup/complete`
- **Purpose**: Hoàn tất đăng ký với thông tin cá nhân
- **Input**:
  ```
  {
    email: string,
    sessionToken: string,
    fullName: string,
    gender: "male" | "female" | "other" | "prefer_not_to_say",
    dateOfBirth: string (ISO date),
    password: string,
    confirmPassword: string,
    acceptTerms: boolean
  }
  ```
- **Output**:
  ```
  {
    success: true,
    user: { id: string, email: string, fullName: string },
    tokens: { accessToken: string, refreshToken: string }
  }
  ```
- **Errors**:
  - 400: Session không hợp lệ
  - 400: Validation errors (age < 13, password weak, etc.)
  - 409: Email đã tồn tại
  - 500: Server error

---

## 8. Data Storage

### 8.1 Redis Storage (Temporary Data)

**OTP Data**: `otp:{email}`
- **Value**: Bcrypt hash của OTP
- **TTL**: 5 phút
- **Purpose**: Verify OTP

**OTP Cooldown**: `otp:cooldown:{email}`
- **Value**: "1" (placeholder)
- **TTL**: 60 giây
- **Purpose**: Prevent spam OTP requests

**OTP Failed Attempts**: `otp:failed:{email}`
- **Value**: Count number
- **TTL**: 15 phút
- **Purpose**: Track failed verification attempts

**OTP Resend Count**: `otp:resend:{email}`
- **Value**: Count number
- **TTL**: 1 giờ
- **Purpose**: Track resend requests

**Signup Session**: `signup:session:{email}`
- **Value**: Session token
- **TTL**: 30 phút
- **Purpose**: Verify user có quyền complete signup

### 8.2 Database Storage (Permanent Data)

**Authentication Collection**:
```
{
  _id: ObjectId,
  email: string (unique, lowercase, indexed),
  password: string (bcrypt hash),
  roles: string,
  createdAt: Date,
  updatedAt: Date
}
```

**User Collection**:
```
{
  _id: ObjectId,
  authId: ObjectId (ref Authentication),
  fullName: string,
  gender: enum,
  dateOfBirth: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 9. Security Considerations

### 9.1 Threat Model

| Threat | Risk Level | Mitigation |
|--------|------------|------------|
| Brute Force OTP | High | Max 5 attempts, lockout 15 phút |
| Email Enumeration | Medium | Generic error messages |
| OTP Interception | Medium | Short expiry (5 min), single use (verify xong cleanup) |
| Spam Registration | Medium | Cooldown 60s, max 5 resends/giờ |
| Session Hijacking | Medium | Session token cryptographically secure, TTL 30 phút |
| Password Cracking | High | Bcrypt hashing, password policy (via validation) |
| Replay Attack | Medium | OTP single-use (cleanup sau verify) |
| Race Condition (duplicate email) | Low | Database unique constraint |

### 9.2 Data Protection

- **PII (Personal Identifiable Information)**: Email, full name, date of birth, gender
- **Sensitive Data**: Password (never stored plain text), OTP (stored as hash)
- **Encryption**:
  - TLS in transit
  - Bcrypt for passwords
  - OTP hash storage
- **Data Retention**:
  - OTP: Auto-delete sau 5 phút (Redis TTL)
  - Session: Auto-delete sau 30 phút (Redis TTL)
  - User data: Theo GDPR/privacy policy

---

## 10. Assumptions

1. **Infrastructure**: Redis và Database available và reliable
2. **Email Service**: Email service provider đã được integrate và hoạt động ổn định
3. **Network**: HTTPS đã được enable cho tất cả endpoints
4. **Language**: Hỗ trợ English và Vietnamese (i18n)
5. **Authentication**: JWT-based authentication sau khi signup
6. **Client**: Client xử lý password confirmation và terms acceptance

---

## 11. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Email delivery failures | Medium | High | Async email sending, retry mechanism, log errors |
| High spam registrations | Medium | Medium | Cooldown 60s, resend limit 5/giờ, failed attempts limit |
| OTP brute force attacks | Low | High | Max 5 attempts, 15 min lockout |
| User drop-off during signup | Medium | High | Session persistence 30 phút |
| Data breach | Low | Critical | Bcrypt passwords, OTP hash storage, secure tokens |
| Redis failure | Low | High | Graceful error handling, service unavailable response |
| Database failure | Low | Critical | Transaction handling, error recovery |
| Race condition duplicate email | Low | Medium | Database unique constraint |

---

## 12. Success Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Signup Completion Rate | > 70% | % users hoàn thành full flow (send OTP → complete) |
| OTP Delivery Rate | > 98% | % OTP emails delivered successfully |
| Average Time to Complete | < 3 minutes | Thời gian trung bình hoàn thành signup |
| OTP Verification Success Rate | > 90% | % verifications thành công ở lần thử đầu tiên |
| Failed Attempt Rate (locked accounts) | < 5% | % sessions bị lock do nhập OTP sai quá nhiều |
| Resend Rate | < 30% | % users cần resend OTP |
| API Response Time (p95) | < 1 second | 95% requests hoàn thành trong 1 giây |

---

## 13. Business Decisions & Configuration Summary

### Configuration Constants

```
OTP:
- Length: 6 digits
- Expiry: 5 minutes
- Max Failed Attempts: 5
- Lockout Duration: 15 minutes
- Cooldown: 60 seconds
- Max Resends: 5 per hour
- Resend Window: 1 hour
- Storage: Redis hash

Session:
- Token Length: 32 bytes (64 hex)
- Expiry: 30 minutes
- Storage: Redis

Password:
- Hashing: Bcrypt
- Validation: Joi schema (client-side + server-side)

User:
- Min Age: 13 years old
- Required Fields: email, password, fullName, gender, dateOfBirth
- Gender Options: male, female, other, prefer_not_to_say

Post-Registration:
- Auto-login: Yes (JWT tokens)
- Welcome Email: Optional (not implemented)
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | Le Van Anh Duc | Initial draft |
| 1.1 | Feb 2026 | System Analysis | Updated based on actual implementation |

---

*End of Document*
