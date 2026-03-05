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

### US-04: User xem lịch sử đăng nhập của chính mình

| ID      | Loại     | Scenario                                                                                                                                                                                                                             | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** user đã đăng nhập, có records trong DB **WHEN** GET /auth/login-history (không filter) **THEN** trả về danh sách phân trang, chỉ chứa records của chính user, IP bị mask thành `x.x.*.*`                                   | ⚪         |
| TC-04.2 | 🟢 Happy | **GIVEN** user có cả records success và failed **WHEN** GET /auth/login-history?status=failed **THEN** chỉ trả về records có status=failed                                                                                           | ⚪         |
| TC-04.3 | 🟢 Happy | **GIVEN** user có records với nhiều method khác nhau **WHEN** GET /auth/login-history?method=otp **THEN** chỉ trả về records có method=otp                                                                                          | ⚪         |
| TC-04.4 | 🟢 Happy | **GIVEN** user có records trong nhiều ngày **WHEN** GET /auth/login-history?fromDate=2026-01-01&toDate=2026-01-31 **THEN** chỉ trả về records trong khoảng createdAt đó                                                              | ⚪         |
| TC-04.5 | 🟢 Happy | **GIVEN** user có nhiều records **WHEN** GET /auth/login-history?sortBy=createdAt&sortOrder=asc **THEN** trả về records sort cũ nhất trước                                                                                           | ⚪         |
| TC-04.6 | 🟢 Happy | **GIVEN** user có 25 records, limit=10 **WHEN** GET /auth/login-history?page=2&limit=10 **THEN** trả về records 11–20, meta: `{ total: 25, page: 2, limit: 10, totalPages: 3 }`                                                      | ⚪         |
| TC-04.7 | 🟢 Happy | **GIVEN** user filter theo country=Vietnam **WHEN** GET /auth/login-history?country=Vietnam **THEN** chỉ trả về records có country=Vietnam                                                                                          | ⚪         |
| TC-04.8 | 🟡 Edge  | **GIVEN** user chưa có bất kỳ login history nào **WHEN** GET /auth/login-history **THEN** trả về `{ data: [], meta: { total: 0, page: 1, ... } }`, không phải 404                                                                   | ⚪         |
| TC-04.9 | 🟡 Edge  | **GIVEN** user có 5 records, limit=10 **WHEN** GET /auth/login-history?page=2 **THEN** trả về `{ data: [], meta: { total: 5, page: 2, totalPages: 1 } }`, không phải lỗi                                                           | ⚪         |
| TC-04.10| 🟡 Edge  | **GIVEN** request với limit=500 (vượt max=100) **WHEN** GET /auth/login-history **THEN** tự động cap về limit=100, không báo lỗi                                                                                                    | ⚪         |
| TC-04.11| 🟡 Edge  | **GIVEN** filter kết hợp nhiều field: status=failed&method=otp&country=Vietnam **WHEN** GET /auth/login-history **THEN** chỉ trả về records thỏa mãn tất cả điều kiện (AND logic)                                                   | ⚪         |
| TC-04.12| 🔴 Error | **GIVEN** request không có Authorization header **WHEN** GET /auth/login-history **THEN** trả về 401 Unauthorized                                                                                                                    | ⚪         |
| TC-04.13| 🔴 Error | **GIVEN** request với status=invalid_value **WHEN** GET /auth/login-history **THEN** trả về 400 Bad Request với message mô tả field lỗi                                                                                             | ⚪         |
| TC-04.14| 🔴 Error | **GIVEN** fromDate có format không hợp lệ (e.g., "abc") **WHEN** GET /auth/login-history **THEN** trả về 400 Bad Request                                                                                                             | ⚪         |
| TC-04.15| 🔴 Error | **GIVEN** MongoDB timeout **WHEN** GET /auth/login-history **THEN** trả về 500, lỗi được log, không expose internal details                                                                                                          | ⚪         |

### US-05: Admin xem toàn bộ lịch sử đăng nhập

| ID      | Loại     | Scenario                                                                                                                                                                                                                             | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| TC-05.1 | 🟢 Happy | **GIVEN** admin đã đăng nhập, có records từ nhiều user **WHEN** GET /admin/login-history **THEN** trả về danh sách phân trang của TẤT CẢ user, IP hiển thị đầy đủ (không mask)                                                      | ⚪         |
| TC-05.2 | 🟢 Happy | **GIVEN** admin muốn xem history của user cụ thể **WHEN** GET /admin/login-history?userId=abc123 **THEN** chỉ trả về records của user đó                                                                                            | ⚪         |
| TC-05.3 | 🟢 Happy | **GIVEN** admin filter theo status=failed&country=China **WHEN** GET /admin/login-history **THEN** chỉ trả về failed records từ China, từ tất cả user                                                                               | ⚪         |
| TC-05.4 | 🟢 Happy | **GIVEN** admin muốn sort theo ip asc **WHEN** GET /admin/login-history?sortBy=ip&sortOrder=asc **THEN** trả về records sort theo IP, đầy đủ không mask                                                                             | ⚪         |
| TC-05.5 | 🟢 Happy | **GIVEN** admin filter theo userId + method + createdAt range **WHEN** GET /admin/login-history **THEN** trả về kết quả thỏa mãn tất cả điều kiện (AND logic)                                                                       | ⚪         |
| TC-05.6 | 🟡 Edge  | **GIVEN** DB không có bất kỳ login history nào **WHEN** GET /admin/login-history **THEN** trả về `{ data: [], meta: { total: 0, ... } }`, không phải 404                                                                            | ⚪         |
| TC-05.7 | 🟡 Edge  | **GIVEN** admin filter theo userId không tồn tại **WHEN** GET /admin/login-history **THEN** trả về empty array, không báo lỗi                                                                                                       | ⚪         |
| TC-05.8 | 🟡 Edge  | **GIVEN** userId có format hợp lệ nhưng không phải ObjectId **WHEN** GET /admin/login-history?userId=invalid-id **THEN** trả về 400 Bad Request                                                                                     | ⚪         |
| TC-05.9 | 🔴 Error | **GIVEN** user thường (không phải admin) gọi API **WHEN** GET /admin/login-history **THEN** trả về 403 Forbidden                                                                                                                    | ⚪         |
| TC-05.10| 🔴 Error | **GIVEN** request không có Authorization header **WHEN** GET /admin/login-history **THEN** trả về 401 Unauthorized                                                                                                                   | ⚪         |
| TC-05.11| 🔴 Error | **GIVEN** MongoDB timeout **WHEN** GET /admin/login-history **THEN** trả về 500, lỗi được log                                                                                                                                        | ⚪         |

---

## 2.3. Validation Rules

**Write (ghi lại sự kiện):**

| Field              | Rule                                                                | Validate tại |
| ------------------ | ------------------------------------------------------------------- | ------------ |
| usernameAttempted  | Required, trim, lowercase                                           | Model        |
| method             | Required, enum: password \| otp \| magic-link                      | Model        |
| status             | Required, enum: success \| failed                                   | Model        |
| failReason         | Nullable, enum of fail reasons                                      | Model        |
| ip                 | Required, trim, maxlength 45                                        | Model        |

**Query params (GET /auth/login-history & GET /admin/login-history):**

| Param       | Rule                                                                                   | Validate tại |
| ----------- | -------------------------------------------------------------------------------------- | ------------ |
| page        | Optional, integer >= 1, default: 1                                                     | Controller   |
| limit       | Optional, integer 1–100, default: 20, tự động cap tại 100                              | Controller   |
| status      | Optional, enum: success \| failed                                                      | Controller   |
| method      | Optional, enum: password \| otp \| magic-link                                          | Controller   |
| deviceType  | Optional, enum: desktop \| mobile \| tablet \| unknown                                 | Controller   |
| clientType  | Optional, enum: web \| mobile_ios \| mobile_android                                    | Controller   |
| country     | Optional, string, trim                                                                 | Controller   |
| city        | Optional, string, trim                                                                 | Controller   |
| os          | Optional, string, trim                                                                 | Controller   |
| browser     | Optional, string, trim                                                                 | Controller   |
| ip          | Optional, string, trim (chỉ Admin API)                                                 | Controller   |
| fromDate    | Optional, ISO 8601 date string (e.g., 2026-01-01)                                     | Controller   |
| toDate      | Optional, ISO 8601 date string, phải >= fromDate nếu cả hai đều có                    | Controller   |
| sortBy      | Optional, enum: createdAt \| method \| status \| country \| ip, default: createdAt    | Controller   |
| sortOrder   | Optional, enum: asc \| desc, default: desc                                             | Controller   |
| userId      | Optional, valid ObjectId string (chỉ Admin API)                                        | Controller   |

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
| NF-04 | Security    | User API: IP phải được mask thành `x.x.*.*` trước khi trả về client        |
| NF-05 | Security    | User API: mỗi user chỉ thấy records của chính mình, không thể truy cập của user khác |
| NF-06 | Security    | Admin API: chỉ user có role admin mới được gọi, trả về 403 với role khác   |
| NF-07 | Performance | Query API response time < 500ms với dataset 1 triệu records (có index)      |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu (NF-01 đến NF-07)
- [ ] IP masking hoạt động đúng trong User API response
- [ ] Admin không thể truy cập User API của người khác và ngược lại
- [ ] Unit test coverage >= 80%
- [ ] Swagger/OpenAPI documentation được cập nhật cho 2 endpoints mới
- [ ] Không có bug severity Critical hoặc High còn open
