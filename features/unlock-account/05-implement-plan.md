# IMPLEMENTATION PLAN: UNLOCK ACCOUNT (Client Integration)

> Tạo từ Tài liệu 4 (Estimation).
> File này là "source of truth" cho quá trình implement client.

---

## Tổng quan

| Mục          | Giá trị    |
| ------------ | ---------- |
| Tổng số task | 10         |
| Hoàn thành   | 0/10       |
| Tiến độ      | 0%         |
| Ngày bắt đầu | 06/03/2026 |

> **Flow tổng quan:** Trang login (lỗi tài khoản bị khoá) → `/unlock-account` (nhập email) → `/unlock-account/verify?email=` (nhập mật khẩu tạm thời) → Dashboard

---

## Thứ tự implement

> Sắp xếp theo dependency — task trên phải xong trước task dưới.

### Phase 1: Setup & Foundation

#### TASK-001: Tạo `constants/unlock-account.ts` và cập nhật routes

- **Tham chiếu:** TL3 - Mục 3.3, TL3 - Mục 3.7
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/constants/unlock-account.ts`:
    - `UNLOCK_COOLDOWN = 60` (giây)
    - `UNLOCK_RATE_LIMIT = 3` (lần/giờ)
    - `UNLOCK_EMAIL_PARAM = "email"` (query param key)
  - [ ] Export từ `src/constants/index.ts`
  - [ ] Mở `src/constants/routes.ts`, thêm:
    - `AUTH_UNLOCK_ACCOUNT = "/unlock-account"`
    - `AUTH_UNLOCK_ACCOUNT_VERIFY = "/unlock-account/verify"`
- **Files sẽ tạo/sửa:**
  - `src/constants/unlock-account.ts` (tạo mới)
  - `src/constants/index.ts` (sửa)
  - `src/constants/routes.ts` (sửa)
- **Test cần pass:** N/A

#### TASK-002: Tạo translation files (vi/en) cho unlock-account

- **Tham chiếu:** TL1 - US-01~02, TL2 - TC-01.x~02.x
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/locales/vi/unlock-account.json`
  - [ ] Tạo `src/locales/en/unlock-account.json`
  - [ ] Thêm keys cho Request step: tiêu đề, mô tả, email label, submit button, success message
  - [ ] Thêm keys cho Verify step: tiêu đề, mô tả, tempPassword label, submit button
  - [ ] Thêm error messages: cooldown (với countdown), rate-limit, not-locked, suspended
  - [ ] Thêm error messages cho verify: expired, already-used, invalid
- **Files sẽ tạo/sửa:**
  - `src/locales/vi/unlock-account.json` (tạo mới)
  - `src/locales/en/unlock-account.json` (tạo mới)
- **Test cần pass:** N/A

---

### Phase 3: Frontend Development

#### TASK-003: `dataSources/UnlockAccount/index.ts` — 2 API functions

- **Tham chiếu:** TL3 - Mục 3.4, TL2 - TC-01.1~TC-02.6
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo folder `src/dataSources/UnlockAccount/`
  - [ ] Tạo `src/dataSources/UnlockAccount/index.ts`
  - [ ] Implement `requestUnlock(email: string)`:
    - POST `/api/v1/auth/unlock/request`
    - Body: `{ email }`
    - Return `ResponsePattern<{ success: boolean }>`
    - Xử lý lỗi: 400 (cooldown/not-locked/suspended), 429 (rate limit), 500 (email service fail)
  - [ ] Implement `verifyUnlock(email: string, tempPassword: string)`:
    - POST `/api/v1/auth/unlock/verify`
    - Body: `{ email, tempPassword }`
    - Return `ResponsePattern<{ accessToken, idToken, expiresIn }>`
    - Xử lý lỗi: 401 (expired/used/invalid/not-found)
- **Files sẽ tạo/sửa:**
  - `src/dataSources/UnlockAccount/index.ts` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.5, TC-01.6, TC-02.1, TC-02.2~02.5

#### TASK-004: `forms/UnlockAccountRequest/` — validations & props

- **Tham chiếu:** TL2 - US-01, Validation rules
- **Ước lượng:** 20m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/forms/UnlockAccountRequest/index.ts`
  - [ ] Tạo `src/forms/UnlockAccountRequest/validations.ts` — Zod schema: `email` required, valid format
  - [ ] Tạo `src/forms/UnlockAccountRequest/data.ts`
- **Files sẽ tạo/sửa:**
  - `src/forms/UnlockAccountRequest/index.ts` (tạo mới)
  - `src/forms/UnlockAccountRequest/validations.ts` (tạo mới)
  - `src/forms/UnlockAccountRequest/data.ts` (tạo mới)
- **Test cần pass:** N/A

#### TASK-005: `forms/UnlockAccountVerify/` — validations & props

- **Tham chiếu:** TL2 - US-02, Validation rules
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có
- **Checklist:**
  - [ ] Tạo `src/forms/UnlockAccountVerify/index.ts`
  - [ ] Tạo `src/forms/UnlockAccountVerify/validations.ts` — Zod schema:
    - `email`: required, valid format (pre-filled từ query param, có thể hidden)
    - `tempPassword`: required, min 12 ký tự (theo TL2 - Validation rules)
  - [ ] Tạo `src/forms/UnlockAccountVerify/data.ts`
- **Files sẽ tạo/sửa:**
  - `src/forms/UnlockAccountVerify/index.ts` (tạo mới)
  - `src/forms/UnlockAccountVerify/validations.ts` (tạo mới)
  - `src/forms/UnlockAccountVerify/data.ts` (tạo mới)
- **Test cần pass:** TC-02.5 (wrong password — invalid input)

#### TASK-006: `views/UnlockAccountRequest/` + page `/unlock-account`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-01.x
- **Ước lượng:** 1h 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003, TASK-004, TASK-002
- **Checklist:**
  - [ ] Tạo `src/views/UnlockAccountRequest/index.tsx` (server component) — nhận translations, pre-fill email nếu có trong searchParams
  - [ ] Tạo `src/views/UnlockAccountRequest/mains/RequestForm/index.tsx` (client component):
    - Nhận `defaultEmail` prop (từ URL query `?email=`, ví dụ khi redirect từ login page)
    - React Hook Form + Zod (`UnlockAccountRequest` schema)
    - Submit → gọi `requestUnlock(email)`:
      - Thành công → hiển thị thông báo "Kiểm tra email của bạn" (không redirect)
      - Lỗi 400 cooldown → hiển thị "Vui lòng đợi X giây" (với countdown)
      - Lỗi 400 not-locked → hiển thị "Tài khoản chưa bị khoá"
      - Lỗi 429 → hiển thị "Đã vượt giới hạn yêu cầu"
    - Sau khi submit thành công: hiển thị link "Nhập mật khẩu tạm thời" → `/unlock-account/verify?email={email}`
  - [ ] Tạo `src/app/[locale]/(authen)/unlock-account/page.tsx`
- **Files sẽ tạo/sửa:**
  - `src/views/UnlockAccountRequest/index.tsx` (tạo mới)
  - `src/views/UnlockAccountRequest/mains/RequestForm/index.tsx` (tạo mới)
  - `src/app/[locale]/(authen)/unlock-account/page.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.3 (not-locked), TC-01.5 (cooldown), TC-01.6 (rate-limit), TC-01.7 (email fail → vẫn success)

#### TASK-007: `views/UnlockAccountVerify/` + page `/unlock-account/verify`

- **Tham chiếu:** TL3 - Mục 3.7, TL2 - TC-02.x
- **Ước lượng:** 1h 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-003, TASK-005, TASK-002, TASK-008
- **Checklist:**
  - [ ] Tạo `src/views/UnlockAccountVerify/index.tsx` (server component) — đọc `email` từ searchParams
  - [ ] Tạo `src/views/UnlockAccountVerify/mains/VerifyForm/index.tsx` (client component):
    - Nhận `email` prop (từ URL query `?email=`)
    - React Hook Form + Zod (`UnlockAccountVerify` schema)
    - Submit → gọi `verifyUnlock(email, tempPassword)`:
      - Thành công → gọi `useAuthStore.getState().setTokens(tokens)` → navigate dashboard
      - Lỗi 401 expired → hiển thị "Mật khẩu tạm thời đã hết hạn" + link quay lại request
      - Lỗi 401 used → hiển thị "Mật khẩu tạm thời đã được sử dụng" + link quay lại
      - Lỗi 401 invalid → hiển thị "Mật khẩu tạm thời không đúng"
    - Link "Yêu cầu mật khẩu mới" → quay lại `/unlock-account?email={email}`
  - [ ] Tạo `src/app/[locale]/(authen)/unlock-account/verify/page.tsx`
- **Files sẽ tạo/sửa:**
  - `src/views/UnlockAccountVerify/index.tsx` (tạo mới)
  - `src/views/UnlockAccountVerify/mains/VerifyForm/index.tsx` (tạo mới)
  - `src/app/[locale]/(authen)/unlock-account/verify/page.tsx` (tạo mới)
- **Test cần pass:** TC-02.1, TC-02.2 (expired), TC-02.3 (used), TC-02.5 (wrong), TC-02.6 (not-found)

#### TASK-008: Cập nhật auth store — lưu tokens sau khi verify unlock

- **Tham chiếu:** TL3 - Mục 3.5, TL2 - TC-02.1
- **Ước lượng:** 30m
- **Trạng thái:** ⬜ Todo
- **Depends on:** Không có (độc lập)
- **Checklist:**
  - [ ] Kiểm tra xem `setTokens` đã có trong store chưa — nếu có thì tái sử dụng
  - [ ] Nếu cần thêm: action nhận `{ accessToken, idToken }` (refreshToken được server set qua HTTP-only cookie, không có trong response body)
  - [ ] Verify sau khi set: `useAuthStore.getState().accessToken !== null`
- **Files sẽ tạo/sửa:**
  - `src/types/stores/auth.ts` (sửa nếu cần)
  - `src/stores/slices/auth.ts` (sửa nếu cần)
- **Test cần pass:** TC-02.1 (tokens được lưu sau unlock)

#### TASK-009: Liên kết từ trang login — hiển thị link khi tài khoản bị khoá

- **Tham chiếu:** TL2 - US-02, TL3 - Mục 3.7
- **Ước lượng:** 45m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-001
- **Checklist:**
  - [ ] Mở `src/views/LoginPassword/mains/PasswordStepForm/index.tsx`
  - [ ] Xác định error code server trả về khi tài khoản bị khoá (ví dụ: `ACCOUNT_LOCKED` hoặc HTTP 423)
  - [ ] Khi nhận lỗi ACCOUNT_LOCKED: hiển thị thông báo lỗi + link "Mở khoá tài khoản" → `/unlock-account?email={email}`
  - [ ] Link dùng `AUTH_UNLOCK_ACCOUNT` constant từ routes.ts
  - [ ] Thêm translation key cho link text (vi/en)
- **Files sẽ tạo/sửa:**
  - `src/views/LoginPassword/mains/PasswordStepForm/index.tsx` (sửa)
  - `src/locales/vi/login.json` (sửa — thêm key cho link unlock)
  - `src/locales/en/login.json` (sửa — thêm key cho link unlock)
- **Test cần pass:** N/A (manual test — login với tài khoản bị khoá → hiển thị link)

---

### Phase 4: Testing & QA

#### TASK-010: Unit & Component tests

- **Tham chiếu:** TL2 - TC-01.x~TC-02.x
- **Ước lượng:** 1h 40m
- **Trạng thái:** ⬜ Todo
- **Depends on:** TASK-006, TASK-007
- **Checklist:**
  - [ ] Unit test `requestUnlock()` — mock axios, verify endpoint + payload, 400/429 errors
  - [ ] Unit test `verifyUnlock()` — mock axios, success response + 401 errors
  - [ ] Unit test Zod schemas — valid/invalid email, tempPassword min length
  - [ ] Component test `RequestForm`:
    - TC-01.1: submit thành công → hiển thị success message + link
    - TC-01.5: 400 cooldown → hiển thị countdown message
    - TC-01.6: 429 rate limit → hiển thị error
  - [ ] Component test `VerifyForm`:
    - TC-02.1: submit thành công → store update + redirect
    - TC-02.2: 401 expired → hiển thị đúng message + link quay lại
    - TC-02.3: 401 used → hiển thị đúng message
- **Files sẽ tạo/sửa:**
  - `src/dataSources/UnlockAccount/__tests__/index.test.ts` (tạo mới)
  - `src/views/UnlockAccountRequest/__tests__/RequestForm.test.tsx` (tạo mới)
  - `src/views/UnlockAccountVerify/__tests__/VerifyForm.test.tsx` (tạo mới)
- **Test cần pass:** TC-01.1, TC-01.5, TC-01.6, TC-02.1, TC-02.2, TC-02.3, TC-02.5

---

## Dependency Graph

```
TASK-001          TASK-002          TASK-003          TASK-008
(constants/routes) (locales)        (dataSources)     (store)
      |               |                  |                |
      ├───────────────┼──────────────────┼────────────────┤
      |               |                  |                |
      ↓               ↓              TASK-004          TASK-005
  TASK-009         (cả hai)       (form/Request)    (form/Verify)
 (login link)           |               |                |
                        ↓               ↓                ↓
                    TASK-006        TASK-006          TASK-007
                 (views/Request) (views/Request)  (views/Verify)
                        |                               |
                        └───────────────┬───────────────┘
                                        ↓
                                  TASK-010 (Tests)
```
