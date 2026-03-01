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
- 🟡 **Edge Case** — Trạng thái bất thường
- 🔴 **Error Case** — Token lỗi, thiếu token

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Refresh access token

| ID      | Loại     | Scenario                                                                                                                                                                                                                     | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** refresh token hợp lệ trong HTTP-only cookie **WHEN** gọi POST /auth/token/refresh **THEN** trả về access token mới + id token mới + expiresIn, refresh token cookie giữ nguyên                                   | ⚪         |
| TC-01.2 | 🟡 Edge  | **GIVEN** access token đã hết hạn nhưng refresh token còn hiệu lực **WHEN** gọi refresh **THEN** trả về tokens mới thành công (endpoint này không yêu cầu access token)                                                   | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** client gọi refresh 2 lần liên tiếp rất nhanh **WHEN** cả 2 request đều có valid refresh token **THEN** cả 2 đều thành công, trả về tokens khác nhau                                                             | ⚪         |
| TC-01.4 | 🔴 Error | **GIVEN** không có refresh token trong cookie **WHEN** gọi POST /auth/token/refresh **THEN** trả về lỗi 401 Unauthorized "Refresh token is required"                                                                       | ⚪         |
| TC-01.5 | 🔴 Error | **GIVEN** refresh token đã hết hạn (> 7 ngày) **WHEN** gọi refresh **THEN** trả về lỗi 403 Forbidden "Invalid or expired refresh token"                                                                                   | ⚪         |
| TC-01.6 | 🔴 Error | **GIVEN** refresh token bị giả mạo (invalid signature) **WHEN** gọi refresh **THEN** trả về lỗi 403 Forbidden "Invalid or expired refresh token"                                                                          | ⚪         |
| TC-01.7 | 🔴 Error | **GIVEN** refresh token là JWT hợp lệ nhưng signed bằng wrong secret **WHEN** gọi refresh **THEN** trả về lỗi 403 Forbidden                                                                                              | ⚪         |

---

## 2.3. Validation Rules

Không có request body validation — refresh token được đọc từ cookie.

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                        | Rủi ro                               | Hành vi mong đợi                                         |
| ------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Nhiều tab gọi refresh đồng thời                   | Tạo nhiều access tokens              | Tất cả đều thành công, tokens khác nhau đều valid         |
| Client retry refresh khi response chậm            | Duplicate requests                    | Tất cả đều thành công (stateless operation)               |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                  | Giới hạn  | Hành vi khi vượt ngưỡng                |
| -------------------- | --------- | --------------------------------------- |
| Access token expiry  | 8 giờ     | Cần gọi refresh để lấy token mới       |
| Refresh token expiry | 7 ngày    | Phải đăng nhập lại                      |
| ID token expiry      | 8 giờ     | Được refresh cùng access token          |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại        | Tiêu chí                                                                    |
| ----- | ----------- | --------------------------------------------------------------------------- |
| NF-01 | Performance | Refresh response < 100ms (chỉ verify + sign JWT, không có DB/Redis call)   |
| NF-02 | Security    | Refresh token chỉ đọc từ HTTP-only cookie (client JS không truy cập được)  |
| NF-03 | Security    | Mỗi token type dùng secret riêng biệt                                      |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
