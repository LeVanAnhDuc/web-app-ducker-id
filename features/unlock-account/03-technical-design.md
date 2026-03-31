# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Unlock Account cho phép user bị lock tài khoản (do nhập sai mật khẩu nhiều lần) khôi phục quyền truy cập qua mật khẩu tạm thời gửi qua email. Server sinh mật khẩu 16 ký tự (crypto.randomBytes), hash bằng bcrypt, lưu vào MongoDB (auth record). Verify endpoint so sánh mật khẩu tạm thời, nếu đúng thì reset failed attempts (Redis), đánh dấu temp password đã dùng, và trả tokens. Cooldown và rate limit quản lý qua Redis.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client                                 Server (Express)
┌────────────┐                         ┌────────────────────────────────────────┐
│ POST       │                         │ Rate Limiter (loginByIp — chỉ /verify)│
│ /request   │──{ email }───────────▶  │   ↓                                   │
│            │                         │ Validation (bodyPipe + Joi)            │
│            │◀──{ success: true }     │   ↓                                   │
│            │                         │ UnlockAccountController                │
│            │                         │   ↓                                   │
│ POST       │                         │ UnlockAccountService                   │
│ /verify    │──{ email, tempPwd }──▶  │   ├── UnlockAccountHelper             │
│            │                         │   │     ├── checkCooldown              │
│            │◀──{ tokens }            │   │     ├── checkRateLimit             │
│            │  + cookie               │   │     ├── ensureAuthExists           │
│            │                         │   │     ├── ensureTempPasswordValid    │
│            │                         │   │     └── generateTempPassword       │
└────────────┘                         │   ├── RedisUnlockAccountRepo (Redis)   │
                                       │   │     ├── cooldown                   │
                                       │   │     └── rate limit                 │
                                       │   ├── AuthenticationService (MongoDB)  │
                                       │   │     ├── storeTempPassword          │
                                       │   │     ├── markTempPasswordUsed       │
                                       │   │     ├── findByEmail               │
                                       │   │     └── findUserByAuthId          │
                                       │   ├── LoginService                     │
                                       │   │     ├── checkLockout              │
                                       │   │     └── resetFailedAttempts       │
                                       │   ├── LoginHistoryService              │
                                       │   └── SendEmailService                 │
                                       └────────────────────────────────────────┘
```

---

## 3.3. Data Model

### Collection: `auths` (fields liên quan đến unlock)

```typescript
{
  // ... existing fields ...
  tempPasswordHash:  String | null,   // bcrypt hash của mật khẩu tạm thời
  tempPasswordExpAt: Date | null,     // thời điểm hết hạn (15 phút từ lúc tạo)
  tempPasswordUsed:  Boolean          // đã sử dụng chưa (single-use)
}
```

### Redis Keys

```
login-unlock-token:{email}   → (reserved for future use)
unlock-cooldown:{email}      → cooldown flag (TTL: 60 giây)
unlock-rate:{email}          → request count (TTL: 1 giờ)
```

---

## 3.4. API Design

### Endpoint 1: Request Unlock

```
POST /api/v1/auth/unlock/request

Request Body:
{
  "email": "string — email tài khoản bị lock"
}

Response 200:
{
  "message": "unlockAccount:success.unlockEmailSent",
  "data": {
    "success": true
  }
}

Response 400: Cooldown chưa hết / tài khoản không bị lock / tài khoản bị suspended
Response 429: Rate limit exceeded (3 req/email/giờ)
```

### Endpoint 2: Verify Unlock

```
POST /api/v1/auth/unlock/verify

Request Body:
{
  "email": "string",
  "tempPassword": "string — mật khẩu tạm thời (>= 12 ký tự)"
}

Response 200:
{
  "message": "unlockAccount:success.accountUnlocked",
  "data": {
    "accessToken": "string — JWT",
    "idToken": "string — JWT",
    "expiresIn": number
  }
}

Set-Cookie: refreshToken={jwt}; HttpOnly; Secure; SameSite=Lax; Path=/

Response 401: Mật khẩu tạm thời sai / hết hạn / đã sử dụng / email không tồn tại
Response 429: Login rate limit (shared loginByIp)
```

---

## 3.5. Luồng xử lý chính (Main Flow)

### Request Unlock Flow

```
1. Client gửi POST /unlock/request { email }
2. Server: bodyPipe(unlockRequestSchema) — Joi validate email format
3. Server: checkCooldown() — kiểm tra cooldown (Redis: unlock-cooldown:{email})
   → Nếu còn cooldown → throw BadRequestError "unlockAccount:errors.unlockCooldown"
4. Server: checkRateLimit() — kiểm tra rate limit (Redis: unlock-rate:{email})
   → Increment counter, nếu > 3 → throw TooManyRequestsError
5. Server: authenticationService.findByEmail(email)
   → Nếu không tồn tại → setCooldown, return toUnlockRequestDto() (không tiết lộ)
6. Server: Kiểm tra auth.isActive
   → Nếu false → throw BadRequestError "unlockAccount:errors.accountDisabled"
7. Server: loginService.checkLockout(email)
   → Nếu không bị lock → throw BadRequestError "unlockAccount:errors.accountNotLocked"
8. Server: generateTempPassword():
   a. Lấy 1 ký tự random từ mỗi nhóm (uppercase, lowercase, number, special)
   b. Fill phần còn lại từ ALL_CHARS
   c. Shuffle toàn bộ string (Fisher-Yates)
   → Result: 16 ký tự, đảm bảo chứa đủ 4 loại
9. Server: hashValue(tempPassword) → bcrypt hash
10. Server: authenticationService.storeTempPassword(authId, hash, expAt = now + 15 min)
11. Server: emailService.send(EmailType.UNLOCK_TEMP_PASSWORD, {
      email, data: { tempPassword, loginUrl }, locale
    }) — fire-and-forget (không await)
12. Server: unlockAccountRepo.setCooldown(email) — 60 giây
13. Server: Return toUnlockRequestDto() → { success: true }
```

### Verify Unlock Flow

```
1. Client gửi POST /unlock/verify { email, tempPassword }
2. Server: Rate limiter loginByIp (middleware)
3. Server: bodyPipe(unlockVerifySchema) — Joi validate { email, tempPassword (min 12) }
4. Server: ensureAuthExists() — tìm auth record theo email
   → Không tồn tại → throw UnauthorizedError
5. Server: ensureTempPasswordValid() — kiểm tra tuần tự:
   a. tempPasswordHash có tồn tại → null → throw UnauthorizedError
   b. tempPasswordExpAt → hết hạn → throw UnauthorizedError "tempPasswordExpired"
   c. tempPasswordUsed → true → throw UnauthorizedError
   d. isValidHashedValue(tempPassword, hash) → không khớp → throw UnauthorizedError
6. Server: withRetry(() => loginService.resetFailedAttempts(email)) — non-blocking
7. Server: authenticationService.markTempPasswordUsed(authId)
8. Server: loginHistoryService.recordSuccessfulLogin({
     userId, usernameAttempted: email, loginMethod: LOGIN_METHODS.PASSWORD, req
   }) — fire-and-forget (không await)
9. Server: authenticationService.findUserByAuthId(authId) → user
   → Nếu không tìm thấy → throw NotFoundError
10. Server: generateAuthTokensResponse({ userId, authId, email, roles, fullName, avatar })
11. Server: toUnlockVerifyDto(tokensResponse) → { accessToken, refreshToken, idToken, expiresIn }
12. Controller: tách refreshToken ra khỏi responseData, set cookie
13. Server: Return { accessToken, idToken, expiresIn } (refreshToken trong cookie, không trong body)
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/unlock-account/
│   ├── unlock-account.module.ts         # DI setup (factory function), export router & service
│   ├── unlock-account.controller.ts     # Route handlers: unlockRequest, unlockVerify
│   ├── unlock-account.routes.ts         # Route wiring: createUnlockAccountRoutes(controller, rateLimiter)
│   ├── unlock-account.service.ts        # Business logic (unlockRequest, unlockVerify)
│   ├── unlock-account.helper.ts         # Pure functions: checkCooldown, checkRateLimit,
│   │                                    #   ensureAuthExists, ensureTempPasswordValid,
│   │                                    #   generateTempPassword
│   ├── repositories/
│   │   └── unlock-account.repository.ts # Redis: cooldown + rate limit
│   │                                    #   type UnlockAccountRepository (contract)
│   │                                    #   class RedisUnlockAccountRepository (implementation)
│   └── dtos/
│       ├── index.ts                     # Barrel export
│       ├── unlock-request.dto.ts        # UnlockRequestDto + toUnlockRequestDto()
│       └── unlock-verify.dto.ts         # UnlockVerifyDto + toUnlockVerifyDto()
├── validators/schemas/
│   └── unlock-account.ts               # Joi schemas (unlockRequestSchema, unlockVerifySchema)
├── types/modules/
│   └── unlock-account.ts               # TypeScript interfaces (UnlockRequestBody, UnlockVerifyBody,
│                                        #   UnlockRequest, UnlockVerifyRequest)
├── constants/
│   ├── modules/
│   │   ├── login-history/index.ts       # LOGIN_METHODS (dùng bởi unlock verify)
│   │   └── token/index.ts              # REFRESH_TOKEN (cookie name)
│   └── redis/
│       └── store/index.ts              # Redis key prefixes: LOGIN.UNLOCK_TOKEN,
│                                        #   LOGIN.UNLOCK_COOLDOWN, LOGIN.UNLOCK_RATE
└── i18n/locales/
    ├── en/unlockAccount.json            # English messages
    └── vi/unlockAccount.json            # Vietnamese messages
```

---

## 3.7. Dependencies & Integrations

| Dependency                | Loại     | Mô tả                                                      | Ghi chú                                                        |
| ------------------------- | -------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| MongoDB                   | Internal | Lưu temp password hash trong auth record                    | Qua AuthenticationService                                      |
| Redis                     | Internal | Cooldown + rate limit                                       | RedisUnlockAccountRepository                                   |
| bcrypt                    | Library  | Hash + verify temp password                                 | hashValue(), isValidHashedValue() từ @/utils/crypto/bcrypt     |
| crypto                    | Library  | Sinh temp password (randomBytes)                            | Node.js built-in                                               |
| AuthenticationService     | Internal | findByEmail, storeTempPassword, markTempPasswordUsed, findUserByAuthId | Từ modules/authentication                               |
| LoginService              | Internal | checkLockout + resetFailedAttempts                          | Từ modules/login                                               |
| LoginHistoryService       | Internal | Ghi login history sau unlock thành công                     | loginMethod: LOGIN_METHODS.PASSWORD                            |
| SendEmailService          | Internal | Gửi email chứa temp password                               | EmailType.UNLOCK_TEMP_PASSWORD — từ @/services/email           |
| RateLimiterMiddleware     | Internal | Rate limit verify endpoint (loginByIp)                      | Từ @/middlewares, truyền vào routes factory                    |
| bodyPipe                  | Internal | Joi validation middleware                                   | Từ @/middlewares (pipes/validation.pipe)                       |
| withRetry                 | Utility  | Retry cho resetFailedAttempts (non-blocking)                | Từ @/utils/retry                                               |
| generateAuthTokensResponse| Utility  | Sinh JWT tokens (accessToken, refreshToken, idToken)        | Từ @/utils/token                                               |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Temp passwords đã lưu trong MongoDB vẫn hết hạn tự nhiên (15 phút)
- Redis cooldown/rate keys tự hết hạn theo TTL
- User có thể chờ hết lockout và đăng nhập bình thường nếu feature bị rollback
