# SRS - Software Requirements Specification
## Tính năng Đăng ký người dùng (Sign Up)

---

## 1. Tóm tắt (Summary)

Tính năng đăng ký người dùng (Sign Up) cho phép người dùng mới tạo tài khoản trên hệ thống thông qua quy trình xác thực 3 bước:

1. **Bước 1 - Xác thực Email:** Người dùng nhập địa chỉ email, hệ thống gửi mã OTP (One-Time Password) về email để xác minh email còn sử dụng.
2. **Bước 2 - Xác nhận OTP:** Người dùng nhập mã OTP nhận được, hệ thống kiểm tra tính hợp lệ của OTP và email.
3. **Bước 3 - Hoàn tất thông tin:** Sau khi xác thực thành công, người dùng nhập đầy đủ thông tin cá nhân để hoàn tất đăng ký.

Quy trình này đảm bảo tính bảo mật cao và xác thực email thực tế của người dùng trước khi tạo tài khoản.

---

## 2. Mục tiêu kinh doanh (Business Objectives)

### 2.1. Tăng chất lượng người dùng
- Đảm bảo người dùng đăng ký sử dụng email thực và có khả năng truy cập
- Giảm thiểu tài khoản spam và tài khoản giả mạo
- Tăng tỷ lệ người dùng thực sự quan tâm đến sản phẩm

### 2.2. Cải thiện trải nghiệm người dùng
- Quy trình đăng ký rõ ràng, dễ hiểu với 3 bước đơn giản
- Giảm thiểu ma sát trong quá trình đăng ký
- Phản hồi nhanh chóng và chính xác cho mỗi bước

### 2.3. Tuân thủ quy định bảo mật
- Xác thực email trước khi tạo tài khoản
- Bảo vệ hệ thống khỏi các cuộc tấn công tự động (bot attacks)
- Đáp ứng yêu cầu về bảo mật dữ liệu người dùng

### 2.4. Tối ưu hóa chuyển đổi
- Giảm tỷ lệ bỏ cuộc trong quá trình đăng ký
- Tăng tỷ lệ hoàn thành đăng ký thành công
- Thu thập dữ liệu hợp lệ ngay từ đầu

---

## 3. Use Cases + User Stories

### 3.1. Use Case 1: Đăng ký tài khoản mới thành công

**Actors:** Người dùng mới

**Preconditions:**
- Người dùng chưa có tài khoản trong hệ thống
- Email chưa được đăng ký trước đó
- Người dùng có quyền truy cập vào email

**Main Flow:**
1. Người dùng truy cập trang đăng ký
2. Người dùng nhập địa chỉ email
3. Hệ thống xác thực định dạng email
4. Hệ thống kiểm tra email chưa tồn tại trong database
5. Hệ thống tạo mã OTP ngẫu nhiên (6 chữ số)
6. Hệ thống gửi email chứa mã OTP đến địa chỉ email đã nhập
7. Người dùng nhập mã OTP từ email
8. Hệ thống xác thực mã OTP và email khớp nhau
9. Hệ thống kiểm tra OTP chưa hết hạn (thời gian hợp lệ)
10. Người dùng nhập thông tin cá nhân (tên, mật khẩu, số điện thoại, v.v.)
11. Hệ thống xác thực tính hợp lệ của thông tin đã nhập
12. Hệ thống tạo tài khoản mới
13. Hệ thống gửi email chào mừng
14. Người dùng được chuyển đến trang đăng nhập hoặc tự động đăng nhập

**Postconditions:**
- Tài khoản mới được tạo và lưu trong database
- Email được đánh dấu là đã xác thực
- Người dùng có thể đăng nhập vào hệ thống

### 3.2. Use Case 2: Gửi lại mã OTP

**Actors:** Người dùng mới

**Preconditions:**
- Người dùng đã hoàn thành Bước 1 (nhập email)
- Người dùng chưa nhận được OTP hoặc OTP đã hết hạn

**Main Flow:**
1. Người dùng nhấn nút "Gửi lại OTP"
2. Hệ thống kiểm tra thời gian chờ giữa các lần gửi (cooldown)
3. Hệ thống vô hiệu hóa OTP cũ
4. Hệ thống tạo mã OTP mới
5. Hệ thống gửi email chứa mã OTP mới
6. Người dùng nhận email và tiếp tục quy trình

### 3.3. User Stories (Agile)

#### Story 1: Xác thực Email
```
As a new user
I want to verify my email address during signup
So that I can ensure my email is valid and I have access to it
```

**Acceptance Criteria:**
- Email input field validates format (RFC 5322 standard)
- System checks if email is already registered
- System sends OTP within 5 seconds of request
- User receives email with OTP code within 1 minute
- Clear error messages for invalid email format
- Clear success message after OTP is sent

#### Story 2: Xác nhận OTP
```
As a new user
I want to verify the OTP code sent to my email
So that I can prove I own the email address
```

**Acceptance Criteria:**
- OTP is 6 digits long
- OTP is valid for 10 minutes
- System validates OTP matches the one sent to email
- Maximum 3 failed attempts before requiring new OTP
- Clear error messages for invalid/expired OTP
- Option to resend OTP with 60-second cooldown

#### Story 3: Hoàn tất thông tin đăng ký
```
As a new user
I want to complete my profile information after email verification
So that I can create my account and start using the system
```

**Acceptance Criteria:**
- Form includes: Full Name, Password, Confirm Password, Phone (optional)
- Password meets security requirements (min 8 chars, uppercase, lowercase, number, special char)
- Phone number validation (if provided)
- All required fields are clearly marked
- Account is created only after successful form submission
- User receives confirmation email after successful signup

#### Story 4: Quản lý trạng thái đăng ký
```
As a new user
I want to see my progress through the signup process
So that I know which step I'm on and what's required next
```

**Acceptance Criteria:**
- Visual indicator shows current step (1/3, 2/3, 3/3)
- User can navigate back to previous steps if needed
- Session maintains state if page is refreshed
- Clear instructions for each step
- Time remaining for OTP expiration is displayed

---

## 4. Scenarios (Happy Path + Edge Cases)

### 4.1. Happy Path Scenarios

#### Scenario 1: Đăng ký thành công hoàn chỉnh
```
Given người dùng truy cập trang đăng ký
When người dùng nhập email "user@example.com"
And email chưa được đăng ký trước đó
And người dùng nhấn "Tiếp tục"
Then hệ thống gửi OTP đến "user@example.com"
And hiển thị màn hình nhập OTP

When người dùng nhập OTP chính xác "123456"
And OTP còn hạn (< 10 phút)
And người dùng nhấn "Xác nhận"
Then hệ thống xác thực thành công
And hiển thị form nhập thông tin

When người dùng nhập:
  | Field            | Value                |
  | Full Name        | Nguyễn Văn A         |
  | Password         | SecurePass123!       |
  | Confirm Password | SecurePass123!       |
  | Phone            | 0912345678           |
And người dùng nhấn "Đăng ký"
Then tài khoản được tạo thành công
And người dùng nhận email chào mừng
And người dùng được chuyển đến dashboard hoặc login
```

#### Scenario 2: Gửi lại OTP thành công
```
Given người dùng đã nhập email và đợi OTP
When người dùng không nhận được email sau 2 phút
And người dùng nhấn "Gửi lại OTP"
Then hệ thống gửi OTP mới
And thông báo "Mã OTP mới đã được gửi đến email"
And nút "Gửi lại OTP" bị vô hiệu hóa trong 60 giây
```

### 4.2. Edge Cases & Alternative Scenarios

#### Edge Case 1: Email đã tồn tại
```
Given người dùng truy cập trang đăng ký
When người dùng nhập email "existing@example.com"
And email đã được đăng ký trước đó
And người dùng nhấn "Tiếp tục"
Then hệ thống hiển thị lỗi "Email đã được đăng ký"
And hiển thị link "Đăng nhập" hoặc "Quên mật khẩu"
```

#### Edge Case 2: OTP không chính xác
```
Given người dùng đang ở bước nhập OTP
When người dùng nhập OTP sai "999999"
And người dùng nhấn "Xác nhận"
Then hệ thống hiển thị lỗi "Mã OTP không chính xác"
And số lần thử còn lại giảm xuống (2/3)
And người dùng có thể thử lại

When người dùng nhập sai 3 lần liên tiếp
Then hệ thống khóa OTP hiện tại
And yêu cầu người dùng gửi lại OTP mới
```

#### Edge Case 3: OTP hết hạn
```
Given người dùng đã nhận OTP
When đã quá 10 phút kể từ khi OTP được gửi
And người dùng nhập OTP "123456"
And người dùng nhấn "Xác nhận"
Then hệ thống hiển thị lỗi "Mã OTP đã hết hạn"
And hiển thị nút "Gửi lại OTP"
```

#### Edge Case 4: Email không hợp lệ
```
Given người dùng truy cập trang đăng ký
When người dùng nhập email không đúng định dạng
  Examples:
  | Invalid Email       |
  | invalid.email       |
  | @example.com        |
  | user@               |
  | user @example.com   |
And người dùng nhấn "Tiếp tục"
Then hệ thống hiển thị lỗi "Email không hợp lệ"
And không gửi request đến server
```

#### Edge Case 5: Mật khẩu không đủ mạnh
```
Given người dùng đang ở bước nhập thông tin
When người dùng nhập password "123456"
And password không đáp ứng yêu cầu bảo mật
Then hệ thống hiển thị lỗi real-time
And liệt kê các yêu cầu chưa đáp ứng:
  - Ít nhất 8 ký tự
  - Có chữ hoa
  - Có chữ thường
  - Có số
  - Có ký tự đặc biệt
```

#### Edge Case 6: Xác nhận mật khẩu không khớp
```
Given người dùng đang ở bước nhập thông tin
When người dùng nhập:
  | Password         | SecurePass123!  |
  | Confirm Password | SecurePass456!  |
Then hệ thống hiển thị lỗi "Mật khẩu xác nhận không khớp"
And nút "Đăng ký" bị vô hiệu hóa
```

#### Edge Case 7: Session timeout
```
Given người dùng đang ở bước 2 hoặc 3
When session hết hạn (30 phút không hoạt động)
And người dùng thực hiện hành động
Then hệ thống hiển thị thông báo "Phiên làm việc đã hết hạn"
And đưa người dùng về bước 1
And yêu cầu bắt đầu lại quy trình
```

#### Edge Case 8: Gửi lại OTP quá nhiều lần
```
Given người dùng đã yêu cầu gửi lại OTP
When người dùng gửi lại OTP lần thứ 5 trong 1 giờ
Then hệ thống hiển thị lỗi "Bạn đã vượt quá số lần gửi OTP cho phép"
And khóa chức năng gửi OTP trong 1 giờ
And đề xuất liên hệ support nếu cần
```

#### Edge Case 9: Service gửi email lỗi
```
Given hệ thống email service gặp sự cố
When người dùng nhập email và nhấn "Tiếp tục"
And hệ thống không thể gửi OTP
Then hệ thống hiển thị lỗi "Không thể gửi email. Vui lòng thử lại sau."
And log lỗi vào monitoring system
And retry gửi email tự động (max 3 lần)
```

#### Edge Case 10: Network timeout
```
Given người dùng đang thực hiện bất kỳ bước nào
When request bị timeout (> 30 giây)
Then hệ thống hiển thị thông báo "Kết nối bị gián đoạn"
And giữ nguyên dữ liệu đã nhập
And cho phép người dùng thử lại
```

---

## 5. Non-Functional Requirements

### 5.1. Security Requirements

#### 5.1.1. OTP Security
- **OTP Generation:**
  - Sử dụng thuật toán tạo số ngẫu nhiên an toàn (CSPRNG - Cryptographically Secure Pseudo-Random Number Generator)
  - Độ dài OTP: 6 chữ số
  - Mỗi OTP chỉ sử dụng được 1 lần (one-time use)
  - OTP hết hạn sau 10 phút kể từ khi tạo

- **OTP Storage:**
  - OTP được hash trước khi lưu vào database (bcrypt/argon2)
  - Lưu kèm timestamp tạo và email tương ứng
  - OTP bị vô hiệu hóa sau khi sử dụng hoặc hết hạn
  - Tự động xóa OTP đã hết hạn khỏi database (cleanup job)

- **OTP Validation:**
  - Maximum 3 lần thử sai cho mỗi OTP
  - Sau 3 lần thử sai, OTP bị khóa và yêu cầu gửi lại
  - Rate limiting cho endpoint xác thực OTP

#### 5.1.2. Password Security
- **Password Requirements:**
  - Độ dài tối thiểu: 8 ký tự
  - Chứa ít nhất 1 chữ hoa
  - Chứa ít nhất 1 chữ thường
  - Chứa ít nhất 1 chữ số
  - Chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*)
  - Không chứa khoảng trắng
  - Không trùng với email hoặc tên người dùng

- **Password Storage:**
  - Hash bằng bcrypt với cost factor >= 12
  - Không lưu trữ plain text password ở bất kỳ đâu
  - Không log password trong logs/error messages

#### 5.1.3. Session & Token Management
- **Session Security:**
  - Session ID được tạo random và secure
  - Session có thời gian tồn tại tối đa 30 phút cho quy trình đăng ký
  - Session chỉ lưu trữ data tối thiểu (email, step, OTP verified status)
  - Session bị xóa sau khi hoàn tất đăng ký hoặc timeout

- **CSRF Protection:**
  - Sử dụng CSRF token cho tất cả POST/PUT/DELETE requests
  - CSRF token được tạo mới cho mỗi session

#### 5.1.4. Data Protection
- **Email Protection:**
  - Email được lưu trữ dạng lowercase để tránh duplicate
  - Email được trim khoảng trắng thừa
  - Validate email format theo RFC 5322 standard

- **PII (Personally Identifiable Information):**
  - Encrypt sensitive data at rest
  - Sử dụng HTTPS cho tất cả communication
  - Không log thông tin nhạy cảm (OTP, password, v.v.)

#### 5.1.5. Input Validation & Sanitization
- **Server-side Validation:**
  - Validate tất cả input từ client
  - Sanitize input để tránh XSS attacks
  - Validate data type, length, format
  - Reject requests với invalid/malicious data

- **SQL Injection Prevention:**
  - Sử dụng parameterized queries/prepared statements
  - Không concatenate user input vào SQL queries
  - Sử dụng ORM với built-in protection

### 5.2. Performance Requirements

#### 5.2.1. Response Time
- **API Response Times:**
  - Email validation: < 500ms
  - OTP generation & sending: < 5 seconds
  - OTP verification: < 300ms
  - Account creation: < 1 second
  - Resend OTP: < 3 seconds

- **Email Delivery:**
  - OTP email phải được gửi trong vòng 1 phút
  - Welcome email phải được gửi trong vòng 2 phút

#### 5.2.2. Scalability
- **Concurrent Users:**
  - Hỗ trợ tối thiểu 100 đăng ký đồng thời
  - Hệ thống phải scale được khi tăng user (horizontal scaling)

- **Database Performance:**
  - Index trên email field cho fast lookup
  - Index trên OTP creation timestamp cho cleanup
  - Optimize queries để tránh N+1 problem

#### 5.2.3. System Resources
- **Memory Usage:**
  - Session data không quá 1KB per user
  - OTP records tự động cleanup sau expiration

- **Database Connections:**
  - Connection pooling để tối ưu database connections
  - Maximum connection time: 30 seconds

### 5.3. Rate Limiting

#### 5.3.1. Email/OTP Request Rate Limiting
- **Per IP Address:**
  - Maximum 5 OTP requests per hour
  - Maximum 10 signup attempts per day
  - Block IP sau khi vượt threshold trong 24 giờ

- **Per Email Address:**
  - Maximum 3 OTP requests per hour
  - Maximum 5 OTP requests per day
  - Cooldown 60 giây giữa mỗi lần gửi OTP

#### 5.3.2. OTP Verification Rate Limiting
- **Per Session:**
  - Maximum 3 failed attempts per OTP
  - Maximum 10 verification attempts per session
  - Lock session sau khi vượt threshold

- **Per IP Address:**
  - Maximum 20 OTP verification attempts per hour
  - Temporary block (1 hour) sau khi vượt threshold

#### 5.3.3. Account Creation Rate Limiting
- **Per IP Address:**
  - Maximum 3 successful signups per day
  - Maximum 10 signup attempts per day

#### 5.3.4. API Endpoint Rate Limiting
```
POST /api/auth/signup/send-otp
  - 5 requests per hour per IP
  - 3 requests per hour per email

POST /api/auth/signup/verify-otp
  - 10 requests per hour per IP
  - 3 requests per session

POST /api/auth/signup/complete
  - 5 requests per hour per IP
  - 1 successful request per session

POST /api/auth/signup/resend-otp
  - 3 requests per hour per email
  - 60 second cooldown between requests
```

#### 5.3.5. Rate Limiting Response
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Bạn đã vượt quá số lần thử cho phép",
  "retryAfter": 3600,
  "details": {
    "limit": 5,
    "remaining": 0,
    "resetAt": "2024-11-04T21:00:00Z"
  }
}
```

### 5.4. Availability & Reliability

#### 5.4.1. Uptime
- Target uptime: 99.9% (< 43 phút downtime/tháng)
- Scheduled maintenance window: Thứ 7, 2-4 AM

#### 5.4.2. Error Handling
- Graceful degradation khi service dependencies fail
- Retry mechanism cho external services (email)
- Comprehensive error logging và monitoring
- User-friendly error messages (không expose technical details)

#### 5.4.3. Data Integrity
- Transaction support để đảm bảo data consistency
- Rollback mechanism khi có lỗi
- Audit log cho tất cả signup attempts

### 5.5. Monitoring & Alerting

#### 5.5.1. Metrics to Track
- Signup conversion rate (by step)
- OTP delivery success rate
- Email delivery time
- API response times
- Failed signup attempts
- Rate limit violations
- Error rates by type

#### 5.5.2. Alerts
- Email service failures
- Database connection issues
- High error rates (> 5%)
- Unusual spike in failed attempts (potential attack)
- Rate limit threshold reached frequently

### 5.6. Compliance

#### 5.6.1. Data Privacy
- Tuân thủ GDPR (nếu có users từ EU)
- Cho phép users xóa tài khoản và data
- Privacy policy rõ ràng về cách sử dụng email

#### 5.6.2. Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible
- Clear error messages

---

## 6. Technical Specifications

### 6.1. API Endpoints

#### 6.1.1. Send OTP
```
POST /api/auth/signup/send-otp

Request Body:
{
  "email": "user@example.com"
}

Success Response (200):
{
  "success": true,
  "message": "Mã OTP đã được gửi đến email",
  "sessionId": "abc123...",
  "expiresIn": 600
}

Error Responses:
400 - Invalid email format
409 - Email already exists
429 - Rate limit exceeded
500 - Internal server error
```

#### 6.1.2. Verify OTP
```
POST /api/auth/signup/verify-otp

Request Body:
{
  "email": "user@example.com",
  "otp": "123456",
  "sessionId": "abc123..."
}

Success Response (200):
{
  "success": true,
  "message": "Xác thực thành công",
  "token": "xyz789..."
}

Error Responses:
400 - Invalid OTP
401 - OTP expired
403 - Too many failed attempts
404 - Session not found
429 - Rate limit exceeded
```

#### 6.1.3. Complete Signup
```
POST /api/auth/signup/complete

Request Body:
{
  "email": "user@example.com",
  "token": "xyz789...",
  "fullName": "Nguyễn Văn A",
  "password": "SecurePass123!",
  "phone": "0912345678"
}

Success Response (201):
{
  "success": true,
  "message": "Đăng ký thành công",
  "userId": "user_123",
  "email": "user@example.com"
}

Error Responses:
400 - Invalid input data
401 - Invalid token
409 - Email already registered
429 - Rate limit exceeded
```

#### 6.1.4. Resend OTP
```
POST /api/auth/signup/resend-otp

Request Body:
{
  "email": "user@example.com",
  "sessionId": "abc123..."
}

Success Response (200):
{
  "success": true,
  "message": "Mã OTP mới đã được gửi",
  "expiresIn": 600,
  "retryAfter": 60
}

Error Responses:
400 - Invalid request
404 - Session not found
429 - Too many requests
```

### 6.2. Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- OTP Verification Table
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  ip_address VARCHAR(45)
);

-- Signup Attempts (for rate limiting & analytics)
CREATE TABLE signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  ip_address VARCHAR(45) NOT NULL,
  step VARCHAR(50) NOT NULL,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_otp_email ON otp_verifications(email);
CREATE INDEX idx_otp_session ON otp_verifications(session_id);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX idx_attempts_ip ON signup_attempts(ip_address, created_at);
CREATE INDEX idx_attempts_email ON signup_attempts(email, created_at);
```

---

## 7. Dependencies & Assumptions

### 7.1. Dependencies
- Email service provider (SendGrid, AWS SES, hoặc tương tự)
- Database (PostgreSQL)
- Redis (cho session & rate limiting)
- Authentication library (bcrypt)

### 7.2. Assumptions
- Người dùng có quyền truy cập email của họ
- Email service có uptime cao (> 99%)
- Người dùng sử dụng trình duyệt hiện đại (ES6+ support)
- Người dùng có kết nối internet ổn định

---

## 8. Future Enhancements

- Thêm xác thực 2 yếu tố (2FA) bằng SMS
- Social login (Google, Facebook)
- Captcha/reCAPTCHA cho bước đầu tiên
- Email verification link như alternative cho OTP
- Progressive disclosure trong form (hiển thị từng field một)
- Save and resume signup later
- Passwordless authentication option

---

**Document Version:** 1.0
**Last Updated:** 2024-11-04
**Author:** Development Team
**Status:** Draft
