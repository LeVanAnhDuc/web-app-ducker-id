# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Forgot Password được xây dựng theo đúng architecture hiện có: **Controller → Service → Repository** pattern. OTP và Magic Link token được hash (bcrypt) và lưu trong Redis với TTL tự động expire. Khi verify OTP/magic-link thành công, hệ thống tạo `resetToken` (64-char hex) lưu Redis, client dùng token này cùng password mới để gọi API reset. Sau khi reset thành công, password mới được hash và update vào MongoDB, tất cả session bị invalidate. Chống email enumeration bằng cách trả success giả khi email không tồn tại (vẫn validate format).

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
│  Rate Limiter → Validator → ForgotPasswordController                     │
│                                   │                                      │
│                          ForgotPasswordService                           │
│                         /         |          \                           │
│               OtpFPRepo    MagicLinkFPRepo   ResetTokenRepo              │
│                    │              │                │                     │
│                    ▼              ▼                ▼                     │
│              ┌──────────────────────────────┐  ┌──────────┐             │
│              │     Redis (hash storage)     │  │ MongoDB   │             │
│              │ - OTP (hashed, 5min TTL)     │  │ - Update  │             │
│              │ - Magic Link (hashed, 15min) │  │   password│             │
│              │ - Reset Token (hashed, 10min)│  └──────────┘             │
│              │ - Cooldown (60s TTL)         │                            │
│              │ - Failed attempts (15min)    │                            │
│              │ - Resend count              │                            │
│              └──────────────────────────────┘                            │
│                                                                          │
│  SendEmailService ──→ Nodemailer (Gmail SMTP)                           │
│  LoginHistoryService ──→ MongoDB (login-history collection)              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3.3. Data Model

### MongoDB - Không tạo bảng mới

Sử dụng collection `authentication` hiện có. Cần thêm method `updatePassword` vào `AuthenticationRepository`.

```typescript
// Thêm vào AuthenticationRepository
async updatePassword(authId: string, hashedPassword: string): Promise<void> {
  await this.db.findByIdAndUpdate(authId, { password: hashedPassword });
}
```

### Redis - Keys mới

Tất cả keys sử dụng pattern: `{prefix}:{email}` (giống login module).

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
2. Rate limiter check (IP + email)
3. Validator check email format → nếu sai → 422
4. Service:
   a. Check cooldown → nếu chưa hết → 400
   b. Check resend limit → nếu vượt → 400
   c. Tìm auth record bằng email
   d. Nếu email KHÔNG tồn tại hoặc inactive → trả success giả (không gửi email)
   e. Nếu email tồn tại + active:
      - Tạo OTP 6 số → hash (bcrypt) → lưu Redis (TTL 5 min)
      - Set cooldown (60s) + increment resend count
      - Gửi email async (fire-and-forget)
   f. Trả { success: true, expiresIn: 300, cooldown: 60 }

5. Client POST /forgot-password/otp/verify { email, otp }
6. Validator check email + otp format
7. Service:
   a. Check lockout (>= 5 failed attempts) → nếu locked → 400
   b. Tìm auth record → nếu không có → 401
   c. Lấy hashed OTP từ Redis → bcrypt compare
   d. Nếu SAI:
      - Increment failed attempts counter
      - Record failed login history
      - Trả 401 kèm remaining attempts
   e. Nếu ĐÚNG:
      - Tạo resetToken (crypto.randomBytes(64).toString('hex'))
      - Hash resetToken → lưu Redis (TTL 10 min)
      - Cleanup OTP data (otp, cooldown, failed, resend)
      - Trả { success: true, resetToken: "plain text" }

8. Client redirect → /reset-password?email=...&token=...
```

### Flow B: Magic Link

```
1. Client POST /forgot-password/magic-link/send { email }
2. Rate limiter check (IP + email)
3. Validator check email format
4. Service:
   a. Check cooldown → nếu chưa hết → 400
   b. Check resend limit → nếu vượt → 400
   c. Tìm auth record bằng email
   d. Nếu email KHÔNG tồn tại hoặc inactive → trả success giả
   e. Nếu email tồn tại + active:
      - Tạo magic link token (crypto.randomBytes(64).toString('hex'))
      - Hash → lưu Redis (TTL 15 min)
      - Set cooldown + increment resend count
      - Build URL: {CLIENT_URL}/reset-password?email=...&token=...&method=magic-link
      - Gửi email async
   f. Trả { success: true, expiresIn: 900, cooldown: 60 }

5. User click link trong email → GET /reset-password?email=...&token=...&method=magic-link
6. Client detect method=magic-link → POST /forgot-password/magic-link/verify { email, token }
7. Service:
   a. Tìm auth record → nếu không có → 401
   b. Lấy hashed token từ Redis → bcrypt compare
   c. Nếu SAI → record failed login → 401
   d. Nếu ĐÚNG:
      - Tạo resetToken → hash → lưu Redis (TTL 10 min)
      - Cleanup magic link data
      - Trả { success: true, resetToken: "plain text" }
8. Client thay token trong URL bằng resetToken → hiển thị form
```

### Flow C: Reset Password (chung cho cả OTP và Magic Link)

```
1. Client POST /forgot-password/reset { email, resetToken, newPassword }
2. Rate limiter check (IP)
3. Validator check email + resetToken + newPassword format/strength
4. Service:
   a. Lấy hashed resetToken từ Redis → bcrypt compare
   b. Nếu KHÔNG hợp lệ → 401
   c. Nếu hợp lệ:
      - Tìm auth record bằng email
      - Hash newPassword (bcrypt)
      - Update password trong MongoDB
      - Xóa resetToken khỏi Redis
      - Invalidate tất cả session (xóa refresh tokens nếu có)
      - Record successful password reset vào login-history
      - Trả { success: true }
5. Client hiển thị toast success → redirect → /login
```

---

## 3.6. Cấu trúc files mới & thay đổi

### Files MỚI cần tạo

```
SERVER:
server/src/modules/forgot-password/
├── forgot-password.controller.ts       # 5 route handlers
├── forgot-password.service.ts          # Business logic
├── forgot-password.module.ts           # DI wiring, export router
└── repositories/
    ├── otp-forgot-password.repository.ts     # Clone từ otp-login.repository.ts
    ├── magic-link-forgot-password.repository.ts  # Clone từ magic-link-login.repository.ts
    └── reset-token.repository.ts             # Mới - quản lý reset token

server/src/modules/send-email/templates/
└── forgot-password-otp.tsx             # Clone từ login-otp.tsx, đổi text

server/src/types/modules/
└── forgot-password.ts                  # Request/Response types

server/src/validators/schemas/
└── forgot-password.ts                  # Joi schemas cho 5 endpoints

CLIENT:
client/src/dataSources/ForgotPassword/
└── index.ts                            # API functions (sendOtp, verifyOtp, sendMagicLink, verifyMagicLink, resetPassword)
```

### Files CẦN SỬA

```
SERVER:
server/src/constants/config.ts
  → Thêm FORGOT_PASSWORD_OTP_CONFIG, FORGOT_PASSWORD_MAGIC_LINK_CONFIG, FORGOT_PASSWORD_RESET_TOKEN_CONFIG

server/src/constants/infrastructure.ts
  → Thêm REDIS_KEYS.FORGOT_PASSWORD (OTP, cooldown, failed, resend, magic link, reset token)
  → Thêm REDIS_KEYS.RATE_LIMIT.FORGOT_PASSWORD (IP, email)

server/src/constants/enums.ts
  → Thêm LOGIN_METHODS.FORGOT_PASSWORD = "forgot-password"
  → Thêm LOGIN_FAIL_REASONS.INVALID_RESET_TOKEN = "invalid_reset_token"

server/src/modules/send-email/send-email.types.ts
  → Thêm EmailType.FORGOT_PASSWORD_OTP
  → Thêm ForgotPasswordOtpData interface
  → Thêm vào EmailDataMap

server/src/modules/send-email/send-email.service.ts
  → Thêm case FORGOT_PASSWORD_OTP trong renderTemplate() và getSubject()

server/src/modules/send-email/send-email.i18n.ts (nếu có)
  → Thêm translation key cho email subject

server/src/repositories/authentication/index.ts
  → Thêm method updatePassword(authId, hashedPassword)

server/src/middlewares/rate-limiter.ts
  → Thêm 4 getters: forgotPasswordOtpByIp, forgotPasswordOtpByEmail,
    forgotPasswordMagicLinkByIp, forgotPasswordMagicLinkByEmail, forgotPasswordResetByIp

server/src/routes/v1/index.ts
  → Mount: v1Router.use("/auth/forgot-password", forgotPasswordRouter)

server/src/i18n/locales/en/*.json
  → Thêm namespace "forgotPassword" cho error/success messages

server/src/i18n/locales/vi/*.json
  → Thêm namespace "forgotPassword" cho error/success messages

CLIENT:
client/src/views/ForgotPasswordOtp/mains/OtpStepForm/index.tsx
  → Thay TODO bằng API call thực tế (sendOtp, verifyOtp)

client/src/views/ForgotPasswordMagicLink/hooks/useMagicLink.ts
  → Thay TODO bằng API call thực tế (sendMagicLink)

client/src/views/ResetPassword/mains/ResetPasswordForm/index.tsx
  → Thay TODO bằng API call thực tế (resetPassword)
  → Xử lý magic link verify khi có query param method=magic-link

client/src/views/ResetPassword/index.tsx
  → Xử lý thêm logic verify magic link token khi đến từ email link
```

---

## 3.7. Chi tiết thiết kế các Repository

### 3.7.1. OtpForgotPasswordRepository

Clone pattern từ `OtpLoginRepository`. Khác biệt:
- Dùng Redis keys prefix `otp-forgot-pw` thay vì `otp-login`
- Dùng config `FORGOT_PASSWORD_OTP_CONFIG` thay vì `LOGIN_OTP_CONFIG`
- Các methods giống hệt: `createAndStoreOtp`, `verify`, `storeHashed`, `clearOtp`, `checkCooldown`, `getCooldownRemaining`, `setCooldown`, `incrementFailedAttempts`, `isLocked`, `incrementResendCount`, `hasExceededResendLimit`, `setRateLimits`, `cleanupAll`

### 3.7.2. MagicLinkForgotPasswordRepository

Clone pattern từ `MagicLinkLoginRepository`. Khác biệt:
- Dùng Redis keys prefix `ml-forgot-pw` thay vì `magic-link-login`
- Dùng config `FORGOT_PASSWORD_MAGIC_LINK_CONFIG`
- Thêm `resendCount` operations (login magic link không có)
- Methods: `createAndStoreToken`, `verifyToken`, `checkCooldown`, `getCooldownRemaining`, `setCooldownAfterSend`, `incrementResendCount`, `hasExceededResendLimit`, `cleanupAll`

### 3.7.3. ResetTokenRepository (MỚI)

```typescript
class ResetTokenRepository extends RedisCache {
  // Key: "reset-token:{email}" → bcrypt hash of token
  // TTL: 10 minutes

  createToken(): string
  // crypto.randomBytes(64).toString('hex') → 128-char hex

  async storeHashed(email: string, token: string): Promise<void>
  // hash token → Redis setEx (TTL 10 min)

  async verify(email: string, token: string): Promise<boolean>
  // get hash from Redis → bcrypt compare

  async clear(email: string): Promise<void>
  // Redis del
}
```

---

## 3.8. Chi tiết ForgotPasswordService

```typescript
class ForgotPasswordService {
  constructor(
    authRepo: AuthenticationRepository,
    loginHistoryService: LoginHistoryService,
    otpRepo: OtpForgotPasswordRepository,
    magicLinkRepo: MagicLinkForgotPasswordRepository,
    resetTokenRepo: ResetTokenRepository
  )

  // ── Send OTP ──
  async sendOtp(req): Promise<ResponsePattern<OtpSendResponse>>
  // 1. checkCooldown → 2. checkResendLimit → 3. findAuth
  // 4. Nếu không tồn tại/inactive → return fake success
  // 5. createAndStoreOtp → 6. setRateLimits → 7. sendEmail → 8. return success

  // ── Verify OTP ──
  async verifyOtp(req): Promise<ResponsePattern<VerifyResponse>>
  // 1. checkLockout → 2. findAuth → 3. verify OTP
  // 4. Nếu sai → trackFailed → throw error
  // 5. Nếu đúng → createResetToken → cleanupOtp → return resetToken

  // ── Send Magic Link ──
  async sendMagicLink(req): Promise<ResponsePattern<MagicLinkSendResponse>>
  // Pattern giống sendOtp nhưng tạo magic link URL thay vì OTP

  // ── Verify Magic Link ──
  async verifyMagicLink(req): Promise<ResponsePattern<VerifyResponse>>
  // 1. findAuth → 2. verify token
  // 3. Nếu sai → record failed → throw error
  // 4. Nếu đúng → createResetToken → cleanupMagicLink → return resetToken

  // ── Reset Password ──
  async resetPassword(req): Promise<ResponsePattern<{ success: true }>>
  // 1. verify resetToken → 2. findAuth
  // 3. hash newPassword → 4. updatePassword in MongoDB
  // 5. clearResetToken → 6. invalidateSessions → 7. recordHistory → 8. return success

  // ── Private helpers ──
  private async createAndReturnResetToken(email: string): Promise<string>
  // Tạo token → hash → lưu Redis → return plain token

  private async invalidateAllSessions(authId: string): Promise<void>
  // TODO: Xóa refresh tokens (tùy cách lưu session hiện tại)
}
```

---

## 3.9. Xử lý Anti-Enumeration

Khi email không tồn tại hoặc account inactive, service sẽ:

1. **Không throw error** (khác với login flow hiện tại)
2. **Return cùng response format** như khi email tồn tại
3. **Không gửi email** thực tế
4. **Vẫn apply cooldown** nếu muốn (optional - để attacker không nhận ra qua timing)

```typescript
// Pseudo code
async sendOtp(req) {
  // ... check cooldown, resend limit (luôn check trước) ...

  const auth = await this.authRepo.findByEmail(email);

  if (!auth || !auth.isActive) {
    Logger.info("Forgot password OTP - email not found or inactive (fake success)", { email });
    // Trả success giả với cùng format
    return {
      message: t("forgotPassword:success.otpSent"),
      data: { success: true, expiresIn: 300, cooldown: 60 }
    };
  }

  // ... tạo OTP thật, gửi email ...
}
```

---

## 3.10. Session Invalidation Strategy

Sau khi reset password, cần invalidate tất cả session hiện tại. Cách tiếp cận phụ thuộc vào cách lưu session:

**Hiện tại:** Hệ thống dùng JWT stateless (access token + refresh token trong HttpOnly cookie). Không có server-side session store cho refresh tokens.

**Approach đề xuất:** Thêm `passwordChangedAt` field vào Authentication model. Khi verify access token, kiểm tra `iat` (issued at) < `passwordChangedAt` → reject token.

```typescript
// Thêm vào Authentication model
passwordChangedAt: { type: Date, default: null }

// Khi reset password
await this.authRepo.updatePasswordAndTimestamp(authId, hashedPassword);

// Trong auth middleware (kiểm tra khi verify JWT)
if (auth.passwordChangedAt && tokenIssuedAt < auth.passwordChangedAt) {
  throw new UnauthorizedError("Password changed. Please login again.");
}
```

---

## 3.11. Dependencies & Integrations

| Dependency           | Loại     | Mô tả                                    | Đã có? |
| -------------------- | -------- | ---------------------------------------- | ------ |
| Redis                | Internal | Lưu OTP, magic link, reset token (hashed) | ✅ Có  |
| MongoDB              | Internal | Update password, đọc auth record          | ✅ Có  |
| Nodemailer (Gmail)   | External | Gửi OTP/magic link email                  | ✅ Có  |
| bcrypt               | Library  | Hash OTP, token, password                 | ✅ Có  |
| crypto               | Node.js  | Tạo secure random token                   | ✅ Có  |
| Joi                  | Library  | Validate request input                    | ✅ Có  |
| React Email          | Library  | Render email template                     | ✅ Có  |
| LoginHistoryService  | Internal | Ghi log reset password                    | ✅ Có  |

**Không cần thêm package mới.**

---

## 3.12. Migration & Deployment Strategy

**Feature flag:** Không cần. Feature này là module mới, mount thêm route, không ảnh hưởng code hiện tại.

**Database migration:**
- Thêm field `passwordChangedAt: Date | null` vào Authentication model (backward compatible, default null)

**Rollback plan:**
- Xóa route mount `/auth/forgot-password` khỏi `routes/v1/index.ts` → toàn bộ endpoints sẽ trả 404
- Không cần rollback database vì field mới default null, không ảnh hưởng logic hiện tại
- Redis keys tự expire theo TTL

---

## 3.13. Thứ tự implement đề xuất

```
1. Constants & Config (config, infrastructure, enums)
2. Types (forgot-password.ts)
3. Repository: ResetTokenRepository
4. Repository: OtpForgotPasswordRepository
5. Repository: MagicLinkForgotPasswordRepository
6. Auth Repository: thêm updatePassword + passwordChangedAt
7. Email: template + types + service update
8. Validator schemas
9. Rate limiter: thêm getters mới
10. Service: ForgotPasswordService
11. Controller: ForgotPasswordController
12. Module wiring + Route mount
13. i18n translations (EN + VI)
14. Client: dataSources API functions
15. Client: OtpStepForm integration
16. Client: MagicLink integration
17. Client: ResetPassword integration
18. Auth middleware: kiểm tra passwordChangedAt
```
