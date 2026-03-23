# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Signup là quy trình đăng ký 3 bước: nhập email → xác thực OTP → điền thông tin cá nhân. Server sử dụng Express + MongoDB (Mongoose) + Redis. OTP được hash và lưu trong Redis với TTL. Sau khi verify OTP thành công, một session token được tạo để liên kết bước verify với bước hoàn tất đăng ký. Client sử dụng Next.js App Router với multi-step navigation qua các route riêng biệt, truyền email qua URL search params.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client (Next.js)                          Server (Express)
┌─────────────────────┐                   ┌──────────────────────────────────┐
│ /signup              │                   │                                  │
│   EmailStepForm      │──POST /send-otp─▶│  Rate Limiter (IP + email)       │
│                      │                   │    ↓                             │
│ /signup/otp          │                   │  Validation (Joi)                │
│   OtpStepForm        │──POST /verify-otp▶│    ↓                             │
│                      │                   │  SignupController                │
│ /signup/info         │                   │    ↓                             │
│   InfoStepForm       │──POST /complete──▶│  SignupService                   │
│                      │                   │    ├── OtpSignupRepo (Redis)     │
│                      │                   │    ├── SessionSignupRepo (Redis) │
│                      │                   │    ├── AuthRepository (MongoDB)  │
│                      │                   │    ├── UserRepository (MongoDB)  │
│                      │                   │    └── SendEmailService          │
└──────────────────────┘                   └──────────────────────────────────┘
```

---

## 3.3. Data Model

### Collection: `auths` (record mới khi signup hoàn tất)

```typescript
{
  email:              String,    // unique, lowercase, required
  password:           String,    // bcrypt hashed (salt rounds: 10)
  verifiedEmail:      true,      // set true vì đã verify qua OTP
  roles:              "user",    // mặc định
  isActive:           true,      // mặc định
  mustChangePassword: false,     // mặc định
  createdAt:          Date,
  updatedAt:          Date
}
```

### Collection: `users` (record mới khi signup hoàn tất)

```typescript
{
  authId:       ObjectId,    // ref: auths
  fullName:     String,
  gender:       String,      // "male" | "female" | "other"
  dateOfBirth:  Date,
  createdAt:    Date,
  updatedAt:    Date
}
```

### Redis Keys

```
signup-otp:{email}                  → OTP hash + metadata (TTL: 5 phút)
signup-otp-cooldown:{email}         → cooldown flag (TTL: 60 giây)
signup-otp-failed-attempts:{email}  → số lần nhập sai (TTL: 15 phút)
signup-otp-resend-count:{email}     → số lần gửi lại (TTL: 1 giờ)
signup-session:{email}              → session token hash (TTL: 30 phút)
```

---

## 3.4. API Design

### Endpoint 1: Send OTP

```
POST /api/v1/auth/signup/send-otp

Request Body:
{
  "email": "string — email muốn đăng ký"
}

Response 200:
{
  "message": "OTP code has been sent to your email",
  "data": {
    "success": true,
    "expiresIn": 300,
    "cooldownSeconds": 60
  }
}

Response 409: Email đã được đăng ký
Response 429: Rate limit exceeded
```

### Endpoint 2: Verify OTP

```
POST /api/v1/auth/signup/verify-otp

Request Body:
{
  "email": "string",
  "otp": "string — 6 chữ số"
}

Response 200:
{
  "message": "OTP code has been verified",
  "data": {
    "success": true,
    "sessionToken": "string — 64 hex chars",
    "expiresIn": 300
  }
}

Response 400: OTP sai hoặc hết hạn (kèm remaining attempts)
Response 403: Bị lockout do nhập sai quá 5 lần
```

### Endpoint 3: Resend OTP

```
POST /api/v1/auth/signup/resend-otp

Request Body:
{
  "email": "string"
}

Response 200:
{
  "message": "OTP code has been resent to your email",
  "data": {
    "success": true,
    "expiresIn": 300,
    "cooldownSeconds": 60,
    "resendCount": 1,
    "maxResends": 5,
    "remainingResends": 4
  }
}

Response 400: Cooldown chưa hết / đạt max resend
Response 409: Email đã được đăng ký
Response 429: Rate limit exceeded
```

### Endpoint 4: Complete Signup

```
POST /api/v1/auth/signup/complete

Request Body:
{
  "email": "string",
  "sessionToken": "string — 64 hex chars từ verify OTP",
  "password": "string — 8-100 ký tự, chứa chữ hoa + thường + số",
  "confirmPassword": "string — phải khớp password",
  "fullName": "string — tối thiểu 2 ký tự",
  "gender": "male | female | other",
  "dateOfBirth": "string — YYYY-MM-DD",
  "acceptTerms": true
}

Response 200:
{
  "message": "Account created successfully",
  "data": {
    "success": true,
    "user": {
      "id": "string",
      "email": "string",
      "fullName": "string"
    },
    "tokens": {
      "accessToken": "string — JWT",
      "refreshToken": "string — JWT",
      "expiresIn": 900
    }
  }
}

Response 400: Session token không hợp lệ / hết hạn / validation error
Response 409: Email đã được đăng ký (race condition)
```

### Endpoint 5: Check Email Availability

```
GET /api/v1/auth/signup/check-email/:email

Response 200:
{
  "data": {
    "available": true | false
  }
}

Response 400: Email format không hợp lệ
Response 429: Rate limit exceeded (10/IP/phút)
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Quy trình đăng ký hoàn chỉnh

```
BƯỚC 1: GỬI OTP
1. User nhập email → Client validate format (Zod)
2. Client gửi POST /send-otp { email }
3. Server: Rate limiter check (5/IP/15min, 3/email/15min)
4. Server: Joi validate email format
5. Server: Kiểm tra email đã tồn tại chưa (MongoDB: auths.emailExists)
6. Server: Kiểm tra cooldown (Redis: signup-otp-cooldown:{email})
7. Server: Generate OTP 6 chữ số → hash → lưu Redis (TTL 5 phút)
8. Server: Set cooldown (Redis TTL 60 giây)
9. Server: Gửi email chứa OTP (React Email template)
10. Client: Navigate đến /signup/otp?email={email}

BƯỚC 2: VERIFY OTP
11. User nhập 6 chữ số → Client auto-submit khi đủ
12. Client gửi POST /verify-otp { email, otp }
13. Server: Kiểm tra lockout (Redis: signup-otp-failed-attempts, max 5)
14. Server: Lấy OTP hash từ Redis → compare
15. Nếu sai → tăng failed attempts → trả lỗi kèm remaining attempts
16. Nếu đúng → sinh session token (crypto.randomBytes(32) → hex)
17. Server: Lưu session token hash vào Redis (TTL 30 phút)
18. Server: Cleanup OTP data (xóa OTP, cooldown, failed attempts, resend count)
19. Client: Nhận sessionToken → navigate đến /signup/info?email={email}

BƯỚC 3: HOÀN TẤT ĐĂNG KÝ
20. User điền fullName, gender, birthday, password, confirmPassword
21. User tick acceptTerms → submit
22. Client gửi POST /complete { email, sessionToken, password, confirmPassword,
                                 fullName, gender, dateOfBirth, acceptTerms }
23. Server: Joi validate toàn bộ input
24. Server: Verify session token (Redis: signup-session:{email})
25. Server: Kiểm tra email còn available (tránh race condition)
26. Server: Hash password (bcrypt, salt rounds 10)
27. Server: Tạo auth record (MongoDB: auths) với verifiedEmail=true
28. Server: Tạo user record (MongoDB: users) với authId reference
29. Server: generateAuthTokensResponse({ userId, authId, email, roles: 'user', fullName, avatar: null })
    (fullName từ req.body, avatar: null vì user mới chưa có avatar)
30. Server: Cleanup session data (Redis)
31. Server: Trả về user info + tokens
32. Client: Lưu tokens → redirect vào app
```

---

## 3.6. Cấu trúc file (File Structure)

### Server

```
server/src/
├── modules/signup/
│   ├── signup.module.ts                  # DI setup, export router & service
│   ├── signup.controller.ts              # Route handlers + rate limiting
│   ├── signup.service.ts                 # Business logic (5 methods)
│   ├── repositories/
│   │   ├── otp-signup.repository.ts      # Redis: OTP CRUD + cooldown + lockout
│   │   └── session-signup.repository.ts  # Redis: session token CRUD
│   └── swagger/
│       ├── index.ts                      # Swagger doc export
│       ├── paths.ts                      # OpenAPI paths
│       └── schemas.ts                    # OpenAPI schemas
├── models/
│   ├── authentication.ts                 # Mongoose schema: auths
│   └── user.ts                           # Mongoose schema: users
├── repositories/
│   ├── authentication.repository.ts      # Auth CRUD
│   └── user.repository.ts                # User CRUD
├── validators/schemas/
│   └── signup.ts                         # Joi schemas (5 schemas)
├── types/modules/
│   └── signup.ts                         # TypeScript interfaces
├── i18n/locales/
│   ├── en/signup.json                    # English messages
│   └── vi/signup.json                    # Vietnamese messages
├── modules/send-email/
│   └── templates/signup-otp.tsx          # React Email OTP template
└── constants/
    └── config.ts                         # OTP config, rate limit config
```

### Client

```
client/src/
├── app/[locale]/(authen)/signup/
│   ├── page.tsx                          # Bước 1: Email
│   ├── otp/page.tsx                      # Bước 2: OTP
│   └── info/page.tsx                     # Bước 3: Thông tin
├── views/
│   ├── Signup/
│   │   ├── index.tsx                     # Email step view wrapper
│   │   ├── mains/EmailStepForm/index.tsx # Email form logic
│   │   └── components/
│   │       ├── EmailInput/               # Email input field
│   │       ├── LoginLink/                # "Đã có tài khoản? Đăng nhập"
│   │       └── NextButton/               # Nút tiếp tục
│   ├── SignupOtp/
│   │   ├── index.tsx                     # OTP step view wrapper
│   │   ├── mains/OtpStepForm/index.tsx   # OTP form logic
│   │   └── components/
│   │       ├── BackButton/               # Quay lại đổi email
│   │       └── OtpInstruction/           # Hướng dẫn nhập OTP
│   └── SignupInfo/
│       ├── index.tsx                     # Info step view wrapper
│       ├── mains/InfoStepForm/index.tsx  # Info form logic
│       └── components/
│           ├── FullNameInput/            # Họ tên
│           ├── GenderSelect/             # Giới tính dropdown
│           ├── BirthdayInput/            # Date picker
│           ├── BackButton/               # Quay lại
│           └── SubmitButton/             # Tạo tài khoản
├── forms/Signup/
│   ├── index.ts                          # Form props + zodResolver
│   ├── data.ts                           # Default values
│   └── validations.ts                    # Zod schemas
├── types/Signup/index.ts                 # Form type definitions
├── constants/
│   ├── fieldNames/Signup.ts              # Field name constants
│   └── routes.ts                         # Route path constants
└── locales/
    ├── en/signup.json                    # English
    └── vi/signup.json                    # Vietnamese
```

---

## 3.7. Dependencies & Integrations

| Dependency         | Loại     | Mô tả                                       | Ghi chú                        |
| ------------------ | -------- | -------------------------------------------- | ------------------------------ |
| MongoDB            | Internal | Lưu auth + user records                      | Mongoose ODM                   |
| Redis              | Internal | OTP, session, cooldown, lockout, resend count | ioredis client                 |
| Email Service      | External | Gửi OTP qua email                            | React Email template           |
| bcrypt             | Library  | Hash password                                | Salt rounds: 10                |
| crypto             | Library  | Sinh session token (randomBytes)             | Node.js built-in               |
| jsonwebtoken       | Library  | Generate JWT tokens sau signup               | 3 secrets (access, refresh, id)|
| Joi                | Library  | Server-side validation (5 schemas)           | validators/schemas/signup.ts   |
| Zod                | Library  | Client-side form validation                  | Tích hợp React Hook Form       |
| next-intl          | Library  | Internationalization cho client              | Vi + En                        |
| express-rate-limit | Library  | Rate limiting middleware                     | Per-IP và per-email             |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng. Feature signup là core functionality.

**Rollback plan:**
- Server: Revert deployment
- Redis data (OTP, session): Tự hết hạn theo TTL, không cần cleanup
- MongoDB: Collection `auths` và `users` đã có sẵn từ trước, signup chỉ thêm record mới
- Nếu cần xóa tài khoản đã tạo: cần script riêng xóa cả auth + user record
