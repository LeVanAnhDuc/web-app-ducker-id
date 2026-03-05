# IMPLEMENTATION PLAN: SIGNUP (Client Integration)

> Tạo từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement client.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 13         |
| Hoàn thành   | 0/13       |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 05/03/2026 |

> **Flow tổng quan:** `/signup` (email) → `/signup/otp?email=` (OTP) → `/signup/info?sessionToken=` (thông tin) → Dashboard

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

### Phase 1: Setup & Foundation

#### TASK-001: Tạo `constants/signup.ts`

- **Tham chiếu:** TL3 - Mục 3.6
- **Ước lượng:** 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/constants/signup.ts`
  - [ ] Thêm: `OTP_LENGTH = 6`, `RESEND_COUNTDOWN = 60`
  - [ ] Thêm query param keys: `SIGNUP_EMAIL_PARAM = "email"`, `SIGNUP_SESSION_PARAM = "sessionToken"`
  - [ ] Export từ `src/constants/index.ts`
- **Files sẽ tạo/sửa:**
  - `src/constants/signup.ts` (tạo mới)
  - `src/constants/index.ts` (sửa)
- **Test cần pass:** N/A

#### TASK-002: Thêm signup routes vào `constants/routes.ts`

- **Tham chiếu:** TL3 - Mục 3.7
- **Ước lượng:** 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Mở `src/constants/routes.ts`
  - [ ] Thêm: `AUTH_SIGNUP = "/signup"`, `AUTH_SIGNUP_OTP = "/signup/otp"`, `AUTH_SIGNUP_INFO = "/signup/info"`
- **Files sẽ tạo/sửa:**
  - `src/constants/routes.ts` (sửa)
- **Test cần pass:** N/A

#### TASK-003: Tạo translation files (vi/en) cho signup

- **Tham chiếu:** TL1 - US-01~05, TL2 - Validation rules
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/locales/vi/signup.json`
  - [ ] Tạo `src/locales/en/signup.json`
  - [ ] Thêm keys cho Email step: tiêu đề, label, placeholder, submit button
  - [ ] Thêm keys cho OTP step: tiêu đề, label, countdown text, resend button, error messages
  - [ ] Thêm keys cho Info step: tiêu đề, tất cả field labels, password requirements text
  - [ ] Thêm error messages: email-already-registered, otp-expired, otp-locked, session-expired, v.v.
  - [ ] Import namespace `signup` trong next-intl config nếu cần
- **Files sẽ tạo/sửa:**
  - `src/locales/vi/signup.json` (tạo mới)
  - `src/locales/en/signup.json` (tạo mới)
- **Test cần pass:** N/A

---

### Phase 3: Frontend Development

#### TASK-004: `dataSources/Signup/index.ts` — 5 API functions

- **Tham chiếu:** TL3 - Mục 3.4, TL2 - TC-01.x~05.x
- **Ước lượng:** 1h
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo folder `src/dataSources/Signup/`
  - [ ] Tạo `src/dataSources/Signup/index.ts`
  - [ ] Implement `sendSignupOtp(email: string)`:
    - POST `/api/v1/auth/signup/send-otp`
    - Return `{ expiresIn: number, cooldownSeconds: number }`
  - [ ] Implement `verifySignupOtp(email: string, otp: string)`:
    - POST `/api/v1/auth/signup/verify-otp`
    - Return `{ sessionToken: string, expiresIn: number }`
  - [ ] Implement `resendSignupOtp(email: string)`:
    - POST `/api/v1/auth/signup/resend-otp`
    - Return `{ expiresIn: number, cooldownSeconds: number }`
  - [ ] Implement `completeSignup(data: SignupCompletePayload)`:
    - POST `/api/v1/auth/signup/complete`
    - Header: `X-Session-Token: {sessionToken}`
    - Return `{ user, accessToken, refreshToken, idToken, expiresIn }`
  - [ ] Implement `checkEmailAvailability(email: string)`:
    - GET `/api/v1/auth/signup/check-email/{email}`
    - Return `{ available: boolean }`
  - [ ] Tạo types cần thiết trong `src/types/` cho request/response
- **Files sẽ tạo/sửa:**
  - `src/dataSources/Signup/index.ts` (tạo mới)
  - `src/types/signup.ts` (tạo mới — hoặc thêm vào types hiện có)
- **Test cần pass:** TC-01.1~TC-05.4

#### TASK-005: `forms/SignupEmail/` — validations & props

- **Tham chiếu:** TL2 - US-01, TC-01.x, TC-04.x
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `src/forms/SignupEmail/index.ts` — export form props type
  - [ ] Tạo `src/forms/SignupEmail/validations.ts` — Zod schema:
    - `email`: required, valid format
  - [ ] Tạo `src/forms/SignupEmail/data.ts` — default values
- **Files sẽ tạo/sửa:**
  - `src/forms/SignupEmail/index.ts` (tạo mới)
  - `src/forms/SignupEmail/validations.ts` (tạo mới)
  - `src/forms/SignupEmail/data.ts` (tạo mới)
- **Test cần pass:** TC-01.x (email validation)

#### TASK-006: `forms/SignupOtp/` — validations & props

- **Tham chiếu:** TL2 - US-02, TC-02.x
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Tạo `src/forms/SignupOtp/index.ts`
  - [ ] Tạo `src/forms/SignupOtp/validations.ts` — Zod schema:
    - `otp`: required, exactly 6 digits, numeric string
  - [ ] Tạo `src/forms/SignupOtp/data.ts`
- **Files sẽ tạo/sửa:**
  - `src/forms/SignupOtp/index.ts` (tạo mới)
  - `src/forms/SignupOtp/validations.ts` (tạo mới)
  - `src/forms/SignupOtp/data.ts` (tạo mới)
- **Test cần pass:** TC-02.x

#### TASK-007: `forms/SignupInfo/` — validations & props

- **Tham chiếu:** TL2 - US-03, TC-03.x, Validation rules
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/forms/SignupInfo/index.ts`
  - [ ] Tạo `src/forms/SignupInfo/validations.ts` — Zod schema:
    - `fullName`: required, 2-100 ký tự
    - `gender`: enum `["male", "female", "other"]`
    - `dateOfBirth`: required, valid date, must be in the past
    - `password`: 8-100 ký tự, phải có uppercase + lowercase + number
    - `confirmPassword`: phải khớp với `password`
    - `agreeTerms`: boolean, must be `true`
  - [ ] Tạo `src/forms/SignupInfo/data.ts`
- **Files sẽ tạo/sửa:**
  - `src/forms/SignupInfo/index.ts` (tạo mới)
  - `src/forms/SignupInfo/validations.ts` (tạo mới)
  - `src/forms/SignupInfo/data.ts` (tạo mới)
- **Test cần pass:** TC-03.4 (password), TC-03.5 (mismatch), TC-03.6 (terms)

#### TASK-008: `views/SignupEmail/` + page `/signup`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-01.x, TC-04.x
- **Ước lượng:** 1h 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004, TASK-005, TASK-003
- **Checklist:**
  - [ ] Tạo `src/views/SignupEmail/index.tsx` (server component) — nhận translations, render layout
  - [ ] Tạo `src/views/SignupEmail/mains/EmailStepForm/index.tsx` (client component):
    - React Hook Form + Zod (`SignupEmail` schema)
    - Real-time `checkEmailAvailability` debounce khi user gõ email (TL2 - US-04)
    - Submit → gọi `sendSignupOtp(email)` → navigate `/signup/otp?email={email}`
    - Xử lý lỗi: 409 email đã tồn tại, 429 rate limit
  - [ ] Tạo `src/app/[locale]/(authen)/signup/page.tsx`
- **Files sẽ tạo/sửa:**
  - `src/views/SignupEmail/index.tsx` (tạo mới)
  - `src/views/SignupEmail/mains/EmailStepForm/index.tsx` (tạo mới)
  - `src/app/[locale]/(authen)/signup/page.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2 (409), TC-01.4 (500), TC-01.5 (429), TC-04.1~04.3

#### TASK-009: `views/SignupOtp/` + page `/signup/otp`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-02.x, TC-05.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004, TASK-006, TASK-003
- **Checklist:**
  - [ ] Tạo `src/views/SignupOtp/index.tsx` (server component) — đọc `email` từ searchParams, pass xuống client
  - [ ] Tạo `src/views/SignupOtp/mains/OtpStepForm/index.tsx` (client component):
    - Nhận `email` prop (từ URL query `?email=`)
    - React Hook Form + Zod (`SignupOtp` schema)
    - Submit → gọi `verifySignupOtp(email, otp)` → navigate `/signup/info?sessionToken={token}`
    - Resend button với countdown timer (RESEND_COUNTDOWN=60s)
    - Resend → gọi `resendSignupOtp(email)`
    - Xử lý lỗi: OTP expired, OTP locked (15 phút), OTP sai
    - Auto-submit khi nhập đủ 6 chữ số
  - [ ] Tạo `src/app/[locale]/(authen)/signup/otp/page.tsx`
- **Files sẽ tạo/sửa:**
  - `src/views/SignupOtp/index.tsx` (tạo mới)
  - `src/views/SignupOtp/mains/OtpStepForm/index.tsx` (tạo mới)
  - `src/app/[locale]/(authen)/signup/otp/page.tsx` (tạo mới)
- **Test cần pass:** TC-02.1, TC-02.2 (expired), TC-02.3 (locked), TC-05.1~05.4

#### TASK-010: `views/SignupInfo/` + page `/signup/info`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-03.x
- **Ước lượng:** 2h
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004, TASK-007, TASK-003, TASK-011
- **Checklist:**
  - [ ] Tạo `src/views/SignupInfo/index.tsx` (server component) — đọc `sessionToken` từ searchParams
  - [ ] Tạo `src/views/SignupInfo/mains/InfoStepForm/index.tsx` (client component):
    - Nhận `sessionToken` prop (từ URL query `?sessionToken=`)
    - React Hook Form + Zod (`SignupInfo` schema)
    - Submit → gọi `completeSignup({ ...data, sessionToken })`:
      - Thành công → gọi `useAuthStore.getState().setSignupTokens(tokens)` → navigate dashboard
      - Thất bại 401 (session expired) → navigate `/signup` với thông báo lỗi
    - Hiển thị password strength indicator
    - Checkbox đồng ý điều khoản
  - [ ] Tạo `src/app/[locale]/(authen)/signup/info/page.tsx`
- **Files sẽ tạo/sửa:**
  - `src/views/SignupInfo/index.tsx` (tạo mới)
  - `src/views/SignupInfo/mains/InfoStepForm/index.tsx` (tạo mới)
  - `src/app/[locale]/(authen)/signup/info/page.tsx` (tạo mới)
- **Test cần pass:** TC-03.1, TC-03.2 (expired session), TC-03.3 (race), TC-03.4~03.7

#### TASK-011: Cập nhật auth store — lưu tokens sau khi signup hoàn tất

- **Tham chiếu:** TL3 - Mục 3.5
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có (có thể làm song song)
- **Checklist:**
  - [ ] Mở `src/types/stores/auth.ts`
  - [ ] Kiểm tra xem `setTokens` (hoặc tương đương) đã có chưa — nếu có thì tái sử dụng
  - [ ] Nếu cần: thêm action để set `accessToken`, `idToken`, `refreshToken` vào store sau signup
  - [ ] Verify persistence sang localStorage hoạt động đúng
- **Files sẽ tạo/sửa:**
  - `src/types/stores/auth.ts` (sửa nếu cần)
  - `src/stores/slices/auth.ts` (sửa nếu cần)
- **Test cần pass:** TC-03.1 (tokens được lưu sau complete)

---

### Phase 4: Testing & QA

#### TASK-012: Unit tests — dataSources & form validations

- **Tham chiếu:** TL2 - TC-01.x~TC-05.x, Validation rules
- **Ước lượng:** 1h 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-004, TASK-005, TASK-006, TASK-007
- **Checklist:**
  - [ ] Test `sendSignupOtp()` — mock axios, verify endpoint + payload
  - [ ] Test `verifySignupOtp()` — mock axios, success + error cases
  - [ ] Test `resendSignupOtp()` — mock 429 rate limit
  - [ ] Test `completeSignup()` — mock axios, verify sessionToken trong header
  - [ ] Test `checkEmailAvailability()` — mock axios, verify GET endpoint
  - [ ] Test Zod schema `SignupEmail` — valid/invalid emails
  - [ ] Test Zod schema `SignupOtp` — 6 digits, non-numeric
  - [ ] Test Zod schema `SignupInfo` — password rules, confirm match, agreeTerms
- **Files sẽ tạo/sửa:**
  - `src/dataSources/Signup/__tests__/index.test.ts` (tạo mới)
  - `src/forms/SignupEmail/__tests__/validations.test.ts` (tạo mới)
  - `src/forms/SignupOtp/__tests__/validations.test.ts` (tạo mới)
  - `src/forms/SignupInfo/__tests__/validations.test.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.2, TC-01.5, TC-02.2, TC-02.3, TC-03.4, TC-03.5, TC-03.6

#### TASK-013: Component tests — 3 views

- **Tham chiếu:** TL2 - TC-01.x~TC-05.x
- **Ước lượng:** 2h 15m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-008, TASK-009, TASK-010
- **Checklist:**
  - [ ] Test `EmailStepForm`: submit gọi `sendSignupOtp`, error 409 hiển thị đúng, redirect đúng URL
  - [ ] Test `OtpStepForm`: OTP submit, resend countdown, auto-submit khi đủ 6 chữ số, error locked
  - [ ] Test `InfoStepForm`: submit gọi `completeSignup`, password strength, session expired → redirect `/signup`
- **Files sẽ tạo/sửa:**
  - `src/views/SignupEmail/__tests__/EmailStepForm.test.tsx` (tạo mới)
  - `src/views/SignupOtp/__tests__/OtpStepForm.test.tsx` (tạo mới)
  - `src/views/SignupInfo/__tests__/InfoStepForm.test.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-02.1, TC-03.1 và các error cases liên quan

---

## Dependency Graph

```
TASK-001    TASK-002    TASK-003    TASK-004    TASK-011
(constants) (routes)   (locales)   (dataSource) (store)
    |           |          |            |           |
    └─────┬─────┘          |            └─────┬─────┘
          ↓                |                  |
    TASK-005,006   TASK-007 (forms/Info)       |
    (forms Email,Otp)      |                  |
          |                |                  |
          ↓                ↓                  ↓
       TASK-008          TASK-009           TASK-010
    (views/SignupEmail) (views/OtpStep)  (views/InfoStep)
          |                |                  |
          └────────────────┴──────────────────┘
                           ↓
                    TASK-012 (unit tests)
                    TASK-013 (component tests)
```
