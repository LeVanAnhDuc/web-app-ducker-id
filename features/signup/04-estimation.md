# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                                     |
| ---------------------------- | ------------------------------------------- |
| **Tổng thời gian ước lượng** | ~2 ngày (chỉ phần tích hợp client)         |
| **Số developer**             | 1 người                                     |
| **Ngày bắt đầu dự kiến**     | 05/03/2026                                  |
| **Ngày hoàn thành dự kiến**  | 06/03/2026                                  |
| **Hệ số buffer**             | 1.3x — thêm 30% cho độ phức tạp 3-step flow |

> **Lưu ý:** Server đã implement hoàn chỉnh (5 endpoints). Tài liệu này chỉ ước lượng phần **tích hợp client** — bao gồm 3 trang đăng ký, 3 form, 5 API functions, và translation.

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task                                                                         | Tham chiếu       | Ước lượng | Assignee | Ghi chú                                       |
| ---------------------------------------------------------------------------- | ---------------- | --------- | -------- | --------------------------------------------- |
| Tạo `constants/signup.ts` — OTP_LENGTH, RESEND_COUNTDOWN, SESSION_QUERY_KEY | TL3 - Mục 3.6   | 15m       |          | Tương tự `constants/login.ts`                 |
| Thêm signup routes vào `constants/routes.ts`                                 | TL3 - Mục 3.7   | 15m       |          | `/signup`, `/signup/otp`, `/signup/info`       |
| Tạo translation files (vi/en) cho signup                                     | TL1 - US-01~05  | 45m       |          | Labels, placeholders, error messages, headings |

### Phase 2: Backend Development

> ✅ **Đã hoàn thành** — Server implement đầy đủ 5 endpoints. Xem TL3 - Mục 3.4 để biết chi tiết API spec.

### Phase 3: Frontend Development

| Task                                                                        | Tham chiếu       | Ước lượng | Assignee | Ghi chú                                                 |
| --------------------------------------------------------------------------- | ---------------- | --------- | -------- | ------------------------------------------------------- |
| `dataSources/Signup/index.ts` — 5 API functions                             | TL3 - Mục 3.4   | 1h        |          | sendOtp, verifyOtp, resendOtp, complete, checkEmail      |
| `forms/SignupEmail/` — props, validations (email, Zod)                      | TL2 - US-01, 04 | 30m       |          | Validate email format + real-time check availability    |
| `forms/SignupOtp/` — props, validations (6 digits OTP)                      | TL2 - US-02, 05 | 30m       |          | OTP_LENGTH=6, countdown timer cho resend                |
| `forms/SignupInfo/` — props, validations (fullName, gender, dob, password)  | TL2 - US-03     | 45m       |          | Password: 8-100 ký tự, uppercase + lowercase + number   |
| `views/SignupEmail/` + page `/signup`                                       | TL3 - Mục 3.7   | 1h 30m    |          | Submit → sendOtp → redirect sang `/signup/otp?email=`   |
| `views/SignupOtp/` + page `/signup/otp`                                     | TL3 - Mục 3.7   | 2h        |          | verifyOtp → redirect `/signup/info?sessionToken=`, resend button với countdown |
| `views/SignupInfo/` + page `/signup/info`                                   | TL3 - Mục 3.7   | 2h        |          | complete signup → lưu tokens vào store → redirect dashboard |
| Cập nhật auth store — lưu tokens sau khi complete signup                    | TL3 - Mục 3.5   | 30m       |          | Tương tự login — set accessToken, idToken, refreshToken |

### Phase 4: Testing & QA

| Task                                                                     | Tham chiếu             | Ước lượng | Assignee | Ghi chú |
| ------------------------------------------------------------------------ | ---------------------- | --------- | -------- | ------- |
| Unit test 5 API functions trong `dataSources/Signup`                     | TL2 - TC-01.1~TC-05.4 | 1h        |          |         |
| Unit test form validations (Zod schemas)                                 | TL2 - Validation rules | 45m       |          |         |
| Component test SignupEmail — submit flow, error states                   | TL2 - TC-01.x, TC-04.x | 45m       |          |         |
| Component test SignupOtp — verify, resend countdown, lockout state       | TL2 - TC-02.x, TC-05.x | 45m       |          |         |
| Component test SignupInfo — submit, password validation, redirect        | TL2 - TC-03.x          | 45m       |          |         |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ----------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation   | 1h 15m                   | 1h 38m                     |
| 2. Backend Development  | ✅ Hoàn thành            | —                          |
| 3. Frontend Development | 8h 45m                   | 11h 22m                    |
| 4. Testing & QA         | 4h                       | 5h 12m                     |
| **TỔNG**                | **14h**                  | **~18h (~2 ngày)**         |
