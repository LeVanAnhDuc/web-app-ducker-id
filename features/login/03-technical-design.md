# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Login cung cấp 3 phương thức đăng nhập: password, OTP, và magic link. Server sử dụng Express + MongoDB (Mongoose) + Redis. Client sử dụng Next.js App Router với multi-step form (email → chọn phương thức → xác thực). JWT được dùng để quản lý phiên đăng nhập với 3 loại token (access, refresh, id). Refresh token được set vào HTTP-only cookie. Redis quản lý OTP, magic link token, rate limiting, failed attempts, và lockout state. Nhập sai mật khẩu 10 lần → lockout 30 phút. Counter failed attempts tự reset mỗi ngày lúc 00:00 UTC.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client (Next.js)                          Server (Express)
┌─────────────────────┐                   ┌─────────────────────────────────┐
│ /login              │                   │                                 │
│   EmailStepForm     │──POST /login───▶  │  Rate Limiter                   │
│                     │                   │    ↓                            │
│ /login/password     │                   │  Validation (Joi + bodyPipe)    │
│   PasswordStepForm  │                   │    ↓                            │
│                     │                   │  LoginController                │
│ /login/otp          │                   │    ↓                            │
│   OtpStepForm       │                   │  LoginService                   │
│                     │                   │    ├── AuthenticationService     │
│ /login/magic-link   │                   │    ├── LoginHistoryService      │
│   MagicLinkForm     │                   │    ├── OtpLoginRepo (Redis)     │
│                     │                   │    ├── MagicLinkLoginRepo(Redis)│
│ /login/alternative  │                   │    ├── FailedAttemptsRepo(Redis)│
│   AlternativeMethods│                   │    └── SendEmailService         │
└─────────────────────┘                   │          ↓                      │
                                          │    LoginHistory (MongoDB)       │
                                          └─────────────────────────────────┘
```

---

## 3.3. Data Model

### Collection: `auths`

```typescript
{
  email:              String,    // unique, required, regex validated (EMAIL_FORMAT_PATTERN + SAFE_EMAIL_PATTERN)
  password:           String,    // bcrypt hashed
  verifiedEmail:      Boolean,   // must be true to login
  roles:              String,    // enum: AUTHENTICATION_ROLES ('user' | 'admin')
  isActive:           Boolean,   // account status
  tempPasswordHash:   String,    // temporary password for reset
  tempPasswordExpAt:  Date,      // temp password expiry
  tempPasswordUsed:   Boolean,   // temp password used flag
  mustChangePassword: Boolean,   // force password change
  passwordChangedAt:  Date,      // last password change timestamp
  createdAt:          Date,
  updatedAt:          Date
}
```

### Collection: `login_histories`

```typescript
{
  userId:             ObjectId,     // ref: Authentication, default: null, indexed
  usernameAttempted:  String,       // required, trim, lowercase
  method:             String,       // enum: LOGIN_METHODS ('password' | 'otp' | 'magic-link' | 'forgot-password')
  status:             String,       // enum: LOGIN_STATUSES ('success' | 'failed'), indexed
  failReason:         String,       // enum: LOGIN_FAIL_REASONS, default: null
  ip:                 String,       // required, trim, maxlength: 45, indexed
  country:            String,       // default: GEO_DEFAULTS.UNKNOWN_COUNTRY
  city:               String,       // default: GEO_DEFAULTS.UNKNOWN_CITY
  deviceType:         String,       // enum: DEVICE_TYPES ('DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN')
  os:                 String,       // default: GEO_DEFAULTS.UNKNOWN_COUNTRY
  browser:            String,       // default: GEO_DEFAULTS.UNKNOWN_COUNTRY
  userAgent:          String,       // default: ""
  clientType:         String,       // enum: CLIENT_TYPES ('WEB' | 'MOBILE_IOS' | 'MOBILE_ANDROID')
  timezoneOffset:     String,       // default: null
  isAnomaly:          Boolean,      // default: false
  anomalyReasons:     [String],     // default: []
  createdAt:          Date          // TTL index: 90 ngày (LOGIN_HISTORY_CONFIG.TTL_SECONDS)
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }`
- `{ userId: 1, status: 1, createdAt: -1 }`
- `{ ip: 1, createdAt: -1 }`
- `{ usernameAttempted: 1, createdAt: -1 }`
- `{ createdAt: -1 }`
- `{ createdAt: 1 }` (TTL index, `expireAfterSeconds`)

### Redis Keys

```
otp-login:{email}                     → OTP hash (TTL: 5 phút)
otp-login-cooldown:{email}            → cooldown flag (TTL: 60 giây)
otp-login-failed-attempts:{email}     → số lần nhập sai OTP (TTL: 15 phút)
otp-login-resend-count:{email}        → số lần gửi lại OTP (TTL: 5 phút)

magic-link-login:{email}              → token hash (TTL: 15 phút)
magic-link-login-cooldown:{email}     → cooldown flag (TTL: 60 giây)

login-failed-attempts:{email}         → số lần nhập sai mật khẩu (TTL: đến 00:00 UTC ngày kế tiếp)
login-lockout:{email}                 → lockout flag + attempt count (TTL: 1800s — 30 phút, cố định)
```

**Key prefixes** được quản lý tại `constants/redis/store/index.ts` (object `LOGIN`).

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
  "password": "string — mật khẩu"
}

Response 200:
{
  "accessToken": "string — JWT access token (15 min)",
  "idToken": "string — JWT id token",
  "expiresIn": "number — thời gian hết hạn (seconds)"
}
+ Set-Cookie: refreshToken (HTTP-only cookie, 7 days)

Response 400: Account bị lockout do nhập sai quá nhiều
Response 401: Email hoặc mật khẩu không đúng / tài khoản inactive / email chưa verified
Response 422: Validation error (email/password format)
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
  "success": true,
  "expiresIn": 300,
  "cooldown": 60
}

Response 400: Cooldown chưa hết / resend limit exceeded / email format không hợp lệ
Response 401: Tài khoản không tồn tại / inactive / email chưa verified
Response 422: Validation error
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
  "idToken": "string",
  "expiresIn": "number"
}
+ Set-Cookie: refreshToken (HTTP-only cookie)

Response 400: OTP verification bị lockout (5 lần sai → lock 15 phút)
Response 401: OTP sai hoặc hết hạn
Response 422: Validation error
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
  "success": true,
  "expiresIn": 900,
  "cooldown": 60
}

Response 400: Cooldown chưa hết
Response 401: Tài khoản không tồn tại / inactive / email chưa verified
Response 422: Validation error
Response 429: Rate limit exceeded
```

### Endpoint 5: Verify Magic Link

```
POST /api/v1/auth/login/magic-link/verify

Request Body:
{
  "email": "string",
  "token": "string — hex 128 ký tự (64 bytes)"
}

Response 200:
{
  "accessToken": "string",
  "idToken": "string",
  "expiresIn": "number"
}
+ Set-Cookie: refreshToken (HTTP-only cookie)

Response 401: Token sai, hết hạn, hoặc đã sử dụng
Response 422: Validation error
Response 429: Rate limit exceeded
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Password Login Flow

```
1. User nhập email → Client validate format → navigate đến /login/password
2. User nhập password → Client validate
3. Client gửi POST /api/v1/auth/login { email, password }
4. Server: Rate limiter kiểm tra IP limit (rl.loginByIp)
5. Server: bodyPipe(loginSchema) — Joi validate input
6. Server: ensureLoginNotLocked() — kiểm tra lockout (Redis: login-lockout:{email})
7. Server: authService.findByEmail(email) — tìm user (MongoDB: auths collection)
8. Server: ensureAccountExists() — kiểm tra tồn tại, ghi login history nếu không tìm thấy
9. Server: ensureAccountActiveWithLogging() — kiểm tra isActive
10. Server: ensureEmailVerifiedWithLogging() — kiểm tra verifiedEmail
11. Server: verifyPasswordOrFail() — bcrypt compare, nếu sai → trackFailedPasswordAttempt()
    - Tăng failed attempts (counter TTL = đến 00:00 UTC), nếu đạt 10 lần → lockout 30 phút
    - Ghi login history (failed)
12. Nếu đúng → failedAttemptsRepo.resetAll(email) (fire-and-forget với withRetry)
13. completeSuccessfulLogin():
    - loginHistoryService.recordSuccessfulLogin() (fire-and-forget)
    - authService.findUserByAuthId() → { fullName, avatar }
    - generateAuthTokensResponse() → toLoginResponseDto()
14. Controller: set refreshToken vào HTTP-only cookie
15. Server: Trả về { accessToken, idToken, expiresIn }
16. Client: Lưu tokens → redirect vào app
```

### OTP Login Flow

```
1. User chọn phương thức OTP → Client gửi POST /otp/send { email }
2. Server: Rate limiter (rl.loginOtpByIp + rl.loginOtpByEmail)
3. Server: bodyPipe(otpSendSchema) — Joi validate
4. Server: ensureCooldownExpired() — kiểm tra cooldown (60s)
5. Server: validateAuthenticationForLogin() — kiểm tra account tồn tại, active, email verified
6. Server: otpLoginRepo.hasExceededResendLimit() — kiểm tra resend count (max 3)
7. Server: otpLoginRepo.createAndStoreOtp() — generate 6 chữ số → hash → lưu Redis (TTL 5 phút)
8. Server: otpLoginRepo.setRateLimits() — set cooldown + tăng resend count (fire-and-forget)
9. Server: emailService.send(EmailType.LOGIN_OTP) — gửi email chứa OTP (fire-and-forget)
10. Server: Trả về toOtpSendDto() { success, expiresIn, cooldown }

11. User nhập 6 chữ số → Client gửi POST /otp/verify { email, otp }
12. Server: Rate limiter (rl.loginByIp)
13. Server: ensureOtpNotLocked() — kiểm tra failed attempts (max 5 → lock 15 phút)
14. Server: ensureAuthenticationExists() — tìm auth record
15. Server: otpLoginRepo.verify() — lấy OTP hash từ Redis → bcrypt compare
16. Nếu sai → handleInvalidOtp() → trackFailedOtpAttempt() + ghi login history (failed)
17. Nếu đúng → otpLoginRepo.cleanupAll() — xóa OTP, cooldown, failed attempts, resend count
18. completeSuccessfulLogin() → ghi login history + generate tokens
19. Controller: set refreshToken vào HTTP-only cookie → trả response
```

### Magic Link Login Flow

```
1. User chọn phương thức magic link → Client gửi POST /magic-link/send { email }
2. Server: Rate limiter (rl.magicLinkByIp + rl.magicLinkByEmail)
3. Server: bodyPipe(magicLinkSendSchema) — Joi validate
4. Server: ensureCooldownExpired() — kiểm tra cooldown (60s)
5. Server: validateAuthenticationForLogin() — kiểm tra account tồn tại, active, email verified
6. Server: magicLinkLoginRepo.createAndStoreToken() — generate 64 bytes → hex → hash → lưu Redis (TTL 15 phút)
7. Server: magicLinkLoginRepo.setCooldownAfterSend() (fire-and-forget)
8. Server: emailService.send(EmailType.MAGIC_LINK) — gửi email chứa link (fire-and-forget)
   URL: {CLIENT_URL}/login/verify-magic-link?token={hex}&email={email}
9. Server: Trả về toMagicLinkSendDto() { success, expiresIn, cooldown }

10. User click link trong email → Browser mở trang verify
11. Client gửi POST /magic-link/verify { email, token }
12. Server: Rate limiter (rl.loginByIp)
13. Server: ensureAuthenticationExists() — tìm auth record
14. Server: magicLinkLoginRepo.verifyToken() — lấy token hash từ Redis → bcrypt compare
15. Nếu sai → handleInvalidMagicLink() → ghi login history (failed) + throw UnauthorizedError
16. Nếu đúng → magicLinkLoginRepo.cleanupAll() — xóa token + cooldown (single-use)
17. completeSuccessfulLogin() → ghi login history + generate tokens
18. Controller: set refreshToken vào HTTP-only cookie → trả response
```

---

## 3.6. Cấu trúc file (File Structure)

### Server

```
server/src/
├── modules/login/
│   ├── login.module.ts              # DI setup (factory function), export router & service
│   ├── login.controller.ts          # Route handlers (login, sendOtp, verifyOtp, sendMagicLink, verifyMagicLink)
│   ├── login.routes.ts              # Route wiring: createLoginRoutes() — middleware stack + asyncHandler
│   ├── login.service.ts             # Business logic (password, OTP, magic link)
│   ├── login.helper.ts              # Helper functions: validators, ensureXxx, handleInvalidXxx, completeSuccessfulLogin
│   ├── repositories/
│   │   ├── otp-login.repository.ts       # Redis: OTP CRUD (type OtpLoginRepository + RedisOtpLoginRepository)
│   │   ├── magic-link-login.repository.ts # Redis: magic link CRUD (type MagicLinkLoginRepository + RedisMagicLinkLoginRepository)
│   │   └── failed-attempts.repository.ts  # Redis: lockout management (type FailedAttemptsRepository + RedisFailedAttemptsRepository)
│   ├── dtos/
│   │   ├── index.ts                      # Barrel export
│   │   ├── login-response.dto.ts         # LoginResponseDto + toLoginResponseDto()
│   │   ├── otp-send.dto.ts              # OtpSendDto + toOtpSendDto()
│   │   └── magic-link-send.dto.ts       # MagicLinkSendDto + toMagicLinkSendDto()
│   └── swagger/
│       ├── index.ts                      # Swagger export
│       ├── paths.ts                      # OpenAPI paths
│       └── schemas.ts                    # OpenAPI schemas (joi-to-swagger)
├── modules/login-history/
│   ├── login-history.module.ts
│   └── login-history.service.ts     # Ghi và query lịch sử (recordSuccessfulLogin, recordFailedLogin)
├── modules/authentication/
│   └── authentication.service.ts    # findByEmail, findUserByAuthId
├── models/
│   ├── authentication.ts            # Mongoose schema: auths
│   └── login-history.ts             # Mongoose schema: login_histories
├── services/email/
│   └── email.service.ts             # SendEmailService (gửi OTP, magic link emails)
├── middlewares/
│   ├── guards/
│   │   └── auth.guard.ts            # JWT authenticate middleware
│   └── pipes/
│       └── validation.pipe.ts       # bodyPipe, paramsPipe, queryPipe
├── utils/
│   ├── token/
│   │   └── index.ts                 # generateAuthTokensResponse()
│   ├── async-handler.ts             # asyncHandler wrapper
│   ├── crypto/
│   │   ├── bcrypt.ts                # hashValue, isValidHashedValue
│   │   └── otp.ts                   # generateOtp, generateSecureToken
│   ├── retry.ts                     # withRetry (fire-and-forget)
│   ├── logger.ts                    # Logger utility
│   └── date.ts                      # formatDuration
├── validators/schemas/
│   ├── base.ts                      # emailSchema, otpSchema (shared)
│   └── login.ts                     # loginSchema, otpSendSchema, otpVerifySchema, magicLinkSendSchema, magicLinkVerifySchema
├── constants/
│   ├── modules/
│   │   ├── login/index.ts           # LOGIN_LOCKOUT (MAX_ATTEMPTS, LOCKOUT_SECONDS), LOGIN_OTP_CONFIG, MAGIC_LINK_CONFIG
│   │   ├── login-history/index.ts   # LOGIN_METHODS, LOGIN_STATUSES, LOGIN_FAIL_REASONS, DEVICE_TYPES, CLIENT_TYPES, GEO_DEFAULTS, LOGIN_HISTORY_CONFIG
│   │   └── token/index.ts           # REFRESH_TOKEN
│   ├── redis/store/index.ts         # LOGIN key prefixes (Redis store keys)
│   └── time.ts                      # SECONDS_PER_MINUTE, etc.
├── config/
│   ├── env.ts                       # ENV.CLIENT_URL, etc.
│   ├── cookie.ts                    # REFRESH_TOKEN_COOKIE_OPTIONS
│   └── responses/
│       ├── success.ts               # OkSuccess
│       └── error.ts                 # BadRequestError, UnauthorizedError, NotFoundError
└── types/modules/
    ├── login.ts                     # PasswordLoginRequest, OtpSendRequest, OtpVerifyRequest, MagicLinkSendRequest, MagicLinkVerifyRequest, CreateLoginHistoryInput
    ├── login-history.ts             # LoginHistoryDocument, LoginStatus, LoginFailReason
    └── authentication.ts            # AuthenticationDocument, AuthTokensResponse
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
| Redis          | Internal | OTP, magic link, rate limiting, lockout state     | redis client (RedisClientType)             |
| Email Service  | External | Gửi OTP và magic link qua email                  | SendEmailService, React Email templates    |
| bcrypt         | Library  | Hash và verify mật khẩu, OTP, magic link token   | hashValue, isValidHashedValue              |
| jsonwebtoken   | Library  | Generate và verify JWT tokens                     | 3 secrets riêng biệt                       |
| Joi            | Library  | Server-side input validation                      | Schemas trong validators/schemas/           |
| joi-to-swagger | Library  | Convert Joi schemas sang OpenAPI schemas          | Dùng trong swagger/schemas.ts              |
| Zod            | Library  | Client-side form validation                       | Tích hợp với React Hook Form               |
| next-intl      | Library  | Internationalization cho client                   | Vi + En                                    |
| express-rate-limit | Library | Rate limiting middleware                      | Per-IP và per-email (RateLimiterMiddleware) |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng. Feature login là core functionality.

**Rollback plan:**
- Server: Revert deployment, tokens đã phát hành vẫn valid cho đến khi hết hạn
- Redis data (OTP, magic link): Tự hết hạn theo TTL, không cần cleanup
- MongoDB: Không có migration phá hủy, chỉ tạo collection mới
