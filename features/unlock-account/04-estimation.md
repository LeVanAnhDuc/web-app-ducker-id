# TÀI LIỆU 4: ƯỚC LƯỢNG THỜI GIAN (Estimation)

---

## 4.1. Tổng quan ước lượng

| Mục                          | Giá trị                                     |
| ---------------------------- | ------------------------------------------- |
| **Tổng thời gian ước lượng** | ~1.5 ngày (chỉ phần tích hợp client)       |
| **Số developer**             | 1 người                                     |
| **Ngày bắt đầu dự kiến**     | 06/03/2026                                  |
| **Ngày hoàn thành dự kiến**  | 07/03/2026                                  |
| **Hệ số buffer**             | 1.3x — thêm 30% cho rủi ro tích hợp        |

> **Lưu ý:** Server đã implement hoàn chỉnh (2 endpoints: request + verify). Tài liệu này chỉ ước lượng phần **tích hợp client** — bao gồm 2 trang, 2 form, 2 API functions, và liên kết từ trang login.

---

## 4.2. Phân rã công việc (Work Breakdown)

### Phase 1: Setup & Foundation

| Task                                                                          | Tham chiếu      | Ước lượng | Assignee | Ghi chú                                          |
| ----------------------------------------------------------------------------- | --------------- | --------- | -------- | ------------------------------------------------ |
| Tạo `constants/unlock-account.ts` — COOLDOWN=60, RATE_LIMIT=3                 | TL3 - Mục 3.3  | 15m       |          |                                                  |
| Thêm unlock-account routes vào `constants/routes.ts`                          | TL3 - Mục 3.7  | 15m       |          | `/unlock-account`, `/unlock-account/verify`      |
| Tạo translation files (vi/en) cho unlock-account                              | TL1 - US-01~02 | 30m       |          | Labels, placeholders, success/error messages     |

### Phase 2: Backend Development

> ✅ **Đã hoàn thành** — Server implement đầy đủ 2 endpoints. Xem TL3 - Mục 3.4 để biết chi tiết API spec.

### Phase 3: Frontend Development

| Task                                                                                  | Tham chiếu       | Ước lượng | Assignee | Ghi chú                                                       |
| ------------------------------------------------------------------------------------- | ---------------- | --------- | -------- | ------------------------------------------------------------- |
| `dataSources/UnlockAccount/index.ts` — 2 API functions                                | TL3 - Mục 3.4   | 30m       |          | `requestUnlock(email)` và `verifyUnlock(email, tempPassword)` |
| `forms/UnlockAccountRequest/` — props, validations (email)                            | TL2 - US-01     | 20m       |          | Validate email format                                         |
| `forms/UnlockAccountVerify/` — props, validations (email, tempPassword)               | TL2 - US-02     | 30m       |          | tempPassword: min 12 ký tự, required                          |
| `views/UnlockAccountRequest/` + page `/unlock-account`                                | TL3 - Mục 3.7   | 1h 30m    |          | Submit → requestUnlock → hiển thị "Kiểm tra email của bạn"    |
| `views/UnlockAccountVerify/` + page `/unlock-account/verify`                          | TL3 - Mục 3.7   | 1h 30m    |          | Submit → verifyUnlock → lưu tokens → redirect dashboard       |
| Cập nhật auth store — lưu tokens sau khi verify unlock thành công                     | TL3 - Mục 3.5   | 30m       |          | Tương tự login — set accessToken, idToken (refreshToken qua cookie) |
| Liên kết từ trang login — hiển thị link "Mở khoá tài khoản" khi lỗi account locked   | TL2 - TC-02.1   | 45m       |          | Khi login trả về lỗi ACCOUNT_LOCKED → link tới `/unlock-account?email=` |

### Phase 4: Testing & QA

| Task                                                                          | Tham chiếu            | Ước lượng | Assignee | Ghi chú |
| ----------------------------------------------------------------------------- | --------------------- | --------- | -------- | ------- |
| Unit test 2 API functions trong `dataSources/UnlockAccount`                   | TL2 - TC-01.1, 02.1   | 30m       |          |         |
| Unit test form validations (Zod schemas)                                      | TL2 - Validation rules | 20m       |          |         |
| Component test UnlockAccountRequest — submit, cooldown error, rate limit      | TL2 - TC-01.x          | 45m       |          |         |
| Component test UnlockAccountVerify — submit, expired error, wrong password    | TL2 - TC-02.x          | 45m       |          |         |

---

## 4.3. Tổng hợp theo Phase

| Phase                   | Ước lượng (không buffer) | Ước lượng (có buffer 1.3x) |
| ----------------------- | ------------------------ | -------------------------- |
| 1. Setup & Foundation   | 1h                       | 1h 18m                     |
| 2. Backend Development  | ✅ Hoàn thành            | —                          |
| 3. Frontend Development | 5h 15m                   | 6h 50m                     |
| 4. Testing & QA         | 2h 20m                   | 3h 2m                      |
| **TỔNG**                | **8h 35m**               | **~11h (~1.5 ngày)**       |
