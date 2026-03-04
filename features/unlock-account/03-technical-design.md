# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Unlock Account cho phép user bị lock tài khoản (do nhập sai mật khẩu nhiều lần) khôi phục quyền truy cập qua mật khẩu tạm thời gửi qua email. Server sinh mật khẩu 16 ký tự (crypto.randomBytes), hash bằng bcrypt, lưu vào MongoDB (auth record). Verify endpoint so sánh mật khẩu tạm thời, nếu đúng thì reset failed attempts (Redis), đánh dấu temp password đã dùng, và trả tokens. Cooldown và rate limit quản lý qua Redis.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client                                 Server (Express)
┌────────────┐                         ┌────────────────────────────────────────┐
│ POST       │                         │ Rate Limiter                           │
│ /request   │──{ email }───────────▶  │   ↓                                   │
│            │                         │ Validation (Joi)                       │
│            │◀──{ success: true }     │   ↓                                   │
│            │                         │ UnlockAccountController                │
│            │                         │   ↓                                   │
│ POST       │                         │ UnlockAccountService                   │
│ /verify    │──{ email, tempPwd }──▶  │   ├── UnlockAccountRepo (Redis)       │
│            │                         │   │     ├── cooldown                   │
│            │◀──{ tokens }            │   │     └── rate limit                 │
│            │  + cookie               │   ├── AuthRepository (MongoDB)         │
│            │                         │   │     ├── storeTempPassword          │
└────────────┘                         │   │     └── markTempPasswordUsed       │
                                       │   ├── FailedAttemptsRepo (Redis)       │
                                       │   │     └── resetAll                   │
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
unlock-token:{email}      → (reserved for future use)
unlock-cooldown:{email}   → cooldown flag (TTL: 60 giây)
unlock-rate:{email}       → request count (TTL: 1 giờ)
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
  "message": "If this email is registered, an unlock email has been sent",
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
  "message": "Account unlocked successfully. You must change your password",
  "data": {
    "accessToken": "string — JWT",
    "idToken": "string — JWT",
    "expiresIn": 28800
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
2. Server: Joi validate email format
3. Server: Kiểm tra cooldown (Redis: unlock-cooldown:{email})
   → Nếu còn cooldown → throw 400 "Please wait X seconds"
4. Server: Kiểm tra rate limit (Redis: unlock-rate:{email})
   → Increment counter, nếu > 3 → throw 429
5. Server: Tìm auth record theo email (MongoDB)
   → Nếu không tồn tại → set cooldown, return { success: true } (không tiết lộ)
6. Server: Kiểm tra auth.isActive
   → Nếu false → throw 400 "Account has been suspended"
7. Server: Kiểm tra account có bị lock không (Redis: FailedAttemptsRepo.checkLockout)
   → Nếu không bị lock → throw 400 "Account is not locked"
8. Server: generateTempPassword():
   a. Lấy 1 ký tự random từ mỗi nhóm (uppercase, lowercase, number, special)
   b. Fill phần còn lại từ ALL_CHARS
   c. Shuffle toàn bộ string (Fisher-Yates)
   → Result: 16 ký tự, đảm bảo chứa đủ 4 loại
9. Server: hashValue(tempPassword) → bcrypt hash
10. Server: authRepo.storeTempPassword(authId, hash, expAt = now + 15 min)
11. Server: sendEmailService.send(UNLOCK_TEMP_PASSWORD, {
      email, data: { tempPassword, loginUrl }, locale
    }) — fire-and-forget
12. Server: Set cooldown 60 giây
13. Server: Return { success: true }
```

### Verify Unlock Flow

```
1. Client gửi POST /unlock/verify { email, tempPassword }
2. Server: Rate limiter loginByIp
3. Server: Joi validate { email, tempPassword (min 12) }
4. Server: Tìm auth record theo email
   → Không tồn tại → throw 401
5. Server: Kiểm tra tempPasswordHash có tồn tại
   → Null → throw 401
6. Server: Kiểm tra tempPasswordExpAt
   → Hết hạn → throw 401 "Temporary password has expired"
7. Server: Kiểm tra tempPasswordUsed
   → True → throw 401
8. Server: bcrypt.compare(tempPassword, tempPasswordHash)
   → Không khớp → throw 401
9. Server: failedAttemptsRepo.resetAll(email) — async với retry (non-blocking)
10. Server: authRepo.markTempPasswordUsed(authId)
11. Server: loginHistoryService.recordSuccessfulLogin({ userId, email, method: password })
12. Server: generateAuthTokensResponse(payload) → { accessToken, refreshToken, idToken, expiresIn }
13. Server: Set refreshToken cookie
14. Server: Return { accessToken, idToken, expiresIn } (refreshToken trong cookie, không trong body)
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/unlock-account/
│   ├── unlock-account.module.ts         # DI setup, export router & service
│   ├── unlock-account.controller.ts     # Route handlers: /request, /verify
│   ├── unlock-account.service.ts        # Business logic (request, verify, generateTempPassword)
│   └── repositories/
│       └── unlock-account.repository.ts # Redis: cooldown + rate limit
├── validators/schemas/
│   └── unlock-account.ts               # Joi schemas (unlockRequestSchema, unlockVerifySchema)
├── types/modules/
│   └── unlock-account.ts               # TypeScript interfaces (UnlockRequestBody, UnlockVerifyBody)
└── i18n/locales/
    ├── en/unlockAccount.json            # English messages
    └── vi/unlockAccount.json            # Vietnamese messages
```

---

## 3.7. Dependencies & Integrations

| Dependency              | Loại     | Mô tả                                             | Ghi chú                          |
| ----------------------- | -------- | -------------------------------------------------- | -------------------------------- |
| MongoDB                 | Internal | Lưu temp password hash trong auth record           | authRepo.storeTempPassword       |
| Redis                   | Internal | Cooldown + rate limit                              | UnlockAccountRepository          |
| bcrypt                  | Library  | Hash + verify temp password                         | Salt rounds: 10                  |
| crypto                  | Library  | Sinh temp password (randomBytes)                    | Node.js built-in                 |
| FailedAttemptsRepo      | Internal | Kiểm tra lockout + reset failed attempts            | Từ login module                  |
| LoginHistoryService     | Internal | Ghi login history sau unlock thành công             | method: password                 |
| SendEmailService        | Internal | Gửi email chứa temp password                       | Type: UNLOCK_TEMP_PASSWORD       |
| express-rate-limit      | Library  | Rate limit verify endpoint (shared loginByIp)       | Middleware                       |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Temp passwords đã lưu trong MongoDB vẫn hết hạn tự nhiên (15 phút)
- Redis cooldown/rate keys tự hết hạn theo TTL
- User có thể chờ hết lockout và đăng nhập bình thường nếu feature bị rollback
