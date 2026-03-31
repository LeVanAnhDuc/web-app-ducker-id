# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Forgot Password được xây dựng theo đúng architecture hiện có: **Controller → Service → Repository** pattern, với thêm **Routes** (tách route wiring khỏi controller) và **Helper** (tách sub-logic ra pure functions). OTP và Magic Link token được hash (bcrypt) và lưu trong Redis với TTL tự động expire. Khi verify OTP/magic-link thành công, hệ thống tạo `resetToken` (64-byte hex) lưu Redis, client dùng token này cùng password mới để gọi API reset. Sau khi reset thành công, password mới được hash và update vào MongoDB, tất cả session bị invalidate thông qua `passwordChangedAt`. Chống email enumeration bằng cách trả success giả khi email không tồn tại (vẫn validate format). Service sử dụng **DTO pattern** — mỗi handler trả về DTO riêng thông qua mapper function.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js)                          │
│                                                                         │
│  /forgot-password ──→ /forgot-password/otp ──→ /reset-password          │
│         │                                           ▲                   │
│         └──→ /forgot-password/magic-link ───────────┘                   │
│                   (email link redirect)                                  │
└────────────┬──────────────────┬───────────────────┬─────────────────────┘
             │                  │                   │
        [1] Send OTP      [2] Verify OTP      [3] Reset Password
        [1] Send ML        [2] Verify ML
             │                  │                   │
┌────────────▼──────────────────▼───────────────────▼─────────────────────┐
│                         SERVER (Express.js)                              │
│                                                                          │
│  Rate Limiter → bodyPipe(schema) → ForgotPasswordController              │
│                                         │                                │
│                                ForgotPasswordService                     │
│                               /         |          \                     │
│             OtpFPRepo    MagicLinkFPRepo   ResetTokenRepo                │
│                  │              │                │                       │
│                  ▼              ▼                ▼                       │
│            ┌──────────────────────────────┐  ┌──────────┐               │
│            │     Redis (hash storage)     │  │ MongoDB   │               │
│            │ - OTP (hashed, 5min TTL)     │  │ - Update  │               │
│            │ - Magic Link (hashed, 15min) │  │   password│               │
│            │ - Reset Token (hashed, 10min)│  └──────────┘               │
│            │ - Cooldown (60s TTL)         │                              │
│            │ - Failed attempts (15min)    │                              │
│            │ - Resend count              │                              │
│            └──────────────────────────────┘                              │
│                                                                          │
│  SendEmailService (services/email/) ──→ Nodemailer (Gmail SMTP)          │
│  LoginHistoryService ──→ MongoDB (login-history collection)              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3.3. Data Model

### MongoDB - Không tạo bảng mới

Sử dụng `AuthenticationService` hiện có. Service gọi `authService.updatePassword(authId, hashedPassword)` để cập nhật password.

```typescript
// AuthenticationService (đã có sẵn)
async updatePassword(authId: string, hashedPassword: string): Promise<void>
```

### Redis - Keys mới

Tất cả keys sử dụng pattern: `{prefix}:{email}`, định nghĩa trong `constants/redis/store/index.ts`.

| Key Pattern                           | Value          | TTL       | Mô tả                           |
| ------------------------------------- | -------------- | --------- | -------------------------------- |
| `otp-forgot-pw:{email}`              | bcrypt hash    | 5 phút    | Hash của OTP 6 số                |
| `otp-forgot-pw-cd:{email}`           | "1"            | 60 giây   | Cooldown giữa các lần gửi OTP   |
| `otp-forgot-pw-fail:{email}`         | counter (incr) | 15 phút   | Số lần nhập sai OTP             |
| `otp-forgot-pw-resend:{email}`       | counter (incr) | 5 phút    | Số lần gửi lại OTP              |
| `ml-forgot-pw:{email}`               | bcrypt hash    | 15 phút   | Hash của magic link token        |
| `ml-forgot-pw-cd:{email}`            | "1"            | 60 giây   | Cooldown giữa các lần gửi ML    |
| `ml-forgot-pw-resend:{email}`        | counter (incr) | 15 phút   | Số lần gửi lại magic link       |
| `reset-token:{email}`                | bcrypt hash    | 10 phút   | Hash của reset token             |

---

## 3.4. API Design

### Endpoint 1: Send OTP

```
POST /api/v1/auth/forgot-password/otp/send

Request Body:
{
  "email": "string — email format, required"
}

Response 200 (success hoặc fake success):
{
  "timestamp": "2026-03-02T...",
  "route": "/api/v1/auth/forgot-password/otp/send",
  "message": "OTP has been sent to your email",
  "data": {
    "success": true,
    "expiresIn": 300,
    "cooldown": 60
  }
}

Response 400 (cooldown / resend limit):
{
  "timestamp": "...",
  "route": "...",
  "message": "Please wait {seconds} seconds before requesting a new OTP",
  "error": "Bad Request"
}

Response 422 (validation - email format sai):
{
  "timestamp": "...",
  "route": "...",
  "message": "Validation Error",
  "error": "Validation Error",
  "details": [{ "field": "email", "message": "..." }]
}

Response 429 (rate limit):
{
  "timestamp": "...",
  "route": "...",
  "message": "Too many requests",
  "error": "Too Many Requests"
}
```

### Endpoint 2: Verify OTP

```
POST /api/v1/auth/forgot-password/otp/verify

Request Body:
{
  "email": "string — email format, required",
  "otp": "string — 6 digits, required"
}

Response 200:
{
  "timestamp": "...",
  "route": "...",
  "message": "OTP verified successfully",
  "data": {
    "success": true,
    "resetToken": "a1b2c3d4...128chars (64 bytes hex)"
  }
}

Response 400 (locked sau 5 lần sai):
{
  "message": "Too many failed attempts. Please try again in 15 minutes",
  "error": "Bad Request"
}

Response 401 (OTP sai / hết hạn):
{
  "message": "Invalid or expired OTP. {remaining} attempts remaining",
  "error": "Unauthorized"
}
```

### Endpoint 3: Send Magic Link

```
POST /api/v1/auth/forgot-password/magic-link/send

Request Body:
{
  "email": "string — email format, required"
}

Response 200 (success hoặc fake success):
{
  "data": {
    "success": true,
    "expiresIn": 900,
    "cooldown": 60
  }
}

Response 400 (cooldown / resend limit):
  (giống OTP send)

Response 429 (rate limit):
  (giống OTP send)
```

### Endpoint 4: Verify Magic Link

```
POST /api/v1/auth/forgot-password/magic-link/verify

Request Body:
{
  "email": "string — email format, required",
  "token": "string — 128 hex chars, required"
}

Response 200:
{
  "data": {
    "success": true,
    "resetToken": "a1b2c3d4...128chars"
  }
}

Response 401 (token sai / hết hạn):
{
  "message": "Invalid or expired magic link",
  "error": "Unauthorized"
}
```

### Endpoint 5: Reset Password

```
POST /api/v1/auth/forgot-password/reset

Request Body:
{
  "email": "string — email format, required",
  "resetToken": "string — 128 hex chars, required",
  "newPassword": "string — min 8 chars, uppercase + lowercase + number + special"
}

Response 200:
{
  "message": "Password has been reset successfully",
  "data": {
    "success": true
  }
}

Response 401 (reset token sai / hết hạn):
{
  "message": "Invalid or expired reset token. Please start over",
  "error": "Unauthorized"
}
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Flow A: OTP

```
1. Client POST /forgot-password/otp/send { email }
2. Rate limiter check (rl.forgotPasswordOtpByIp, rl.forgotPasswordOtpByEmail)
3. bodyPipe(fpOtpSendSchema) check email format → nếu sai → 422
4. Controller gọi service.sendOtp(req):
   a. Helper ensureOtpCooldownExpired() → nếu chưa hết → 400
   b. Helper ensureOtpResendLimitNotExceeded() → nếu vượt → 400
   c. authService.findByEmail(email)
   d. Nếu email KHÔNG tồn tại hoặc inactive → trả fake success DTO (không gửi email)
   e. Nếu email tồn tại + active:
      - otpRepo.createAndStoreOtp(email) → tạo OTP 6 số, hash (bcrypt), lưu Redis (TTL 5 min)
      - withRetry(() => otpRepo.setRateLimits(email)) — fire-and-forget
      - emailService.send(EmailType.FORGOT_PASSWORD_OTP, ...) — fire-and-forget
   f. Trả toSendOtpResponseDto(expiresIn, cooldown)

5. Client POST /forgot-password/otp/verify { email, otp }
6. bodyPipe(fpOtpVerifySchema) check email + otp format
7. Controller gọi service.verifyOtp(req):
   a. Helper ensureOtpNotLocked() (>= 5 failed attempts) → nếu locked → 400
   b. Helper ensureAuthExists() → nếu không có → 401
   c. otpRepo.verify(email, otp) → bcrypt compare
   d. Nếu SAI:
      - Helper handleInvalidOtp() → trackFailedOtpAttempt + recordFailedLogin → throw error với remaining attempts
   e. Nếu ĐÚNG:
      - resetTokenRepo.createAndStore(email) → tạo token, hash, lưu Redis (TTL 10 min)
      - withRetry(() => otpRepo.cleanupAll(email)) — fire-and-forget
      - Trả toVerifyOtpResponseDto(resetToken)

8. Client redirect → /reset-password?email=...&token=...
```

### Flow B: Magic Link

```
1. Client POST /forgot-password/magic-link/send { email }
2. Rate limiter check (rl.forgotPasswordMagicLinkByIp, rl.forgotPasswordMagicLinkByEmail)
3. bodyPipe(fpMagicLinkSendSchema) check email format
4. Controller gọi service.sendMagicLink(req):
   a. Helper ensureMagicLinkCooldownExpired() → nếu chưa hết → 400
   b. Helper ensureMagicLinkResendLimitNotExceeded() → nếu vượt → 400
   c. authService.findByEmail(email)
   d. Nếu email KHÔNG tồn tại hoặc inactive → trả fake success DTO
   e. Nếu email tồn tại + active:
      - magicLinkRepo.createAndStoreToken(email) → tạo token, hash, lưu Redis (TTL 15 min)
      - withRetry(() => magicLinkRepo.setRateLimits(email)) — fire-and-forget
      - Helper sendMagicLinkEmail() → build URL: {CLIENT_URL}/reset-password?email=...&token=...&method=magic-link → emailService.send() — fire-and-forget
   f. Trả toSendMagicLinkResponseDto(expiresIn, cooldown)

5. User click link trong email → GET /reset-password?email=...&token=...&method=magic-link
6. Client detect method=magic-link → POST /forgot-password/magic-link/verify { email, token }
7. Controller gọi service.verifyMagicLink(req):
   a. Helper ensureAuthExists() → nếu không có → 401
   b. magicLinkRepo.verifyToken(email, token) → bcrypt compare
   c. Nếu SAI → Helper handleInvalidMagicLink() → recordFailedLogin → throw 401
   d. Nếu ĐÚNG:
      - resetTokenRepo.createAndStore(email) → tạo token, hash, lưu Redis (TTL 10 min)
      - withRetry(() => magicLinkRepo.cleanupAll(email)) — fire-and-forget
      - Trả toVerifyMagicLinkResponseDto(resetToken)
8. Client thay token trong URL bằng resetToken → hiển thị form
```

### Flow C: Reset Password (chung cho cả OTP và Magic Link)

```
1. Client POST /forgot-password/reset { email, resetToken, newPassword }
2. Rate limiter check (rl.forgotPasswordResetByIp)
3. bodyPipe(fpResetPasswordSchema) check email + resetToken + newPassword format/strength
4. Controller gọi service.resetPassword(req):
   a. resetTokenRepo.verify(email, resetToken) → bcrypt compare
   b. Nếu KHÔNG hợp lệ → throw UnauthorizedError
   c. Nếu hợp lệ:
      - Helper ensureAuthExists() → tìm auth record
      - hashValue(newPassword) (bcrypt)
      - authService.updatePassword(authId, hashedPassword) → update password + passwordChangedAt trong MongoDB
      - resetTokenRepo.clear(email) → xóa resetToken khỏi Redis
      - loginHistoryService.recordSuccessfulLogin() với LOGIN_METHODS.FORGOT_PASSWORD — fire-and-forget
      - Trả toResetPasswordResponseDto()
5. Client hiển thị toast success → redirect → /login
```

---

## 3.6. Cấu trúc files

### Server

```
server/src/
├── modules/forgot-password/
│   ├── forgot-password.module.ts           # DI wiring, export router
│   ├── forgot-password.controller.ts       # 5 route handlers
│   ├── forgot-password.routes.ts           # Route wiring: rate limiter → bodyPipe → asyncHandler
│   ├── forgot-password.service.ts          # Business logic, trả về DTOs
│   ├── forgot-password.helper.ts           # Pure helper functions cho service
│   ├── repositories/
│   │   ├── otp-forgot-password.repository.ts          # Redis: OTP CRUD
│   │   ├── magic-link-forgot-password.repository.ts   # Redis: magic link CRUD
│   │   └── reset-token.repository.ts                  # Redis: reset token CRUD
│   ├── dtos/
│   │   ├── index.ts                        # Barrel export tất cả DTOs
│   │   ├── send-otp.dto.ts                 # SendOtpResponseDto + toSendOtpResponseDto()
│   │   ├── verify-otp.dto.ts              # VerifyOtpResponseDto + toVerifyOtpResponseDto()
│   │   ├── send-magic-link.dto.ts         # SendMagicLinkResponseDto + toSendMagicLinkResponseDto()
│   │   ├── verify-magic-link.dto.ts       # VerifyMagicLinkResponseDto + toVerifyMagicLinkResponseDto()
│   │   └── reset-password.dto.ts          # ResetPasswordResponseDto + toResetPasswordResponseDto()
│   └── swagger/
│       ├── index.ts                        # Swagger export
│       ├── paths.ts                        # OpenAPI paths
│       └── schemas.ts                      # OpenAPI schemas (dùng joi-to-swagger)
├── services/email/
│   ├── email.service.ts                    # SendEmailService
│   ├── email.types.ts                      # EmailType enum
│   └── templates/
│       ├── forgot-password-otp.tsx         # Forgot password OTP email template
│       └── magic-link.tsx                  # Magic link email template (dùng chung)
├── types/modules/
│   └── forgot-password.ts                  # Request types: FPOtpSendRequest, FPOtpVerifyRequest, ...
├── validators/schemas/
│   └── forgot-password.ts                  # Joi schemas: fpOtpSendSchema, fpOtpVerifySchema, ...
├── constants/
│   ├── modules/forgot-password/index.ts    # FORGOT_PASSWORD_OTP_CONFIG, FORGOT_PASSWORD_MAGIC_LINK_CONFIG, FORGOT_PASSWORD_RESET_TOKEN_CONFIG
│   └── redis/store/index.ts               # FORGOT_PASSWORD Redis key prefixes
├── middlewares/
│   ├── pipes/validation.pipe.ts           # bodyPipe(schema) middleware
│   └── index.ts                           # Export bodyPipe, RateLimiterMiddleware type
└── i18n/locales/
    ├── en/forgotPassword.json              # English messages
    └── vi/forgotPassword.json             # Vietnamese messages
```

### Client

```
client/src/
├── app/[locale]/(authen)/
│   ├── forgot-password/
│   │   ├── page.tsx                        # Chọn phương thức khôi phục
│   │   ├── otp/page.tsx                    # Nhập OTP
│   │   └── magic-link/page.tsx             # Chờ magic link
│   └── reset-password/
│       └── page.tsx                        # Đặt mật khẩu mới
├── views/
│   ├── ForgotPassword/                     # Trang chọn phương thức
│   ├── ForgotPasswordOtp/                  # Trang nhập OTP
│   ├── ForgotPasswordMagicLink/            # Trang chờ magic link
│   └── ResetPassword/                      # Trang đặt mật khẩu mới
├── forms/ForgotPassword/
│   ├── index.ts                            # Form props + zodResolver
│   ├── data.ts                             # Default values
│   └── validations.ts                      # Zod schemas
├── forms/ResetPassword/
│   ├── index.ts
│   ├── data.ts
│   └── validations.ts
├── dataSources/ForgotPassword/
│   └── index.ts                            # API functions (sendOtp, verifyOtp, sendMagicLink, verifyMagicLink, resetPassword)
├── constants/
│   ├── forgotPassword.ts                   # ForgotPassword-specific constants
│   └── fieldNames/ForgotPassword.ts        # Field name constants
└── locales/
    ├── en/forgotPassword.json
    └── vi/forgotPassword.json
```

---

## 3.7. Chi tiết thiết kế các Repository

### 3.7.1. OtpForgotPasswordRepository

Định nghĩa type contract `OtpForgotPasswordRepository` và class `RedisOtpForgotPasswordRepository` implement nó. Sử dụng Redis client trực tiếp (không extend `RedisCache`).

**Config:** `FORGOT_PASSWORD_OTP_CONFIG` từ `constants/modules/forgot-password`.

**Redis key prefixes:** `FORGOT_PASSWORD.OTP`, `FORGOT_PASSWORD.OTP_COOLDOWN`, `FORGOT_PASSWORD.OTP_FAILED_ATTEMPTS`, `FORGOT_PASSWORD.OTP_RESEND_COUNT` từ `constants/redis/store`.

```typescript
type OtpForgotPasswordRepository = {
  readonly OTP_EXPIRY_SECONDS: number;    // 5 * 60 = 300
  readonly OTP_COOLDOWN_SECONDS: number;  // 60

  createOtp(): string;
  storeHashed(email: string, otp: string, expiry: number): Promise<void>;
  clearOtp(email: string): Promise<void>;
  verify(email: string, otp: string): Promise<boolean>;
  checkCooldown(email: string): Promise<boolean>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementFailedAttempts(email: string): Promise<number>;
  getFailedAttemptCount(email: string): Promise<number>;
  clearFailedAttempts(email: string): Promise<void>;
  isLocked(email: string): Promise<boolean>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string): Promise<boolean>;
  createAndStoreOtp(email: string): Promise<string>;
  setRateLimits(email: string): Promise<void>;
  cleanupAll(email: string): Promise<void>;
};
```

### 3.7.2. MagicLinkForgotPasswordRepository

Định nghĩa type contract `MagicLinkForgotPasswordRepository` và class `RedisMagicLinkForgotPasswordRepository` implement nó.

**Config:** `FORGOT_PASSWORD_MAGIC_LINK_CONFIG` từ `constants/modules/forgot-password`.

**Redis key prefixes:** `FORGOT_PASSWORD.MAGIC_LINK`, `FORGOT_PASSWORD.MAGIC_LINK_COOLDOWN`, `FORGOT_PASSWORD.MAGIC_LINK_RESEND_COUNT` từ `constants/redis/store`.

```typescript
type MagicLinkForgotPasswordRepository = {
  readonly MAGIC_LINK_EXPIRY_SECONDS: number;    // 15 * 60 = 900
  readonly MAGIC_LINK_COOLDOWN_SECONDS: number;  // 60

  createToken(): string;
  storeHashed(email: string, token: string, expiry: number): Promise<void>;
  verifyToken(email: string, token: string): Promise<boolean>;
  clearToken(email: string): Promise<void>;
  checkCooldown(email: string): Promise<boolean>;
  getCooldownRemaining(email: string): Promise<number>;
  setCooldown(email: string, seconds: number): Promise<void>;
  clearCooldown(email: string): Promise<void>;
  incrementResendCount(email: string, windowSeconds: number): Promise<number>;
  getResendAttemptCount(email: string): Promise<number>;
  clearResendCount(email: string): Promise<void>;
  hasExceededResendLimit(email: string): Promise<boolean>;
  createAndStoreToken(email: string): Promise<string>;
  setRateLimits(email: string): Promise<void>;
  cleanupAll(email: string): Promise<void>;
};
```

### 3.7.3. ResetTokenRepository

Định nghĩa type contract `ResetTokenRepository` và class `RedisResetTokenRepository` implement nó.

**Config:** `FORGOT_PASSWORD_RESET_TOKEN_CONFIG` từ `constants/modules/forgot-password`.

**Redis key prefix:** `FORGOT_PASSWORD.RESET_TOKEN` từ `constants/redis/store`.

```typescript
type ResetTokenRepository = {
  readonly RESET_TOKEN_EXPIRY_SECONDS: number;  // 10 * 60 = 600

  createToken(): string;
  // generateSecureToken(64) → 128-char hex
  storeHashed(email: string, token: string): Promise<void>;
  // hash token → Redis setEx (TTL 10 min)
  verify(email: string, token: string): Promise<boolean>;
  // get hash from Redis → bcrypt compare
  clear(email: string): Promise<void>;
  // Redis del
  createAndStore(email: string): Promise<string>;
  // clear old → createToken → storeHashed → return plain token
};
```

---

## 3.8. Chi tiết ForgotPasswordHelper

Helper chứa các pure functions được service sử dụng, tách ra để giữ service methods ngắn gọn.

```typescript
// forgot-password.helper.ts — exported functions

// OTP send helpers
ensureOtpCooldownExpired(otpRepo, email, t): Promise<void>
  // otpRepo.checkCooldown → nếu chưa hết → throw BadRequestError

ensureOtpResendLimitNotExceeded(otpRepo, email, t): Promise<void>
  // otpRepo.hasExceededResendLimit → nếu vượt → throw BadRequestError

// OTP verify helpers
ensureAuthExists(authService, email, t): Promise<AuthenticationDocument>
  // authService.findByEmail → nếu không có → throw UnauthorizedError

ensureOtpNotLocked(otpRepo, email, t): Promise<void>
  // otpRepo.isLocked → nếu locked → throw BadRequestError với lockout duration

handleInvalidOtp(otpRepo, loginHistoryService, email, auth, t, req): Promise<never>
  // trackFailedOtpAttempt (increment + recordFailedLogin)
  // Nếu remaining <= 0 → throw BadRequestError (locked)
  // Nếu còn → throw UnauthorizedError với remaining attempts

// Magic link send helpers
sendMagicLinkEmail(emailService, email, token, language): void
  // Build URL: {CLIENT_URL}/reset-password?email=...&token=...&method=magic-link
  // emailService.send(EmailType.MAGIC_LINK, ...) — fire-and-forget

ensureMagicLinkCooldownExpired(magicLinkRepo, email, t): Promise<void>
  // magicLinkRepo.checkCooldown → nếu chưa hết → throw BadRequestError

ensureMagicLinkResendLimitNotExceeded(magicLinkRepo, email, t): Promise<void>
  // magicLinkRepo.hasExceededResendLimit → nếu vượt → throw BadRequestError

// Magic link verify helpers
handleInvalidMagicLink(loginHistoryService, email, auth, req, t): never
  // recordFailedLogin → throw UnauthorizedError
```

---

## 3.9. Chi tiết ForgotPasswordService

```typescript
class ForgotPasswordService {
  constructor(
    authService: AuthenticationService,
    loginHistoryService: LoginHistoryService,
    otpRepo: OtpForgotPasswordRepository,
    magicLinkRepo: MagicLinkForgotPasswordRepository,
    resetTokenRepo: ResetTokenRepository,
    emailService: SendEmailService
  )

  // ── Send OTP ── trả về SendOtpResponseDto
  async sendOtp(req: FPOtpSendRequest): Promise<SendOtpResponseDto>
  // 1. ensureOtpCooldownExpired → 2. ensureOtpResendLimitNotExceeded
  // 3. authService.findByEmail
  // 4. Nếu không tồn tại/inactive → return toSendOtpResponseDto() (fake success)
  // 5. otpRepo.createAndStoreOtp → 6. withRetry(setRateLimits) → 7. emailService.send
  // 8. return toSendOtpResponseDto()

  // ── Verify OTP ── trả về VerifyOtpResponseDto
  async verifyOtp(req: FPOtpVerifyRequest): Promise<VerifyOtpResponseDto>
  // 1. ensureOtpNotLocked → 2. ensureAuthExists → 3. otpRepo.verify
  // 4. Nếu sai → handleInvalidOtp (throw error)
  // 5. Nếu đúng → resetTokenRepo.createAndStore → withRetry(otpRepo.cleanupAll)
  // 6. return toVerifyOtpResponseDto(resetToken)

  // ── Send Magic Link ── trả về SendMagicLinkResponseDto
  async sendMagicLink(req: FPMagicLinkSendRequest): Promise<SendMagicLinkResponseDto>
  // Pattern giống sendOtp nhưng tạo magic link URL thay vì OTP
  // Dùng sendMagicLinkEmail() helper, withRetry(magicLinkRepo.setRateLimits)

  // ── Verify Magic Link ── trả về VerifyMagicLinkResponseDto
  async verifyMagicLink(req: FPMagicLinkVerifyRequest): Promise<VerifyMagicLinkResponseDto>
  // 1. ensureAuthExists → 2. magicLinkRepo.verifyToken
  // 3. Nếu sai → handleInvalidMagicLink (throw error)
  // 4. Nếu đúng → resetTokenRepo.createAndStore → withRetry(magicLinkRepo.cleanupAll)
  // 5. return toVerifyMagicLinkResponseDto(resetToken)

  // ── Reset Password ── trả về ResetPasswordResponseDto
  async resetPassword(req: FPResetPasswordRequest): Promise<ResetPasswordResponseDto>
  // 1. resetTokenRepo.verify → 2. nếu sai → throw UnauthorizedError
  // 3. ensureAuthExists → 4. hashValue(newPassword)
  // 5. authService.updatePassword(authId, hashedPassword)
  // 6. resetTokenRepo.clear(email)
  // 7. loginHistoryService.recordSuccessfulLogin() (fire-and-forget)
  // 8. return toResetPasswordResponseDto()
}
```

---

## 3.10. Chi tiết ForgotPasswordModule

Module factory wires tất cả dependencies và trả về router:

```typescript
// forgot-password.module.ts
createForgotPasswordModule(
  redisClient: RedisClientType,
  authService: AuthenticationService,
  loginHistorySvc: LoginHistoryService,
  emailService: SendEmailService,
  rateLimiter: RateLimiterMiddleware
) => { forgotPasswordRouter: Router }
```

Dependency graph:
1. Tạo 3 Redis repositories: `RedisOtpForgotPasswordRepository`, `RedisMagicLinkForgotPasswordRepository`, `RedisResetTokenRepository`
2. Tạo `ForgotPasswordService` với 6 dependencies (authService, loginHistorySvc, otpRepo, magicLinkRepo, resetTokenRepo, emailService)
3. Tạo `ForgotPasswordController` với service
4. Gọi `createForgotPasswordRoutes(controller, rateLimiter)` → trả về router

---

## 3.11. Chi tiết ForgotPasswordRoutes

```typescript
// forgot-password.routes.ts
createForgotPasswordRoutes(controller, rl: RateLimiterMiddleware): Router

// POST /otp/send
//   rl.forgotPasswordOtpByIp → rl.forgotPasswordOtpByEmail → bodyPipe(fpOtpSendSchema) → asyncHandler(controller.sendOtp)

// POST /otp/verify
//   rl.forgotPasswordOtpByIp → bodyPipe(fpOtpVerifySchema) → asyncHandler(controller.verifyOtp)

// POST /magic-link/send
//   rl.forgotPasswordMagicLinkByIp → rl.forgotPasswordMagicLinkByEmail → bodyPipe(fpMagicLinkSendSchema) → asyncHandler(controller.sendMagicLink)

// POST /magic-link/verify
//   rl.forgotPasswordMagicLinkByIp → bodyPipe(fpMagicLinkVerifySchema) → asyncHandler(controller.verifyMagicLink)

// POST /reset
//   rl.forgotPasswordResetByIp → bodyPipe(fpResetPasswordSchema) → asyncHandler(controller.resetPassword)
```

---

## 3.12. Xử lý Anti-Enumeration

Khi email không tồn tại hoặc account inactive, service sẽ:

1. **Không throw error** (khác với login flow hiện tại)
2. **Return cùng response format** như khi email tồn tại (cùng DTO)
3. **Không gửi email** thực tế
4. **Log thông tin** "fake success" để debug

```typescript
// Trong sendOtp / sendMagicLink
const auth = await this.authService.findByEmail(email);

if (!auth || !auth.isActive) {
  Logger.info("Forgot password OTP - email not found or inactive (fake success)", { email });
  return toSendOtpResponseDto(
    this.otpRepo.OTP_EXPIRY_SECONDS,
    this.otpRepo.OTP_COOLDOWN_SECONDS
  );
}
```

---

## 3.13. Session Invalidation Strategy

Sau khi reset password, cần invalidate tất cả session hiện tại.

**Approach:** `authService.updatePassword()` đồng thời cập nhật `passwordChangedAt` field trong Authentication model. Khi verify access token, auth middleware kiểm tra `iat` (issued at) < `passwordChangedAt` → reject token.

```typescript
// Khi reset password — trong service
const hashedPassword = hashValue(newPassword);
await this.authService.updatePassword(auth._id.toString(), hashedPassword);
// authService.updatePassword cập nhật cả password lẫn passwordChangedAt

// Trong auth middleware (kiểm tra khi verify JWT)
if (auth.passwordChangedAt && tokenIssuedAt < auth.passwordChangedAt) {
  throw new UnauthorizedError("Password changed. Please login again.");
}
```

---

## 3.14. Constants

```typescript
// constants/modules/forgot-password/index.ts

export const FORGOT_PASSWORD_OTP_CONFIG = {
  LENGTH: 6,                      // OTP 6 chữ số
  EXPIRY_MINUTES: 5,              // OTP hết hạn sau 5 phút
  COOLDOWN_SECONDS: 60,           // Cooldown 60 giây giữa các lần gửi
  MAX_FAILED_ATTEMPTS: 5,         // Khóa sau 5 lần sai
  MAX_RESEND_ATTEMPTS: 3,         // Tối đa 3 lần gửi lại
  LOCKOUT_DURATION_MINUTES: 15    // Khóa 15 phút
} as const;

export const FORGOT_PASSWORD_MAGIC_LINK_CONFIG = {
  TOKEN_LENGTH: 64,               // 64 bytes → 128-char hex
  EXPIRY_MINUTES: 15,             // Magic link hết hạn sau 15 phút
  COOLDOWN_SECONDS: 60,           // Cooldown 60 giây
  MAX_RESEND_ATTEMPTS: 3          // Tối đa 3 lần gửi lại
} as const;

export const FORGOT_PASSWORD_RESET_TOKEN_CONFIG = {
  TOKEN_LENGTH: 64,               // 64 bytes → 128-char hex
  EXPIRY_MINUTES: 10              // Reset token hết hạn sau 10 phút
} as const;
```

---

## 3.15. Validation Schemas

```typescript
// validators/schemas/forgot-password.ts — sử dụng Joi

fpOtpSendSchema       = { email: emailSchema.required() }
fpOtpVerifySchema     = { email: emailSchema.required(), otp: otpSchema.required() }
fpMagicLinkSendSchema = { email: emailSchema.required() }
fpMagicLinkVerifySchema = {
  email: emailSchema.required(),
  token: Joi.string().length(128).pattern(/^[a-f0-9]+$/).required()  // 64 bytes * 2
}
fpResetPasswordSchema = {
  email: emailSchema.required(),
  resetToken: Joi.string().length(128).pattern(/^[a-f0-9]+$/).required(),
  newPassword: passwordSchema.required()
}
```

---

## 3.16. Dependencies & Integrations

| Dependency             | Loại     | Mô tả                                    | Đã có? |
| ---------------------- | -------- | ---------------------------------------- | ------ |
| Redis                  | Internal | Lưu OTP, magic link, reset token (hashed) | ✅ Có  |
| MongoDB                | Internal | Update password, đọc auth record          | ✅ Có  |
| Nodemailer (Gmail)     | External | Gửi OTP/magic link email                  | ✅ Có  |
| bcrypt                 | Library  | Hash OTP, token, password                 | ✅ Có  |
| crypto                 | Node.js  | Tạo secure random token                   | ✅ Có  |
| Joi                    | Library  | Validate request input                    | ✅ Có  |
| joi-to-swagger         | Library  | Convert Joi schema → OpenAPI schema       | ✅ Có  |
| React Email            | Library  | Render email template                     | ✅ Có  |
| AuthenticationService  | Internal | findByEmail, updatePassword               | ✅ Có  |
| LoginHistoryService    | Internal | Ghi log reset password                    | ✅ Có  |
| SendEmailService       | Internal | Gửi email (services/email/)               | ✅ Có  |

**Không cần thêm package mới.**

---

## 3.17. Migration & Deployment Strategy

**Feature flag:** Không cần. Feature này là module mới, mount thêm route, không ảnh hưởng code hiện tại.

**Database migration:**
- Thêm field `passwordChangedAt: Date | null` vào Authentication model (backward compatible, default null)

**Rollback plan:**
- Xóa route mount `/auth/forgot-password` khỏi `routes/v1/index.ts` → toàn bộ endpoints sẽ trả 404
- Không cần rollback database vì field mới default null, không ảnh hưởng logic hiện tại
- Redis keys tự expire theo TTL

---

## 3.18. Trạng thái implement

✅ Tất cả server-side và client-side đã được implement đầy đủ.
