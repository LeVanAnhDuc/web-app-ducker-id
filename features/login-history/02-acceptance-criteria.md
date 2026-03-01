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
- 🔴 **Error Case** — Lỗi hệ thống, dependency lỗi

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Ghi lại đăng nhập thành công

| ID      | Loại     | Scenario                                                                                                                                                                                                                                                         | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** user đăng nhập thành công bằng password **WHEN** login hoàn tất **THEN** ghi record với userId, email, method=password, status=success, IP, deviceType, OS, browser, country, city, clientType=web, isAnomaly=false                                    | ⚪         |
| TC-01.2 | 🟢 Happy | **GIVEN** user đăng nhập thành công bằng OTP **WHEN** login hoàn tất **THEN** ghi record với method=otp, các field metadata đầy đủ                                                                                                                              | ⚪         |
| TC-01.3 | 🟢 Happy | **GIVEN** user đăng nhập thành công bằng magic link **WHEN** login hoàn tất **THEN** ghi record với method=magic-link                                                                                                                                           | ⚪         |
| TC-01.4 | 🟡 Edge  | **GIVEN** request từ mobile app với header x-client-type=ios **WHEN** đăng nhập thành công **THEN** ghi record với clientType=mobile_ios                                                                                                                        | ⚪         |
| TC-01.5 | 🟡 Edge  | **GIVEN** request không có User-Agent header **WHEN** đăng nhập thành công **THEN** ghi record với deviceType=unknown, os=Unknown, browser=Unknown                                                                                                              | ⚪         |
| TC-01.6 | 🟡 Edge  | **GIVEN** request từ private IP (192.168.x.x, 10.x.x.x) **WHEN** đăng nhập thành công **THEN** ghi record với country=Unknown, city=Unknown                                                                                                                   | ⚪         |

### US-02: Ghi lại đăng nhập thất bại

| ID      | Loại     | Scenario                                                                                                                                                                                                              | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** user nhập sai mật khẩu **WHEN** login thất bại **THEN** ghi record với status=failed, failReason tương ứng, userId có thể null nếu email không tồn tại                                                   | ⚪         |
| TC-02.2 | 🟢 Happy | **GIVEN** user nhập sai OTP **WHEN** verify thất bại **THEN** ghi record với method=otp, status=failed                                                                                                              | ⚪         |
| TC-02.3 | 🟡 Edge  | **GIVEN** email không tồn tại trong hệ thống **WHEN** login thất bại **THEN** ghi record với userId=null, email attempted vẫn được ghi lại                                                                         | ⚪         |
| TC-02.4 | 🔴 Error | **GIVEN** MongoDB không khả dụng **WHEN** cố ghi login history **THEN** lỗi được catch và log, KHÔNG ảnh hưởng luồng login chính (non-blocking)                                                                    | ⚪         |

### US-03: Tự động xóa dữ liệu cũ

| ID      | Loại     | Scenario                                                                                                                                                    | Trạng thái |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** login history record được tạo cách đây > 90 ngày **WHEN** MongoDB TTL monitor chạy **THEN** record bị tự động xóa                                | ⚪         |
| TC-03.2 | 🟡 Edge  | **GIVEN** login history record được tạo cách đây < 90 ngày **WHEN** MongoDB TTL monitor chạy **THEN** record vẫn tồn tại                                   | ⚪         |

---

## 2.3. Validation Rules

| Field              | Rule                                                                | Validate tại |
| ------------------ | ------------------------------------------------------------------- | ------------ |
| usernameAttempted  | Required, trim, lowercase                                           | Model        |
| method             | Required, enum: password \| otp \| magic-link                      | Model        |
| status             | Required, enum: success \| failed                                   | Model        |
| failReason         | Nullable, enum of fail reasons                                      | Model        |
| ip                 | Required, trim, maxlength 45                                        | Model        |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                       | Rủi ro                  | Hành vi mong đợi                                          |
| ------------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| Nhiều login events đồng thời cho cùng user       | Write contention        | Mỗi event tạo document riêng, không conflict              |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                         | Giới hạn  | Hành vi khi vượt ngưỡng                    |
| --------------------------- | --------- | ------------------------------------------ |
| Login history retention     | 90 ngày   | Tự động xóa qua MongoDB TTL index          |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại        | Tiêu chí                                                                     |
| ----- | ----------- | ---------------------------------------------------------------------------- |
| NF-01 | Performance | Ghi login history là async, non-blocking — không tăng response time của login |
| NF-02 | Reliability | Lỗi ghi history chỉ được log, KHÔNG throw lên caller                        |
| NF-03 | Data        | MongoDB indexes tối ưu cho query theo userId, status, IP, createdAt          |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
