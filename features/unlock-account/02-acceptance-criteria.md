# TÀI LIỆU 2: TEST CASE

> Map với từng User Story ở Tài liệu 1.

---

## 2.1. Quy ước đọc

**Format test scenario:**

- **GIVEN:** Điều kiện ban đầu / trạng thái hệ thống
- **WHEN:** Hành động user thực hiện
- **THEN:** Kết quả mong đợi

**Phân loại scenario:**

- 🟢 **Happy Path** — Luồng chính, hệ thống hoạt động bình thường
- 🟡 **Edge Case** — Input bất thường, trạng thái đặc biệt
- 🔴 **Error Case** — Lỗi hệ thống, token lỗi

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Yêu cầu mở khóa tài khoản

| ID      | Loại     | Scenario                                                                                                                                                                                                                 | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** tài khoản bị lock do nhập sai mật khẩu nhiều lần **WHEN** gửi POST /unlock-account/request với email **THEN** mật khẩu tạm thời (16 ký tự) được gửi qua email, trả về `{ success: true }`                  | ⚪         |
| TC-01.2 | 🟡 Edge  | **GIVEN** email không tồn tại trong hệ thống **WHEN** yêu cầu unlock **THEN** vẫn trả về `{ success: true }` (không tiết lộ email có tồn tại), chỉ set cooldown, KHÔNG gửi email                                     | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** tài khoản tồn tại nhưng KHÔNG bị lock **WHEN** yêu cầu unlock **THEN** trả về lỗi 400 "Account is not locked"                                                                                               | ⚪         |
| TC-01.4 | 🟡 Edge  | **GIVEN** tài khoản bị deactivate (isActive = false) **WHEN** yêu cầu unlock **THEN** trả về lỗi 400 "Account has been suspended"                                                                                     | ⚪         |
| TC-01.5 | 🟡 Edge  | **GIVEN** vừa gửi request unlock chưa đến 60 giây **WHEN** gửi lại **THEN** trả về lỗi 400 "Please wait X seconds before requesting another unlock email"                                                             | ⚪         |
| TC-01.6 | 🟡 Edge  | **GIVEN** đã gửi 3 unlock requests trong 1 giờ (đạt rate limit) **WHEN** gửi thêm **THEN** trả về lỗi 429 "Too many unlock requests"                                                                                  | ⚪         |
| TC-01.7 | 🔴 Error | **GIVEN** email service bị lỗi **WHEN** gửi mật khẩu tạm thời **THEN** email không gửi được nhưng temp password đã lưu vào DB (user cần request lại)                                                                  | ⚪         |

### US-02: Xác thực mật khẩu tạm thời và mở khóa

| ID      | Loại     | Scenario                                                                                                                                                                                                                                                          | Trạng thái |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** mật khẩu tạm thời đã gửi và còn hiệu lực (< 15 phút) **WHEN** nhập đúng mật khẩu tạm thời **THEN** mở khóa thành công, reset failed attempts, trả về tokens (access + refresh), refresh token set vào cookie, ghi login history status=success      | ⚪         |
| TC-02.2 | 🟡 Edge  | **GIVEN** mật khẩu tạm thời đã hết hạn (> 15 phút) **WHEN** nhập mật khẩu **THEN** trả về lỗi 401 "Temporary password has expired"                                                                                                                            | ⚪         |
| TC-02.3 | 🟡 Edge  | **GIVEN** mật khẩu tạm thời đã được sử dụng 1 lần **WHEN** nhập lại lần 2 **THEN** trả về lỗi 401 "Invalid or expired temporary password" (single-use)                                                                                                        | ⚪         |
| TC-02.4 | 🟡 Edge  | **GIVEN** chưa từng request mật khẩu tạm thời (tempPasswordHash = null) **WHEN** gọi verify **THEN** trả về lỗi 401                                                                                                                                           | ⚪         |
| TC-02.5 | 🔴 Error | **GIVEN** nhập sai mật khẩu tạm thời **WHEN** verify **THEN** trả về lỗi 401 "Invalid or expired temporary password"                                                                                                                                           | ⚪         |
| TC-02.6 | 🔴 Error | **GIVEN** email không tồn tại **WHEN** gọi verify **THEN** trả về lỗi 401 (không tiết lộ email không tồn tại)                                                                                                                                                  | ⚪         |

---

## 2.3. Validation Rules

| Field        | Rule                                                | Error Message                                 | Validate tại |
| ------------ | --------------------------------------------------- | --------------------------------------------- | ------------ |
| email        | Required, format email hợp lệ                      | "Email không hợp lệ"                          | Server (Joi) |
| tempPassword | Required, tối thiểu 12 ký tự                       | "Mật khẩu tạm thời phải có ít nhất 12 ký tự" | Server (Joi) |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                            | Rủi ro                             | Hành vi mong đợi                                                        |
| ----------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| User request unlock 2 lần nhanh (trước khi cooldown)  | Gửi 2 email, tạo 2 temp passwords | Cooldown 60s ngăn request thứ 2, chỉ temp password cuối cùng hợp lệ    |
| User verify temp password 2 lần đồng thời             | Unlock 2 lần                       | Lần đầu OK, markTempPasswordUsed → lần sau bị reject                    |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                                | Giới hạn          | Hành vi khi vượt ngưỡng                          |
| ---------------------------------- | ----------------- | ------------------------------------------------- |
| Unlock request cooldown            | 60 giây           | HTTP 400 "Please wait X seconds"                  |
| Unlock request rate limit          | 3 req/email/giờ   | HTTP 429 "Too many unlock requests"               |
| Temp password expiry               | 15 phút           | HTTP 401 "Temporary password has expired"         |
| Temp password usage                | 1 lần duy nhất    | HTTP 401 "Invalid or expired temporary password"  |
| Temp password min length           | 12 ký tự          | Validation error                                  |
| Temp password generated length     | 16 ký tự          | N/A (server generates)                            |
| Verify endpoint rate limit (IP)    | Shared với login   | HTTP 429 (loginByIp middleware)                   |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại     | Tiêu chí                                                                               |
| ----- | -------- | -------------------------------------------------------------------------------------- |
| NF-01 | Security | Mật khẩu tạm thời được hash bằng bcrypt trước khi lưu vào MongoDB                    |
| NF-02 | Security | Mật khẩu tạm thời sinh từ crypto.randomBytes (cryptographically secure)                |
| NF-03 | Security | Không tiết lộ email có tồn tại hay không qua response message                          |
| NF-04 | Security | Temp password chứa ít nhất: 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt          |
| NF-05 | Security | Temp password single-use — đánh dấu `tempPasswordUsed` sau khi dùng                   |
| NF-06 | i18n     | Error messages hỗ trợ Tiếng Việt và Tiếng Anh                                          |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
