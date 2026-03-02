# IMPLEMENTATION PLAN: FORGOT PASSWORD

> Tạo tự động từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement.

---

## Tổng quan

| Mục          | Giá trị        |
| ------------ | -------------- |
| Tổng số task | 29             |
| Hoàn thành   | 18/29          |
| Tiến độ      | 62%            |
| Ngày bắt đầu | 02/03/2026     |

---

## Thứ tự implement

### Phase 1: Setup & Foundation

#### TASK-001: Thêm constants — config, Redis keys, enums

- **Tham chiếu:** TL3 - Mục 3.3, 3.9
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** Không có (task đầu tiên)
- **Checklist:**
  - [ ] Thêm `FORGOT_PASSWORD_OTP_CONFIG` vào `constants/config.ts` (LENGTH, EXPIRY_MINUTES, COOLDOWN_SECONDS, MAX_FAILED_ATTEMPTS, MAX_RESEND_ATTEMPTS, LOCKOUT_DURATION_MINUTES)
  - [ ] Thêm `FORGOT_PASSWORD_MAGIC_LINK_CONFIG` vào `constants/config.ts` (TOKEN_LENGTH, EXPIRY_MINUTES, COOLDOWN_SECONDS, MAX_RESEND_ATTEMPTS)
  - [ ] Thêm `FORGOT_PASSWORD_RESET_TOKEN_CONFIG` vào `constants/config.ts` (TOKEN_LENGTH, EXPIRY_MINUTES)
  - [ ] Thêm `REDIS_KEYS.FORGOT_PASSWORD` vào `constants/infrastructure.ts` (OTP, OTP_COOLDOWN, OTP_FAILED_ATTEMPTS, OTP_RESEND_COUNT, MAGIC_LINK, MAGIC_LINK_COOLDOWN, MAGIC_LINK_RESEND_COUNT, RESET_TOKEN)
  - [ ] Thêm `REDIS_KEYS.RATE_LIMIT.FORGOT_PASSWORD` vào `constants/infrastructure.ts` (OTP_IP, OTP_EMAIL, MAGIC_LINK_IP, MAGIC_LINK_EMAIL, RESET_IP)
  - [ ] Thêm `RATE_LIMIT_CONFIG.FORGOT_PASSWORD` vào `constants/config.ts`
  - [ ] Thêm `LOGIN_METHODS.FORGOT_PASSWORD = "forgot-password"` vào `constants/enums.ts`
  - [ ] Thêm `LOGIN_FAIL_REASONS.INVALID_RESET_TOKEN = "invalid_reset_token"` vào `constants/enums.ts`
- **Files sẽ tạo/sửa:**
  - `server/src/constants/config.ts` (sửa)
  - `server/src/constants/infrastructure.ts` (sửa)
  - `server/src/constants/enums.ts` (sửa)

---

#### TASK-002: Thêm TypeScript types cho forgot-password module

- **Tham chiếu:** TL3 - Mục 3.4
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo file `types/modules/forgot-password.ts`
  - [ ] Định nghĩa request body interfaces: `FPOtpSendBody`, `FPOtpVerifyBody`, `FPMagicLinkSendBody`, `FPMagicLinkVerifyBody`, `FPResetPasswordBody`
  - [ ] Định nghĩa request types (Express Request generics): `FPOtpSendRequest`, `FPOtpVerifyRequest`, `FPMagicLinkSendRequest`, `FPMagicLinkVerifyRequest`, `FPResetPasswordRequest`
  - [ ] Định nghĩa response interfaces: `FPOtpSendResponse`, `FPVerifyResponse`, `FPMagicLinkSendResponse`, `FPResetPasswordResponse`
- **Files sẽ tạo/sửa:**
  - `server/src/types/modules/forgot-password.ts` (tạo mới)

---

#### TASK-003: Thêm Joi validation schemas cho 5 endpoints

- **Tham chiếu:** TL3 - Mục 3.4, TL2 - Mục 2.3
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo file `validators/schemas/forgot-password.ts`
  - [ ] Schema `fpOtpSendSchema`: email (required, email format)
  - [ ] Schema `fpOtpVerifySchema`: email (required, email format) + otp (required, 6 digits)
  - [ ] Schema `fpMagicLinkSendSchema`: email (required, email format)
  - [ ] Schema `fpMagicLinkVerifySchema`: email (required, email format) + token (required, hex format, length = TOKEN_LENGTH * 2)
  - [ ] Schema `fpResetPasswordSchema`: email (required) + resetToken (required, hex, length) + newPassword (required, min 8, strength rules)
  - [ ] Verify: follow exact pattern từ `validators/schemas/login.ts`
- **Files sẽ tạo/sửa:**
  - `server/src/validators/schemas/forgot-password.ts` (tạo mới)
- **Test cần pass:** TC-01.5, TC-03.5, TC-05.4, TC-05.5

---

#### TASK-004: Thêm updatePassword + passwordChangedAt vào Auth model & repository

- **Tham chiếu:** TL3 - Mục 3.3, 3.10
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** Không có
- **Checklist:**
  - [ ] Thêm field `passwordChangedAt: { type: Date, default: null }` vào `models/authentication.ts`
  - [ ] Thêm field `passwordChangedAt` vào `types/modules/authentication.ts` (AuthenticationDocument interface)
  - [ ] Thêm method `updatePassword(authId: string, hashedPassword: string): Promise<void>` vào `repositories/authentication/index.ts` — update cả `password` và `passwordChangedAt: new Date()`
- **Files sẽ tạo/sửa:**
  - `server/src/models/authentication.ts` (sửa)
  - `server/src/types/modules/authentication.ts` (sửa)
  - `server/src/repositories/authentication/index.ts` (sửa)

---

### Phase 2: Backend - Repositories

#### TASK-005: Implement ResetTokenRepository

- **Tham chiếu:** TL3 - Mục 3.7.3
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo file `modules/forgot-password/repositories/reset-token.repository.ts`
  - [ ] Extend `RedisCache`, constructor nhận `RedisClientType`
  - [ ] Key builder: `resetTokenKey(email)` → `"reset-token:{email}"`
  - [ ] `createToken()`: `crypto.randomBytes(64).toString('hex')` → 128-char hex
  - [ ] `storeHashed(email, token)`: hash (bcrypt) → `setEx` (TTL from config)
  - [ ] `verify(email, token)`: get hash → `isValidHashedValue`
  - [ ] `clear(email)`: `del` key
  - [ ] `createAndStore(email)`: composite — create + clear old + store → return plain token
  - [ ] Readonly property `RESET_TOKEN_EXPIRY_SECONDS`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/repositories/reset-token.repository.ts` (tạo mới)
- **Test cần pass:** TC-02.1, TC-04.1, TC-05.2, TC-05.3

---

#### TASK-006: Implement OtpForgotPasswordRepository

- **Tham chiếu:** TL3 - Mục 3.7.1
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo file `modules/forgot-password/repositories/otp-forgot-password.repository.ts`
  - [ ] Clone structure từ `modules/login/repositories/otp-login.repository.ts`
  - [ ] Đổi KEYS sang `REDIS_KEYS.FORGOT_PASSWORD.OTP`, `OTP_COOLDOWN`, `OTP_FAILED_ATTEMPTS`, `OTP_RESEND_COUNT`
  - [ ] Đổi config sang `FORGOT_PASSWORD_OTP_CONFIG`
  - [ ] Giữ nguyên tất cả methods: createOtp, storeHashed, clearOtp, verify, checkCooldown, getCooldownRemaining, setCooldown, clearCooldown, incrementFailedAttempts, getFailedAttemptCount, clearFailedAttempts, isLocked, incrementResendCount, getResendAttemptCount, hasExceededResendLimit, createAndStoreOtp, setRateLimits, cleanupAll
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/repositories/otp-forgot-password.repository.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.3, TC-01.4, TC-02.1, TC-02.3, TC-02.4

---

#### TASK-007: Implement MagicLinkForgotPasswordRepository

- **Tham chiếu:** TL3 - Mục 3.7.2
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo file `modules/forgot-password/repositories/magic-link-forgot-password.repository.ts`
  - [ ] Clone structure từ `modules/login/repositories/magic-link-login.repository.ts`
  - [ ] Đổi KEYS sang `REDIS_KEYS.FORGOT_PASSWORD.MAGIC_LINK`, `MAGIC_LINK_COOLDOWN`, `MAGIC_LINK_RESEND_COUNT`
  - [ ] Đổi config sang `FORGOT_PASSWORD_MAGIC_LINK_CONFIG`
  - [ ] Thêm resend count operations (không có trong login magic link): `incrementResendCount`, `getResendAttemptCount`, `hasExceededResendLimit`, `clearResendCount`
  - [ ] Composite: `createAndStoreToken`, `setCooldownAfterSend`, `setRateLimits`, `cleanupAll`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/repositories/magic-link-forgot-password.repository.ts` (tạo mới)
- **Test cần pass:** TC-03.1, TC-03.3, TC-03.4, TC-04.1, TC-04.2, TC-04.3

---

### Phase 3: Backend - Email & Rate Limiter

#### TASK-008: Tạo email template forgot-password-otp.tsx

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done (merged với TASK-009)
- **Depends on:** Không có
- **Checklist:**
  - [ ] Clone `modules/send-email/templates/login-otp.tsx` → `forgot-password-otp.tsx`
  - [ ] Đổi component name: `ForgotPasswordOtpEmail`
  - [ ] Đổi text/heading phù hợp context forgot password (không phải login)
  - [ ] Hỗ trợ locale (EN + VI) giống template hiện có
  - [ ] Verify render output bằng React Email preview (nếu có)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/send-email/templates/forgot-password-otp.tsx` (tạo mới)

---

#### TASK-009: Update send-email types, service, i18n cho email mới

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 0.5h
- **Trạng thái:** ✅ Done (merged với TASK-008)
- **Depends on:** TASK-008
- **Checklist:**
  - [ ] Thêm `FORGOT_PASSWORD_OTP = "FORGOT_PASSWORD_OTP"` vào `EmailType` enum trong `send-email.types.ts`
  - [ ] Thêm `ForgotPasswordOtpData` interface (giống `LoginOtpData`: otp + expiryMinutes)
  - [ ] Thêm mapping `[EmailType.FORGOT_PASSWORD_OTP]: ForgotPasswordOtpData` vào `EmailDataMap`
  - [ ] Thêm case `EmailType.FORGOT_PASSWORD_OTP` trong `renderTemplate()` của `send-email.service.ts`
  - [ ] Thêm case `EmailType.FORGOT_PASSWORD_OTP` trong `getSubject()` của `send-email.service.ts`
  - [ ] Thêm i18n key cho email subject trong `send-email.i18n.ts` (nếu có) hoặc locale files
- **Files sẽ tạo/sửa:**
  - `server/src/modules/send-email/send-email.types.ts` (sửa)
  - `server/src/modules/send-email/send-email.service.ts` (sửa)
  - `server/src/modules/send-email/send-email.i18n.ts` (sửa — nếu tồn tại)

---

#### TASK-010: Thêm rate limiter getters cho forgot-password

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-001 (cần RATE_LIMIT_CONFIG + REDIS_KEYS)
- **Checklist:**
  - [ ] Thêm getter `forgotPasswordOtpByIp` vào `RateLimiterMiddleware` — 10 req/IP/15min
  - [ ] Thêm getter `forgotPasswordOtpByEmail` — 5 req/email/15min, keyGenerator từ `req.body.email`
  - [ ] Thêm getter `forgotPasswordMagicLinkByIp` — 10 req/IP/15min
  - [ ] Thêm getter `forgotPasswordMagicLinkByEmail` — 5 req/email/15min
  - [ ] Thêm getter `forgotPasswordResetByIp` — 10 req/IP/15min
  - [ ] Follow exact pattern từ `loginOtpByIp`, `loginOtpByEmail` hiện có
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/rate-limiter.ts` (sửa)
- **Test cần pass:** TC-01.1 (rate limit), TC-03.1 (rate limit)

---

#### TASK-011: Thêm rate limit config trong constants

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 0.5h
- **Trạng thái:** ✅ Done (merged vào TASK-001)
- **Depends on:** Không có (đã merge vào TASK-001, nhưng tách ra cho rõ ràng)
- **Checklist:**
  - [ ] Verify `RATE_LIMIT_CONFIG.FORGOT_PASSWORD` đã được thêm ở TASK-001
  - [ ] Cấu trúc: `OTP: { PER_IP: { MAX_REQUESTS: 10, WINDOW_SECONDS: 900 }, PER_EMAIL: { MAX_REQUESTS: 5, WINDOW_SECONDS: 900 } }`
  - [ ] Tương tự cho `MAGIC_LINK` và `RESET` (chỉ PER_IP)
  - [ ] Verify tất cả REDIS_KEYS.RATE_LIMIT.FORGOT_PASSWORD đã đúng
- **Files sẽ tạo/sửa:**
  - `server/src/constants/config.ts` (verify/sửa)
  - `server/src/constants/infrastructure.ts` (verify/sửa)

---

### Phase 4: Backend - Service & Controller

#### TASK-012: Implement ForgotPasswordService — sendOtp + verifyOtp

- **Tham chiếu:** TL3 - Mục 3.5, 3.8, 3.9
- **Ước lượng:** 3h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-005, TASK-006, TASK-009
- **Checklist:**
  - [ ] Tạo file `modules/forgot-password/forgot-password.service.ts`
  - [ ] Constructor nhận: authRepo, loginHistoryService, otpRepo, magicLinkRepo, resetTokenRepo
  - [ ] `sendOtp(req)`:
    - [ ] Check cooldown (reuse `ensureCooldownExpired` pattern)
    - [ ] Check resend limit
    - [ ] Find auth by email
    - [ ] Nếu KHÔNG tồn tại hoặc inactive → return fake success (anti-enumeration)
    - [ ] Tạo OTP → hash → store Redis
    - [ ] Set rate limits (cooldown + resend count)
    - [ ] Send email async (fire-and-forget)
    - [ ] Return `{ success: true, expiresIn, cooldown }`
  - [ ] `verifyOtp(req)`:
    - [ ] Check lockout (isLocked)
    - [ ] Find auth → nếu không có → 401
    - [ ] Verify OTP từ Redis
    - [ ] Nếu sai → increment failed + record history → throw error kèm remaining attempts
    - [ ] Nếu đúng → createAndStore resetToken → cleanup OTP data → return `{ success, resetToken }`
  - [ ] Private helpers: `ensureOtpNotLocked`, `handleInvalidOtp`, `trackFailedOtpAttempt`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/forgot-password.service.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-01.3, TC-01.4, TC-01.6, TC-02.1, TC-02.2, TC-02.3, TC-02.4, TC-02.5

---

#### TASK-013: Implement ForgotPasswordService — sendMagicLink + verifyMagicLink

- **Tham chiếu:** TL3 - Mục 3.5, 3.8
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-005, TASK-007, TASK-012 (cùng file service)
- **Checklist:**
  - [ ] `sendMagicLink(req)`:
    - [ ] Check cooldown
    - [ ] Check resend limit
    - [ ] Find auth → fake success nếu không tồn tại/inactive
    - [ ] Tạo magic link token → hash → store Redis
    - [ ] Build URL: `{CLIENT_URL}/reset-password?email=...&token=...&method=magic-link`
    - [ ] Set cooldown + resend count
    - [ ] Send email async
    - [ ] Return `{ success: true, expiresIn, cooldown }`
  - [ ] `verifyMagicLink(req)`:
    - [ ] Find auth → nếu không có → 401
    - [ ] Verify token từ Redis
    - [ ] Nếu sai → record failed history → 401
    - [ ] Nếu đúng → createAndStore resetToken → cleanup magic link data → return `{ success, resetToken }`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/forgot-password.service.ts` (sửa — thêm methods)
- **Test cần pass:** TC-03.1, TC-03.2, TC-03.3, TC-03.4, TC-04.1, TC-04.2, TC-04.3, TC-04.4

---

#### TASK-014: Implement ForgotPasswordService — resetPassword

- **Tham chiếu:** TL3 - Mục 3.5, 3.8, 3.10
- **Ước lượng:** 2h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-004, TASK-005, TASK-012 (cùng file service)
- **Checklist:**
  - [ ] `resetPassword(req)`:
    - [ ] Verify resetToken từ Redis → nếu invalid/expired → 401
    - [ ] Find auth by email → nếu không có → 401
    - [ ] Hash newPassword (bcrypt)
    - [ ] Call `authRepo.updatePassword(authId, hashedPassword)` — cập nhật password + passwordChangedAt
    - [ ] Clear resetToken từ Redis
    - [ ] Record successful password reset vào login-history (method: FORGOT_PASSWORD)
    - [ ] Return `{ success: true }`
  - [ ] Error handling: nếu MongoDB update fail → KHÔNG xóa resetToken (để user retry)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/forgot-password.service.ts` (sửa — thêm method)
- **Test cần pass:** TC-05.1, TC-05.2, TC-05.3, TC-05.6, TC-05.7

---

#### TASK-015: Implement ForgotPasswordController (5 endpoints)

- **Tham chiếu:** TL3 - Mục 3.4
- **Ước lượng:** 1.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-003, TASK-010, TASK-012, TASK-013, TASK-014
- **Checklist:**
  - [ ] Tạo file `modules/forgot-password/forgot-password.controller.ts`
  - [ ] `POST /otp/send` — rate limiter (IP + email) → validate → service.sendOtp → OkSuccess
  - [ ] `POST /otp/verify` — rate limiter (IP) → validate → service.verifyOtp → OkSuccess
  - [ ] `POST /magic-link/send` — rate limiter (IP + email) → validate → service.sendMagicLink → OkSuccess
  - [ ] `POST /magic-link/verify` — rate limiter (IP) → validate → service.verifyMagicLink → OkSuccess
  - [ ] `POST /reset` — rate limiter (IP) → validate → service.resetPassword → OkSuccess
  - [ ] Follow exact pattern từ `login.controller.ts` (Router, asyncHandler, validate middleware)
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/forgot-password.controller.ts` (tạo mới)

---

#### TASK-016: Module wiring + Route mount

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 0.5h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-015
- **Checklist:**
  - [ ] Tạo file `modules/forgot-password/forgot-password.module.ts`
  - [ ] Instantiate: otpRepo, magicLinkRepo, resetTokenRepo (all with redisClient)
  - [ ] Instantiate: ForgotPasswordService (inject authRepo, loginHistoryService, 3 repos)
  - [ ] Instantiate: ForgotPasswordController (inject service)
  - [ ] Export `forgotPasswordRouter = controller.router`
  - [ ] Mount trong `routes/v1/index.ts`: `v1Router.use("/auth/forgot-password", forgotPasswordRouter)`
- **Files sẽ tạo/sửa:**
  - `server/src/modules/forgot-password/forgot-password.module.ts` (tạo mới)
  - `server/src/routes/v1/index.ts` (sửa)

---

### Phase 5: Backend - Auth Middleware & i18n

#### TASK-017: Update auth middleware — kiểm tra passwordChangedAt

- **Tham chiếu:** TL3 - Mục 3.10
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done
- **Depends on:** TASK-004
- **Checklist:**
  - [ ] Đọc `middlewares/auth.ts` để hiểu flow verify JWT hiện tại
  - [ ] Sau khi verify access token thành công, lấy auth record từ DB/cache
  - [ ] Kiểm tra: nếu `auth.passwordChangedAt` tồn tại VÀ `tokenIssuedAt < passwordChangedAt.getTime() / 1000` → throw `UnauthorizedError("Password changed. Please login again.")`
  - [ ] Thêm i18n key cho error message
  - [ ] Test: login → reset password → gọi API với old token → phải bị reject
- **Files sẽ tạo/sửa:**
  - `server/src/middlewares/auth.ts` (sửa)
- **Test cần pass:** TC-05.1 (session invalidation), NF-04

---

#### TASK-018: Thêm i18n translations (EN + VI) cho backend

- **Tham chiếu:** TL2 - NF-08
- **Ước lượng:** 1h
- **Trạng thái:** ✅ Done (đã hoàn thành từ TASK-010)
- **Depends on:** TASK-012, TASK-013, TASK-014 (cần biết tất cả message keys)
- **Checklist:**
  - [ ] Tạo/sửa file `i18n/locales/en/forgotPassword.json` (hoặc namespace phù hợp)
  - [ ] Tạo/sửa file `i18n/locales/vi/forgotPassword.json`
  - [ ] Keys cần có:
    - `success.otpSent` — "OTP has been sent to your email"
    - `success.otpVerified` — "OTP verified successfully"
    - `success.magicLinkSent` — "Magic link has been sent to your email"
    - `success.magicLinkVerified` — "Magic link verified successfully"
    - `success.passwordReset` — "Password has been reset successfully"
    - `errors.otpCooldown` — "Please wait {{seconds}} seconds..."
    - `errors.otpResendLimitExceeded` — "Resend limit exceeded..."
    - `errors.otpLocked` — "Too many failed attempts. Try again in {{minutes}} minutes"
    - `errors.invalidOtpWithRemaining` — "Invalid OTP. {{remaining}} attempts remaining"
    - `errors.invalidMagicLink` — "Invalid or expired magic link"
    - `errors.magicLinkCooldown` — "Please wait {{seconds}} seconds..."
    - `errors.magicLinkResendLimitExceeded` — "Resend limit exceeded..."
    - `errors.invalidResetToken` — "Invalid or expired reset token"
    - `errors.rateLimitExceeded` — "Too many requests..."
    - `errors.passwordChangedPleaseLogin` — "Password changed. Please login again."
  - [ ] Register namespace trong i18n config nếu cần
- **Files sẽ tạo/sửa:**
  - `server/src/i18n/locales/en/forgotPassword.json` (tạo mới hoặc sửa)
  - `server/src/i18n/locales/vi/forgotPassword.json` (tạo mới hoặc sửa)

---

### Phase 6: Frontend - API & Integration

#### TASK-019: Tạo dataSources/ForgotPassword (API functions)

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-016 (backend API phải sẵn sàng)
- **Checklist:**
  - [ ] Tạo file `client/src/dataSources/ForgotPassword/index.ts`
  - [ ] `sendOtp(email: string)` → POST `/auth/forgot-password/otp/send`
  - [ ] `verifyOtp(email: string, otp: string)` → POST `/auth/forgot-password/otp/verify` → return `{ resetToken }`
  - [ ] `sendMagicLink(email: string)` → POST `/auth/forgot-password/magic-link/send`
  - [ ] `verifyMagicLink(email: string, token: string)` → POST `/auth/forgot-password/magic-link/verify` → return `{ resetToken }`
  - [ ] `resetPassword(email: string, resetToken: string, newPassword: string)` → POST `/auth/forgot-password/reset`
  - [ ] Follow pattern từ dataSources hiện có (Axios instance, error handling)
- **Files sẽ tạo/sửa:**
  - `client/src/dataSources/ForgotPassword/index.ts` (tạo mới)

---

#### TASK-020: Integrate OtpStepForm với API (send + verify + resend)

- **Tham chiếu:** TL1 - US-01, US-02, US-06
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-019
- **Checklist:**
  - [ ] Mở `views/ForgotPasswordOtp/mains/OtpStepForm/index.tsx`
  - [ ] Thay `handleVerify` TODO:
    - [ ] Gọi `verifyOtp(email, otp)`
    - [ ] Nhận `resetToken` từ response
    - [ ] Navigate đến `/reset-password?email=...&token=...` (dùng resetToken, KHÔNG phải OTP)
    - [ ] Handle errors: hiển thị toast cho OTP sai/hết hạn/locked
  - [ ] Thay `handleResend` TODO:
    - [ ] Gọi `sendOtp(email)`
    - [ ] Handle cooldown error (hiển thị thời gian còn lại)
    - [ ] Handle resend limit error
  - [ ] Thêm initial send OTP khi component mount (hoặc verify đã gửi từ trang trước)
- **Files sẽ tạo/sửa:**
  - `client/src/views/ForgotPasswordOtp/mains/OtpStepForm/index.tsx` (sửa)
- **Test cần pass:** TC-01.1, TC-02.1, TC-02.3, TC-02.4, TC-06.1, TC-06.2, TC-06.3

---

#### TASK-021: Integrate MagicLink flow với API (send + resend)

- **Tham chiếu:** TL1 - US-03, US-06
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-019
- **Checklist:**
  - [ ] Đọc `views/ForgotPasswordMagicLink/hooks/useMagicLink.ts`
  - [ ] Thay TODO trong send magic link:
    - [ ] Gọi `sendMagicLink(email)`
    - [ ] Handle success: hiển thị instructions "Check your email"
    - [ ] Handle errors: cooldown, resend limit
  - [ ] Thay TODO trong resend:
    - [ ] Gọi `sendMagicLink(email)` lại
    - [ ] Reset countdown
  - [ ] Đọc `views/ForgotPasswordMagicLink/mains/MagicLinkForm/index.tsx` và update nếu cần
- **Files sẽ tạo/sửa:**
  - `client/src/views/ForgotPasswordMagicLink/hooks/useMagicLink.ts` (sửa)
  - `client/src/views/ForgotPasswordMagicLink/mains/MagicLinkForm/index.tsx` (sửa nếu cần)
- **Test cần pass:** TC-03.1, TC-03.3, TC-03.4, TC-06.1

---

#### TASK-022: Integrate ResetPassword page (verify magic link + reset form submit)

- **Tham chiếu:** TL1 - US-04, US-05
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-019
- **Checklist:**
  - [ ] Sửa `views/ResetPassword/index.tsx`:
    - [ ] Detect query param `method=magic-link` → nếu có, gọi `verifyMagicLink(email, token)` trước khi hiển thị form
    - [ ] Nhận `resetToken` từ verify response → pass xuống ResetPasswordForm
    - [ ] Handle verify error: hiển thị message + nút "Try again" / redirect
  - [ ] Sửa `views/ResetPassword/mains/ResetPasswordForm/index.tsx`:
    - [ ] Thay `onSubmit` TODO:
      - [ ] Gọi `resetPassword(email, token, data.newPassword)`
      - [ ] Handle success: toast + redirect `/login`
      - [ ] Handle errors: token hết hạn → redirect về forgot-password, lỗi khác → toast
- **Files sẽ tạo/sửa:**
  - `client/src/views/ResetPassword/index.tsx` (sửa)
  - `client/src/views/ResetPassword/mains/ResetPasswordForm/index.tsx` (sửa)
- **Test cần pass:** TC-04.1, TC-04.2, TC-04.3, TC-05.1, TC-05.2, TC-05.3

---

#### TASK-023: Thêm i18n translations (EN + VI) cho frontend nếu thiếu

- **Tham chiếu:** TL2 - NF-08
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-020, TASK-021, TASK-022
- **Checklist:**
  - [ ] Kiểm tra `client/src/locales/en/` và `vi/` cho các error messages từ API
  - [ ] Thêm translation keys cho toast messages nếu thiếu (API error fallback, success messages)
  - [ ] Verify tất cả UI text đã có translation
- **Files sẽ tạo/sửa:**
  - `client/src/locales/en/*.json` (sửa nếu cần)
  - `client/src/locales/vi/*.json` (sửa nếu cần)

---

### Phase 7: Testing & QA

#### TASK-024: Test thủ công Happy Path — OTP flow end-to-end

- **Tham chiếu:** TL2 - TC-01.1, TC-02.1, TC-05.1
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-020, TASK-022
- **Checklist:**
  - [ ] Mở `/forgot-password` → chọn OTP → nhập email hợp lệ
  - [ ] Kiểm tra email nhận được OTP 6 số
  - [ ] Nhập OTP đúng → verify redirect đến `/reset-password`
  - [ ] Nhập password mới + confirm → submit
  - [ ] Verify toast success + redirect `/login`
  - [ ] Login lại bằng password mới → thành công
  - [ ] Login bằng password cũ → fail

---

#### TASK-025: Test thủ công Happy Path — Magic Link flow end-to-end

- **Tham chiếu:** TL2 - TC-03.1, TC-04.1, TC-05.1
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-021, TASK-022
- **Checklist:**
  - [ ] Mở `/forgot-password` → chọn Magic Link → nhập email hợp lệ
  - [ ] Kiểm tra email nhận được magic link
  - [ ] Click link → redirect đến `/reset-password`
  - [ ] Verify magic link → form hiển thị
  - [ ] Nhập password mới → submit → success
  - [ ] Login lại bằng password mới → thành công

---

#### TASK-026: Test Edge Cases — cooldown, resend, lockout, expiry

- **Tham chiếu:** TL2 - TC-01.3~6, TC-02.2~6, TC-03.3~4, TC-06
- **Ước lượng:** 1.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-024, TASK-025
- **Checklist:**
  - [ ] Gửi OTP → gửi lại ngay (< 60s) → verify cooldown error
  - [ ] Gửi OTP 3 lần → lần 4 → verify resend limit error
  - [ ] Nhập OTP sai 5 lần → verify lockout 15 phút
  - [ ] Đợi OTP hết hạn (5 min) → nhập → verify expired error
  - [ ] Nhập email không tồn tại → verify fake success (không có email thật gửi đến)
  - [ ] Nhập email account inactive → verify fake success
  - [ ] Tương tự test cho magic link flow
  - [ ] Reset token hết hạn → submit new password → verify error

---

#### TASK-027: Test Security — anti-enumeration, one-time token, rate limit

- **Tham chiếu:** TL2 - NF-01~05
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-024, TASK-025
- **Checklist:**
  - [ ] So sánh response khi email tồn tại vs không tồn tại → phải giống nhau (timing + format)
  - [ ] Verify OTP → dùng resetToken để reset → dùng lại resetToken → verify fail
  - [ ] Click magic link → verify → dùng resetToken → click link lần 2 → verify fail
  - [ ] Gửi request liên tục quá rate limit → verify 429
  - [ ] Kiểm tra Redis: OTP/token phải là bcrypt hash, không phải plain text

---

#### TASK-028: Test Session Invalidation

- **Tham chiếu:** TL2 - TC-05.1, NF-04
- **Ước lượng:** 0.5h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-017, TASK-024
- **Checklist:**
  - [ ] Login thành công → lưu access token
  - [ ] Reset password qua forgot-password flow
  - [ ] Gọi API protected route bằng old access token → verify bị reject (401)
  - [ ] Login lại bằng password mới → nhận token mới → gọi API → thành công

---

#### TASK-029: Fix bugs phát hiện trong quá trình test

- **Tham chiếu:** TL2 - DoD
- **Ước lượng:** 2h (buffer)
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-024 ~ TASK-028
- **Checklist:**
  - [ ] Tổng hợp bugs từ TASK-024 ~ TASK-028
  - [ ] Fix từng bug và re-test
  - [ ] Verify tất cả Happy Path vẫn pass sau fix
  - [ ] Final check: tất cả test scenarios ✅

---

## Dependency Graph

```
TASK-001 (constants) ──┬── TASK-002 (types)
                       ├── TASK-003 (validators)
                       ├── TASK-005 (ResetTokenRepo)
                       ├── TASK-006 (OtpFPRepo)
                       ├── TASK-007 (MagicLinkFPRepo)
                       ├── TASK-010 (rate limiter)
                       └── TASK-011 (rate limit config verify)

TASK-004 (auth model) ──── TASK-014 (resetPassword service)
                      └─── TASK-017 (auth middleware)

TASK-008 (email template) ─── TASK-009 (email service update)

TASK-005 + TASK-006 + TASK-009 ─── TASK-012 (sendOtp + verifyOtp)
TASK-005 + TASK-007 + TASK-012 ─── TASK-013 (sendMagicLink + verifyMagicLink)
TASK-004 + TASK-005 + TASK-012 ─── TASK-014 (resetPassword)

TASK-003 + TASK-010 + TASK-012 + TASK-013 + TASK-014 ─── TASK-015 (controller)
TASK-015 ─── TASK-016 (module + route mount)

TASK-016 ─── TASK-019 (dataSources)
TASK-019 ──┬── TASK-020 (OTP integration)
           ├── TASK-021 (MagicLink integration)
           └── TASK-022 (ResetPassword integration)

TASK-020 + TASK-021 + TASK-022 ─── TASK-023 (i18n frontend)

TASK-020 + TASK-022 ─── TASK-024 (test OTP)
TASK-021 + TASK-022 ─── TASK-025 (test ML)
TASK-024 + TASK-025 ──┬── TASK-026 (test edge)
                      ├── TASK-027 (test security)
                      └── TASK-028 (test session)

TASK-026 + TASK-027 + TASK-028 ─── TASK-029 (fix bugs)
```

### Parallel Execution Opportunities

Các task có thể chạy song song (nếu nhiều dev):
- **TASK-001** và **TASK-004** và **TASK-008**: không phụ thuộc nhau
- **TASK-005**, **TASK-006**, **TASK-007**: cùng phụ thuộc TASK-001 nhưng độc lập nhau
- **TASK-020**, **TASK-021**, **TASK-022**: cùng phụ thuộc TASK-019 nhưng độc lập nhau
- **TASK-024** và **TASK-025**: độc lập nhau
- **TASK-026**, **TASK-027**, **TASK-028**: độc lập nhau
