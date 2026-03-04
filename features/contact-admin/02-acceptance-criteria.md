# TÀI LIỆU 2: TEST CASE & ACCEPTANCE CRITERIA

> Map với từng User Story ở Tài liệu 1. Mỗi User Story được cover ĐẦY ĐỦ cả happy path lẫn unhappy path.

---

## 2.1. Quy ước đọc

**Format test scenario:**

- **GIVEN:** Điều kiện ban đầu / trạng thái hệ thống
- **WHEN:** Hành động user thực hiện
- **THEN:** Kết quả mong đợi

**Phân loại scenario:**

- 🟢 **Happy Path** — Luồng chính, input hợp lệ, hệ thống hoạt động bình thường
- 🟡 **Edge Case** — Input bất thường, trạng thái dữ liệu đặc biệt, hành vi user không mong đợi
- 🔴 **Error Case** — Lỗi hệ thống, service down, timeout, lỗi từ dependency

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Là một guest/user, tôi muốn gửi yêu cầu liên hệ đến admin để được hỗ trợ giải quyết vấn đề

| ID      | Loại     | Scenario                                                                                                                                                                                       | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** guest truy cập trang liên hệ **WHEN** điền đầy đủ email, subject, category, priority, message và submit **THEN** hệ thống trả về 201 với ticket number, yêu cầu được lưu vào DB với status "new" | ⚪         |
| TC-01.2 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** gửi yêu cầu liên hệ (email tự động lấy từ tài khoản) **THEN** hệ thống trả về 201, yêu cầu được lưu với userId liên kết                                  | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** guest gửi form **WHEN** không điền email (email optional) **THEN** hệ thống vẫn chấp nhận và lưu yêu cầu, email = null                                                               | ⚪         |
| TC-01.4 | 🟡 Edge  | **GIVEN** user gửi form **WHEN** subject hoặc message chứa ký tự đặc biệt (HTML tags, script tags) **THEN** hệ thống sanitize input và lưu an toàn, không bị XSS                              | ⚪         |
| TC-01.5 | 🟡 Edge  | **GIVEN** user gửi form **WHEN** message rất dài (giới hạn tối đa) **THEN** hệ thống từ chối với message validation error                                                                      | ⚪         |
| TC-01.6 | 🔴 Error | **GIVEN** hệ thống hoạt động bình thường **WHEN** MongoDB bị down trong lúc lưu yêu cầu **THEN** hệ thống trả về 500 Internal Server Error với thông báo phù hợp                               | ⚪         |
| TC-01.7 | 🔴 Error | **GIVEN** guest gửi form **WHEN** request body trống hoàn toàn **THEN** hệ thống trả về 400 Bad Request với chi tiết validation errors                                                          | ⚪         |

### US-02: Là một guest/user, tôi muốn chọn danh mục và mức độ ưu tiên để admin phân loại và xử lý nhanh hơn

| ID      | Loại     | Scenario                                                                                                                                                                            | Trạng thái |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** user điền form liên hệ **WHEN** chọn category = "technical" và priority = "high" **THEN** hệ thống lưu đúng category và priority vào DB                                   | ⚪         |
| TC-02.2 | 🟢 Happy | **GIVEN** user điền form liên hệ **WHEN** không chỉ định priority **THEN** hệ thống mặc định priority = "medium"                                                                    | ⚪         |
| TC-02.3 | 🟡 Edge  | **GIVEN** user gửi request trực tiếp qua API **WHEN** category = "invalid_category" (giá trị không hợp lệ) **THEN** hệ thống trả về 400 với thông báo category không hợp lệ         | ⚪         |
| TC-02.4 | 🟡 Edge  | **GIVEN** user gửi request trực tiếp qua API **WHEN** priority = "critical" (giá trị không trong danh sách) **THEN** hệ thống trả về 400 với thông báo priority không hợp lệ         | ⚪         |
| TC-02.5 | 🔴 Error | **GIVEN** user gửi form **WHEN** thiếu field category (required) **THEN** hệ thống trả về 400 Bad Request: "category is required"                                                    | ⚪         |

### US-03: Là một guest/user, tôi muốn đính kèm file để minh họa rõ hơn vấn đề tôi đang gặp

| ID      | Loại     | Scenario                                                                                                                                                                                           | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** user điền form liên hệ **WHEN** đính kèm 1 file ảnh (PNG, 2MB) **THEN** hệ thống upload thành công và lưu đường dẫn file vào yêu cầu liên hệ                                           | ⚪         |
| TC-03.2 | 🟢 Happy | **GIVEN** user điền form liên hệ **WHEN** gửi yêu cầu không có file đính kèm **THEN** hệ thống chấp nhận, attachments = []                                                                        | ⚪         |
| TC-03.3 | 🟢 Happy | **GIVEN** user điền form liên hệ **WHEN** đính kèm nhiều file (trong giới hạn) **THEN** hệ thống upload tất cả và lưu danh sách đường dẫn                                                         | ⚪         |
| TC-03.4 | 🟡 Edge  | **GIVEN** user đính kèm file **WHEN** file có kích thước vượt giới hạn cho phép (> 5MB) **THEN** hệ thống từ chối với thông báo "File quá lớn, tối đa 5MB"                                         | ⚪         |
| TC-03.5 | 🟡 Edge  | **GIVEN** user đính kèm file **WHEN** loại file không được hỗ trợ (VD: .exe, .bat) **THEN** hệ thống từ chối với thông báo "Loại file không được hỗ trợ"                                           | ⚪         |
| TC-03.6 | 🟡 Edge  | **GIVEN** user đính kèm file **WHEN** số lượng file vượt giới hạn cho phép **THEN** hệ thống từ chối với thông báo "Số lượng file đính kèm tối đa là X"                                            | ⚪         |
| TC-03.7 | 🔴 Error | **GIVEN** user đính kèm file **WHEN** disk storage đầy hoặc upload service lỗi **THEN** hệ thống trả về 500 với thông báo "Không thể upload file, vui lòng thử lại"                                | ⚪         |

### US-04: Là một admin, tôi muốn hệ thống lưu trữ tất cả yêu cầu liên hệ để xem xét và xử lý sau

| ID      | Loại     | Scenario                                                                                                                                                                                    | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** user gửi yêu cầu liên hệ thành công **WHEN** admin truy vấn DB **THEN** yêu cầu tồn tại trong collection với đầy đủ thông tin: email, subject, category, priority, message, status="new", createdAt | ⚪         |
| TC-04.2 | 🟢 Happy | **GIVEN** yêu cầu được tạo **WHEN** kiểm tra dữ liệu trong DB **THEN** có timestamps (createdAt, updatedAt), có ticket number duy nhất                                                     | ⚪         |
| TC-04.3 | 🟡 Edge  | **GIVEN** nhiều user gửi yêu cầu đồng thời **WHEN** hệ thống xử lý **THEN** mỗi yêu cầu có ticket number duy nhất, không trùng lặp                                                        | ⚪         |
| TC-04.4 | 🔴 Error | **GIVEN** DB index bị lỗi **WHEN** hệ thống cố tạo yêu cầu với ticket number trùng **THEN** hệ thống retry với ticket number mới hoặc trả về lỗi phù hợp                                   | ⚪         |

---

## 2.3. Validation Rules

| Field      | Rule                                                              | Error Message                              | Validate tại    |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------ | --------------- |
| email      | Phải đúng format email, optional (cho phép rỗng)                  | "Email không hợp lệ"                       | Client + Server |
| subject    | Required, min 5 ký tự, max 200 ký tự                             | "Tiêu đề là bắt buộc" / "Tiêu đề tối thiểu 5 ký tự" | Client + Server |
| category   | Required, phải thuộc: account, technical, feature, billing, security, other | "Danh mục là bắt buộc" / "Danh mục không hợp lệ" | Client + Server |
| priority   | Phải thuộc: low, medium, high. Mặc định: medium                  | "Mức độ ưu tiên không hợp lệ"              | Client + Server |
| message    | Required, min 20 ký tự, max 5000 ký tự                           | "Nội dung là bắt buộc" / "Nội dung tối thiểu 20 ký tự" | Client + Server |
| attachments | Optional, mỗi file max 5MB, tối đa 5 files, chỉ chấp nhận: jpg, jpeg, png, gif, pdf, doc, docx | "File quá lớn" / "Loại file không hỗ trợ" / "Tối đa 5 files" | Server          |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                            | Rủi ro                          | Hành vi mong đợi                                                  |
| ----------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| User click submit nhiều lần liên tiếp (double submit) | Tạo nhiều yêu cầu trùng lặp    | Rate limiting chặn request trùng, chỉ xử lý request đầu tiên      |
| Nhiều user gửi yêu cầu cùng lúc                      | Ticket number bị trùng          | Sử dụng counter hoặc UUID đảm bảo tính duy nhất                   |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                          | Giới hạn                | Hành vi khi vượt ngưỡng                              |
| ---------------------------- | ----------------------- | ---------------------------------------------------- |
| Rate limit (theo IP)         | 5 requests / 15 phút    | Trả về 429: "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau" |
| Kích thước file đính kèm     | Tối đa 5MB / file       | Trả về 400: "File quá lớn, tối đa 5MB"               |
| Số file đính kèm             | Tối đa 5 files / request | Trả về 400: "Số lượng file đính kèm tối đa là 5"     |
| Độ dài message               | Tối đa 5000 ký tự       | Trả về 400: validation error                          |
| Độ dài subject               | Tối đa 200 ký tự        | Trả về 400: validation error                          |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại          | Tiêu chí                                                              |
| ----- | ------------- | --------------------------------------------------------------------- |
| NF-01 | Performance   | API response time < 500ms (không tính thời gian upload file)           |
| NF-02 | Security      | Input được sanitize để chống XSS, SQL injection                        |
| NF-03 | Security      | File upload được validate MIME type thực sự (không chỉ extension)      |
| NF-04 | Reliability   | Nếu upload file thất bại, yêu cầu liên hệ vẫn được lưu (không mất dữ liệu text) |
| NF-05 | i18n          | Error messages hỗ trợ đa ngôn ngữ thông qua i18n                      |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 90%
- [ ] Không có bug severity Critical hoặc High còn open
