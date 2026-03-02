# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                                          |
| ---------------------------- | ------------------------------------------------ |
| **Tổng thời gian ước lượng** | ~4.5 ngày (không buffer) / ~6 ngày (có buffer)   |
| **Số developer**             | 1 người                                          |
| **Ngày bắt đầu dự kiến**     | 02/03/2026                                       |
| **Ngày hoàn thành dự kiến**  | 10/03/2026                                       |
| **Hệ số buffer**             | 1.3x (thêm 30% cho rủi ro, debug, edge cases)   |

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-01    | Thêm constants: config, Redis keys, enums                 | TL3 - Mục 3.3, 3.9 | 1h        | FORGOT_PASSWORD_OTP_CONFIG, REDIS_KEYS, enums  |
| T-02    | Thêm TypeScript types cho forgot-password module           | TL3 - Mục 3.4   | 1h        | Request/Response types, clone pattern từ login  |
| T-03    | Thêm Joi validation schemas cho 5 endpoints               | TL3 - Mục 3.4, TL2 - Mục 2.3 | 1h | otpSend, otpVerify, mlSend, mlVerify, reset |
| T-04    | Thêm `updatePassword` + `passwordChangedAt` vào Auth model & repo | TL3 - Mục 3.3, 3.10 | 1h | Model field + repository method           |

### Phase 2: Backend - Repositories

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-05    | Implement ResetTokenRepository                             | TL3 - Mục 3.7.3 | 1.5h      | Mới hoàn toàn: create, storeHashed, verify, clear |
| T-06    | Implement OtpForgotPasswordRepository                      | TL3 - Mục 3.7.1 | 1h        | Clone từ OtpLoginRepository, đổi keys + config |
| T-07    | Implement MagicLinkForgotPasswordRepository                | TL3 - Mục 3.7.2 | 1.5h      | Clone từ MagicLinkLoginRepository + thêm resend count |

### Phase 3: Backend - Email & Rate Limiter

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-08    | Tạo email template forgot-password-otp.tsx                 | TL3 - Mục 3.6   | 1h        | Clone từ login-otp.tsx, đổi text/branding      |
| T-09    | Update send-email types, service, i18n cho email mới       | TL3 - Mục 3.6   | 0.5h      | Thêm EmailType + case trong renderTemplate     |
| T-10    | Thêm rate limiter getters cho forgot-password              | TL3 - Mục 3.6   | 1h        | 5 getters: OTP IP/email, ML IP/email, reset IP |
| T-11    | Thêm rate limit config trong constants                     | TL3 - Mục 3.6   | 0.5h      | RATE_LIMIT_CONFIG.FORGOT_PASSWORD               |

### Phase 4: Backend - Service & Controller

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-12    | Implement ForgotPasswordService - sendOtp + verifyOtp      | TL3 - Mục 3.5, 3.8, 3.9 | 3h | Bao gồm anti-enumeration logic          |
| T-13    | Implement ForgotPasswordService - sendMagicLink + verifyMagicLink | TL3 - Mục 3.5, 3.8 | 2h | Pattern tương tự OTP                    |
| T-14    | Implement ForgotPasswordService - resetPassword            | TL3 - Mục 3.5, 3.8, 3.10 | 2h | Bao gồm session invalidation + login history |
| T-15    | Implement ForgotPasswordController (5 endpoints)           | TL3 - Mục 3.4   | 1.5h      | Rate limiter + validator + handler             |
| T-16    | Module wiring (forgot-password.module.ts) + route mount    | TL3 - Mục 3.6   | 0.5h      | DI + mount vào v1Router                        |

### Phase 5: Backend - Auth Middleware & i18n

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-17    | Update auth middleware: kiểm tra passwordChangedAt         | TL3 - Mục 3.10  | 1h        | Reject token nếu iat < passwordChangedAt       |
| T-18    | Thêm i18n translations (EN + VI) cho backend               | TL3 - Mục 3.6   | 1h        | Error messages, success messages                |

### Phase 6: Frontend - API & Integration

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-19    | Tạo dataSources/ForgotPassword (API functions)             | TL3 - Mục 3.6   | 1h        | 5 functions: sendOtp, verifyOtp, sendML, verifyML, reset |
| T-20    | Integrate OtpStepForm với API (send + verify + resend)     | TL1 - US-01, US-02, US-06 | 2h | Thay TODO, handle errors, navigate với resetToken |
| T-21    | Integrate MagicLink flow với API (send + resend)           | TL1 - US-03, US-06 | 1.5h    | Thay TODO trong useMagicLink hook              |
| T-22    | Integrate ResetPassword page (verify ML + reset password)  | TL1 - US-04, US-05 | 2h      | Handle magic-link verify + reset form submit   |
| T-23    | Thêm i18n translations (EN + VI) cho frontend nếu thiếu   | TL2 - Mục NF-08 | 0.5h      | Kiểm tra và bổ sung các key còn thiếu          |

### Phase 7: Testing & QA

| Task ID | Task                                                      | Tham chiếu       | Ước lượng | Ghi chú                                        |
| ------- | --------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| T-24    | Test thủ công Happy Path: OTP flow end-to-end              | TL2 - TC-01.1, TC-02.1, TC-05.1 | 1h | Send → Verify → Reset → Login lại     |
| T-25    | Test thủ công Happy Path: Magic Link flow end-to-end       | TL2 - TC-03.1, TC-04.1, TC-05.1 | 1h | Send → Click → Reset → Login lại      |
| T-26    | Test Edge Cases: cooldown, resend limit, lockout, expiry   | TL2 - TC-01.3~6, TC-02.2~6, TC-06 | 1.5h | Các scenario 🟡 Edge                |
| T-27    | Test Security: anti-enumeration, one-time token, rate limit | TL2 - NF-01~05 | 1h        | Verify security requirements                   |
| T-28    | Test Session Invalidation: login sau reset password        | TL2 - TC-05.1, NF-04 | 0.5h   | Verify old token bị reject                     |
| T-29    | Fix bugs phát hiện trong quá trình test                    | TL2 - DoD        | 2h        | Buffer cho bugs                                |

---

## 4.3. Tổng hợp theo Phase

| Phase                              | Số tasks | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ---------------------------------- | -------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation              | 4        | 4h                       | 5.2h                       |
| 2. Backend - Repositories          | 3        | 4h                       | 5.2h                       |
| 3. Backend - Email & Rate Limiter  | 4        | 3h                       | 3.9h                       |
| 4. Backend - Service & Controller  | 5        | 9h                       | 11.7h                      |
| 5. Backend - Auth Middleware & i18n | 2        | 2h                       | 2.6h                       |
| 6. Frontend - API & Integration    | 5        | 7h                       | 9.1h                       |
| 7. Testing & QA                    | 6        | 7h                       | 9.1h                       |
| **TỔNG**                           | **29**   | **36h (~4.5 ngày)**      | **46.8h (~6 ngày)**        |

---

## 4.4. Rủi ro ảnh hưởng timeline

| Rủi ro                                                    | Xác suất | Impact | Mitigation                                   |
| --------------------------------------------------------- | -------- | ------ | -------------------------------------------- |
| Session invalidation phức tạp hơn dự kiến (JWT stateless) | Trung bình | Cao   | Approach passwordChangedAt đã thiết kế sẵn   |
| Email template rendering lỗi layout                       | Thấp     | Thấp   | Clone từ template đã hoạt động               |
| Race condition khi verify OTP / magic link                 | Thấp     | Trung bình | Redis atomic operations + xóa key ngay      |
| Rate limiter config conflict với existing limiters         | Thấp     | Thấp   | Dùng prefix riêng cho forgot-password        |
