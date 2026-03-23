# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Login cung cấp 3 phương thức đăng nhập: password, OTP, và magic link. Server sử dụng Express + MongoDB (Mongoose) + Redis. Client sử dụng Next.js App Router với multi-step form (email → chọn phương thức → xác thực). JWT được dùng để quản lý phiên đăng nhập với 3 loại token (access, refresh, id). Redis quản lý OTP, magic link token, rate limiting, failed attempts, và lockout state.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client (Next.js)                          Server (Express)
┌─────────────────────┐                   ┌─────────────────────────────────┐
│ /login              │                   │                                 │
│   EmailStepForm     │──POST /login───▶  │  Rate Limiter                   │
│                     │                   │    ↓                            │
│ /login/password     │                   │  Validation (Joi)               │
│   PasswordStepForm  │                   │    ↓                            │
│                     │                   │  LoginController                │
│ /login/otp          │                   │    ↓                            │
│   OtpStepForm       │                   │  LoginService                   │
│                     │                   │    ├── AuthRepository (MongoDB) │
│ /login/magic-link   │                   │    ├── UserRepository (MongoDB) │
│   MagicLinkForm     │                   │    ├── OtpLoginRepo (Redis)     │
│                     │                   │    ├── MagicLinkRepo (Redis)    │
│                     │                   │    ├── FailedAttemptsRepo(Redis)│
│ /login/alternative  │                   │    └── LoginHistoryService      │
│   AlternativeMethods│                   │          ↓                      │
└─────────────────────┘                   │    LoginHistory (MongoDB)       │
                                          └─────────────────────────────────┘
```

---

## 3.3. Data Model

### Collection: `auths`

```typescript
{
  email:              String,    // unique, required, regex validated
  password:           String,    // bcrypt hashed
  verifiedEmail:      Boolean,   // must be true to login
  roles:              String,    // enum: 'user' | 'admin'
  isActive:           Boolean,   // account status
  tempPasswordHash:   String,    // temporary password for reset
  tempPasswordExpAt:  Date,      // temp password expiry
  tempPasswordUsed:   Boolean,   // temp password used flag
  mustChangePassword: Boolean,   // force password change
  createdAt:          Date,
  updatedAt:          Date
}
```

### Collection: `login_histories`

```typescript
{
  userId:          ObjectId,     // ref: auths
  emailAttempted:  String,
  loginMethod:     String,       // 'password' | 'otp' | 'magic-link'
  status:          String,       // 'success' | 'failed'
  failureReason:   String,       // nullable
  ipAddress:       String,
  geo: {
    country:       String,
    city:          String
  },
  deviceType:      String,       // 'desktop' | 'mobile' | 'tablet'
  os:              String,
  browser:         String,
  userAgent:       String,
  clientType:      String,       // 'web' | 'ios' | 'android'
  timezoneOffset:  Number,
  anomaly: {
    isNewDevice:   Boolean,
    isNewLocation: Boolean,
    isNewIp:       Boolean
  },
  createdAt:       Date          // TTL index: 90 ngày
}
```

### Redis Keys

```
otp-login:{email}                → OTP hash + metadata (TTL: 5 phút)
otp-login-cooldown:{email}       → cooldown flag (TTL: 60 giây)
otp-login-failed-attempts:{email}→ số lần nhập sai (TTL: 15 phút)
otp-login-resend-count:{email}   → số lần gửi lại (TTL: 5 phút)

magic-link-login:{email}         → token hash + metadata (TTL: 15 phút)
magic-link-login-cooldown:{email}→ cooldown flag (TTL: 60 giây)

login-failed-attempts:{email}    → số lần nhập sai mật khẩu (TTL: 30 phút)
login-lockout:{email}            → lockout flag (TTL: dynamic)
```

---

## 3.4. API Design

### Endpoint 1: Password Login

```
POST /api/v1/auth/login

Headers:
  Content-Type: application/json

Request Body:
{
  "email": "string — email đã đăng ký",
  "password": "string — mật khẩu (8-100 ký tự)"
}

Response 200:
{
  "accessToken": "string — JWT access token (8h)",
  "refreshToken": "string — JWT refresh token (7d)",
  "idToken": "string — JWT id token (8h)",
  "expiresIn": "number — thời gian hết hạn (seconds)"
}

Response 400: Validation error (email/password format)
Response 401: Email hoặc mật khẩu không đúng
Response 403: Tài khoản bị khóa / chưa verify email / bị deactivate
Response 429: Rate limit exceeded
```

### Endpoint 2: Send OTP

```
POST /api/v1/auth/login/otp/send

Request Body:
{
  "email": "string — email đã đăng ký"
}

Response 200:
{
  "message": "OTP đã được gửi",
  "expiresIn": 300
}

Response 400: Email format không hợp lệ
Response 403: Tài khoản không active / cooldown chưa hết
Response 429: Rate limit exceeded
```

### Endpoint 3: Verify OTP

```
POST /api/v1/auth/login/otp/verify

Request Body:
{
  "email": "string",
  "otp": "string — 6 chữ số"
}

Response 200:
{
  "accessToken": "string",
  "refreshToken": "string",
  "idToken": "string",
  "expiresIn": "number"
}

Response 400: OTP format không hợp lệ
Response 401: OTP sai hoặc hết hạn
Response 403: Bị lockout do nhập sai quá nhiều
Response 429: Rate limit exceeded
```

### Endpoint 4: Send Magic Link

```
POST /api/v1/auth/login/magic-link/send

Request Body:
{
  "email": "string"
}

Response 200:
{
  "message": "Magic link đã được gửi",
  "expiresIn": 900
}

Response 400: Email format không hợp lệ
Response 403: Cooldown chưa hết / đạt max resend
Response 429: Rate limit exceeded
```

### Endpoint 5: Verify Magic Link

```
POST /api/v1/auth/login/magic-link/verify

Request Body:
{
  "email": "string",
  "token": "string — hex 128 ký tự"
}

Response 200:
{
  "accessToken": "string",
  "refreshToken": "string",
  "idToken": "string",
  "expiresIn": "number"
}

Response 400: Token format không hợp lệ
Response 401: Token sai, hết hạn, hoặc đã sử dụng
Response 429: Rate limit exceeded
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Password Login Flow

```
1. User nhập email → Client validate format → navigate đến /login/password
2. User nhập password → Client validate (8-100 ký tự)
3. Client gửi POST /api/v1/auth/login { email, password }
4. Server: Rate limiter kiểm tra IP limit (30 req/15min)
5. Server: Joi validate input
6. Server: Kiểm tra account bị lockout không (Redis: login-lockout:{email})
7. Server: Tìm user theo email (MongoDB: auths collection)
8. Server: Kiểm tra isActive, verifiedEmail
9. Server: bcrypt.compare(password, hashedPassword)
10. Nếu sai → tăng failed attempts, tính lockout duration nếu vượt ngưỡng
11. Nếu đúng → reset failed attempts
12. userRepo.findByAuthId(authId) → { fullName, avatar }
13. generateAuthTokens(userId, authId, email, roles, fullName, avatar)
14. Server: Ghi login history (async, non-blocking)
15. Server: Trả về { accessToken, refreshToken, idToken, expiresIn }
16. Client: Lưu tokens → redirect vào app
```

### OTP Login Flow

```
1. User chọn phương thức OTP → Client gửi POST /otp/send { email }
2. Server: Kiểm tra cooldown (60s) và resend count (max 3)
3. Server: Generate 6 chữ số ngẫu nhiên → hash → lưu Redis (TTL 5 phút)
4. Server: Gửi email chứa OTP
5. User nhập 6 chữ số → Client auto-submit khi đủ 6 số
6. Client gửi POST /otp/verify { email, otp }
7. Server: Lấy OTP hash từ Redis → compare
8. Nếu sai → tăng failed attempts (max 5 → lockout 15 phút)
9. Nếu đúng → xóa OTP khỏi Redis
10. userRepo.findByAuthId(authId) → { fullName, avatar }
11. generateAuthTokens(userId, authId, email, roles, fullName, avatar)
12. Ghi login history → trả tokens
```

### Magic Link Login Flow

```
1. User chọn phương thức magic link → Client gửi POST /magic-link/send { email }
2. Server: Kiểm tra cooldown (60s) và resend count (max 3)
3. Server: Generate 64 bytes random → hex encode → hash → lưu Redis (TTL 15 phút)
4. Server: Gửi email chứa link: {CLIENT_URL}/login/verify-magic-link?token={hex}&email={email}
5. User click link trong email → Browser mở trang verify
6. Client gửi POST /magic-link/verify { email, token }
7. Server: Lấy token hash từ Redis → compare
8. Nếu đúng → xóa token khỏi Redis (single-use)
9. userRepo.findByAuthId(authId) → { fullName, avatar }
10. generateAuthTokens(userId, authId, email, roles, fullName, avatar)
11. Ghi login history → trả tokens
```

---

## 3.6. Cấu trúc file (File Structure)

### Server

```
server/src/
├── modules/login/
│   ├── login.module.ts              # DI setup, export router & service
│   ├── login.controller.ts          # Route handlers + rate limiting
│   ├── login.service.ts             # Business logic (password, OTP, magic link)
│   ├── repositories/
│   │   ├── otp-login.repository.ts       # Redis: OTP CRUD
│   │   ├── magic-link-login.repository.ts # Redis: magic link CRUD
│   │   └── failed-attempts.repository.ts  # Redis: lockout management
│   └── swagger/
│       ├── index.ts                      # Swagger export
│       ├── paths.ts                      # OpenAPI paths
│       └── schemas.ts                    # OpenAPI schemas
├── modules/login-history/
│   ├── login-history.module.ts
│   └── login-history.service.ts     # Ghi và query lịch sử
├── models/
│   ├── authentication.ts            # Mongoose schema: auths
│   └── login-history.ts             # Mongoose schema: login_histories
├── repositories/
│   └── authentication.repository.ts # Auth CRUD operations
├── middlewares/
│   └── auth.guard.ts                # JWT authenticate middleware
├── utils/token/
│   ├── jwt.ts                       # Token generate & verify
│   └── auth-response.ts             # Format token response
├── validators/schemas/
│   └── login.ts                     # Joi validation schemas
└── constants/
    └── config.ts                    # Login config (timeouts, limits)
```

### Client

```
client/src/
├── app/[locale]/(authen)/
│   ├── layout.tsx                   # Auth layout wrapper
│   └── login/
│       ├── page.tsx                 # Step 1: Email input
│       ├── password/page.tsx        # Step 2a: Password input
│       ├── otp/page.tsx             # Step 2b: OTP input
│       ├── magic-link/page.tsx      # Step 2c: Magic link waiting
│       └── alternative/page.tsx     # Chọn phương thức khác
├── views/
│   ├── Login/mains/EmailStepForm/         # Email step form component
│   ├── LoginPassword/mains/PasswordStepForm/  # Password form component
│   ├── LoginOtp/mains/OtpStepForm/            # OTP form component
│   ├── LoginMagicLink/mains/MagicLinkForm/    # Magic link component
│   └── LoginAlternative/mains/AlternativeOptions/  # Alt methods component
├── forms/Login/
│   ├── index.ts                     # Form props + zodResolver
│   ├── data.ts                      # Default values
│   └── validations.ts              # Zod schemas (email, password)
├── dataSources/Login/
│   └── index.ts                    # API call functions (login endpoints)
├── hooks/
│   ├── useCountdown.ts             # Countdown timer cho resend
│   ├── useApiQuery.ts              # API request hook
│   └── useFieldProps.ts            # Field props helper
├── libs/
│   └── axios.ts                    # Axios instance + interceptors
├── constants/
│   ├── login.ts                    # Login-specific constants
│   ├── fieldNames/Login.ts         # Field name constants
│   └── routes.ts                   # Route path constants
├── locales/
│   ├── en/login.json               # English translations
│   └── vi/login.json               # Vietnamese translations
└── types/Login/
    └── index.ts                    # Form type definitions
```

---

## 3.7. Dependencies & Integrations

| Dependency     | Loại     | Mô tả                                           | Ghi chú                                    |
| -------------- | -------- | ------------------------------------------------ | ------------------------------------------ |
| MongoDB        | Internal | Lưu trữ auth records và login history            | Mongoose ODM                               |
| Redis          | Internal | OTP, magic link, rate limiting, lockout state     | ioredis client                             |
| Email Service  | External | Gửi OTP và magic link qua email                  | Chưa xác định provider cụ thể              |
| bcrypt         | Library  | Hash và verify mật khẩu                           | Salt rounds: 10                            |
| jsonwebtoken   | Library  | Generate và verify JWT tokens                     | 3 secrets riêng biệt                       |
| Joi            | Library  | Server-side input validation                      | Schemas trong validators/schemas/           |
| Zod            | Library  | Client-side form validation                       | Tích hợp với React Hook Form               |
| next-intl      | Library  | Internationalization cho client                   | Vi + En                                    |
| express-rate-limit | Library | Rate limiting middleware                      | Per-IP và per-email                        |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng. Feature login là core functionality.

**Rollback plan:**
- Server: Revert deployment, tokens đã phát hành vẫn valid cho đến khi hết hạn
- Redis data (OTP, magic link): Tự hết hạn theo TTL, không cần cleanup
- MongoDB: Không có migration phá hủy, chỉ tạo collection mới
