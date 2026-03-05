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

### US-05: Admin xem danh sách tất cả contact

| ID      | Loại     | Scenario                                                                                                                                                                                                   | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-05.1 | 🟢 Happy | **GIVEN** admin đã đăng nhập, có contacts trong DB **WHEN** GET /admin/contacts **THEN** trả về danh sách phân trang với fields: `_id`, `ticketNumber`, `email`, `subject`, `category`, `priority`, `status`, `userId`, `attachmentCount`, `createdAt`, `updatedAt` | ⚪ |
| TC-05.2 | 🟢 Happy | **GIVEN** admin muốn filter **WHEN** GET /admin/contacts?status=new&category=technical **THEN** chỉ trả về contacts thỏa mãn cả hai điều kiện (AND logic) | ⚪ |
| TC-05.3 | 🟢 Happy | **GIVEN** admin muốn search **WHEN** GET /admin/contacts?search=TK-20260303 **THEN** trả về contacts có ticketNumber, subject, hoặc email khớp (partial, case-insensitive) | ⚪ |
| TC-05.4 | 🟢 Happy | **GIVEN** admin muốn sort **WHEN** GET /admin/contacts?sortBy=priority&sortOrder=desc **THEN** contacts được sort theo priority giảm dần (high → medium → low) | ⚪ |
| TC-05.5 | 🟢 Happy | **GIVEN** có 35 contacts **WHEN** GET /admin/contacts?page=2&limit=10 **THEN** trả về records 11–20, meta: `{ total: 35, page: 2, limit: 10, totalPages: 4 }` | ⚪ |
| TC-05.6 | 🟢 Happy | **GIVEN** admin filter theo createdAt range **WHEN** GET /admin/contacts?fromDate=2026-01-01&toDate=2026-01-31 **THEN** chỉ trả về contacts trong khoảng đó | ⚪ |
| TC-05.7 | 🟢 Happy | **GIVEN** admin filter theo userId **WHEN** GET /admin/contacts?userId=abc123 **THEN** chỉ trả về contacts của user đó | ⚪ |
| TC-05.8 | 🟡 Edge  | **GIVEN** không có contact nào trong DB **WHEN** GET /admin/contacts **THEN** trả về `{ items: [], meta: { total: 0, ... } }`, không phải 404 | ⚪ |
| TC-05.9 | 🟡 Edge  | **GIVEN** filter không khớp bất kỳ record nào **WHEN** GET /admin/contacts?status=resolved **THEN** trả về empty array, không báo lỗi | ⚪ |
| TC-05.10 | 🟡 Edge | **GIVEN** limit=500 (vượt max) **WHEN** GET /admin/contacts **THEN** tự động cap về 100 | ⚪ |
| TC-05.11 | 🔴 Error | **GIVEN** user thường gọi API **WHEN** GET /admin/contacts **THEN** 403 Forbidden | ⚪ |
| TC-05.12 | 🔴 Error | **GIVEN** không có token **WHEN** GET /admin/contacts **THEN** 401 Unauthorized | ⚪ |
| TC-05.13 | 🔴 Error | **GIVEN** status=invalid_value **WHEN** GET /admin/contacts **THEN** 400 Bad Request với message mô tả field lỗi | ⚪ |
| TC-05.14 | 🔴 Error | **GIVEN** MongoDB timeout **WHEN** GET /admin/contacts **THEN** 500, lỗi được log | ⚪ |

### US-06: Admin xem chi tiết một contact

| ID      | Loại     | Scenario                                                                                                                                                                                                   | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-06.1 | 🟢 Happy | **GIVEN** contact tồn tại **WHEN** GET /admin/contacts/:id **THEN** trả về full fields: tất cả fields của list + `message` (đầy đủ), `ipAddress`, `attachments` array với `previewUrl` cho image files | ⚪ |
| TC-06.2 | 🟢 Happy | **GIVEN** contact có 2 ảnh và 1 PDF đính kèm **WHEN** GET /admin/contacts/:id **THEN** response: ảnh có `previewUrl` là URL hợp lệ, PDF có `previewUrl: null` | ⚪ |
| TC-06.3 | 🟢 Happy | **GIVEN** contact không có file đính kèm **WHEN** GET /admin/contacts/:id **THEN** `attachments: []` | ⚪ |
| TC-06.4 | 🟡 Edge  | **GIVEN** contact là của guest (không có userId) **WHEN** GET /admin/contacts/:id **THEN** trả về `userId: null`, vẫn hiển thị đầy đủ thông tin | ⚪ |
| TC-06.5 | 🔴 Error | **GIVEN** id không tồn tại **WHEN** GET /admin/contacts/:id **THEN** 404 Not Found | ⚪ |
| TC-06.6 | 🔴 Error | **GIVEN** id có format không hợp lệ (không phải ObjectId 24 ký tự) **WHEN** GET /admin/contacts/:id **THEN** 400 Bad Request | ⚪ |
| TC-06.7 | 🔴 Error | **GIVEN** user thường gọi API **WHEN** GET /admin/contacts/:id **THEN** 403 Forbidden | ⚪ |

### US-07: Admin cập nhật trạng thái contact

| ID      | Loại     | Scenario                                                                                                                                                                         | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-07.1 | 🟢 Happy | **GIVEN** contact có status=new **WHEN** PATCH /admin/contacts/:id/status với body `{ status: "processing" }` **THEN** 200, contact được update, response trả về contact đã update | ⚪ |
| TC-07.2 | 🟢 Happy | **GIVEN** contact có status=processing **WHEN** PATCH với `{ status: "resolved" }` **THEN** 200, status cập nhật thành công | ⚪ |
| TC-07.3 | 🟢 Happy | **GIVEN** admin update **WHEN** PATCH thành công **THEN** `updatedAt` được cập nhật tự động | ⚪ |
| TC-07.4 | 🟡 Edge  | **GIVEN** contact đã resolved **WHEN** PATCH với `{ status: "new" }` **THEN** 200, cho phép đổi về new (không lock workflow) | ⚪ |
| TC-07.5 | 🔴 Error | **GIVEN** id không tồn tại **WHEN** PATCH /admin/contacts/:id/status **THEN** 404 Not Found | ⚪ |
| TC-07.6 | 🔴 Error | **GIVEN** body `{ status: "invalid" }` **WHEN** PATCH **THEN** 400 Bad Request | ⚪ |
| TC-07.7 | 🔴 Error | **GIVEN** body rỗng hoặc thiếu field status **WHEN** PATCH **THEN** 400 Bad Request | ⚪ |
| TC-07.8 | 🔴 Error | **GIVEN** user thường gọi API **WHEN** PATCH **THEN** 403 Forbidden | ⚪ |

### US-08: User xem danh sách contact của chính mình

| ID      | Loại     | Scenario                                                                                                                                                                         | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-08.1 | 🟢 Happy | **GIVEN** user đã đăng nhập, có contacts **WHEN** GET /auth/contacts/me **THEN** chỉ trả về contacts của userId đó, fields: `ticketNumber`, `subject`, `category`, `priority`, `status`, `attachmentCount`, `createdAt` | ⚪ |
| TC-08.2 | 🟢 Happy | **GIVEN** user sort **WHEN** GET /auth/contacts/me?sortBy=createdAt&sortOrder=asc **THEN** trả về sort đúng | ⚪ |
| TC-08.3 | 🟢 Happy | **GIVEN** user có 15 contacts **WHEN** GET /auth/contacts/me?page=2&limit=5 **THEN** trả về records 6–10, meta đúng | ⚪ |
| TC-08.4 | 🟡 Edge  | **GIVEN** user chưa có contact nào **WHEN** GET /auth/contacts/me **THEN** `{ items: [], meta: { total: 0, ... } }` | ⚪ |
| TC-08.5 | 🟡 Edge  | **GIVEN** user A đăng nhập **WHEN** GET /auth/contacts/me **THEN** không thấy bất kỳ contact nào của user B | ⚪ |
| TC-08.6 | 🔴 Error | **GIVEN** không có token **WHEN** GET /auth/contacts/me **THEN** 401 Unauthorized | ⚪ |
| TC-08.7 | 🔴 Error | **GIVEN** MongoDB timeout **WHEN** GET /auth/contacts/me **THEN** 500, lỗi được log | ⚪ |

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

**Query params (GET /admin/contacts & GET /auth/contacts/me):**

| Param      | Rule                                                                                       | Validate tại |
| ---------- | ------------------------------------------------------------------------------------------ | ------------ |
| page       | Optional, integer >= 1, default: 1                                                         | Controller   |
| limit      | Optional, integer 1–100, default: 20, tự động cap tại 100                                 | Controller   |
| status     | Optional, enum: new \| processing \| resolved                                              | Controller   |
| category   | Optional, enum: account \| technical \| feature \| billing \| security \| other           | Controller   |
| priority   | Optional, enum: low \| medium \| high                                                      | Controller   |
| email      | Optional, string, trim (chỉ Admin API)                                                     | Controller   |
| ticketNumber | Optional, string, trim (chỉ Admin API)                                                   | Controller   |
| userId     | Optional, valid ObjectId 24 ký tự (chỉ Admin API)                                         | Controller   |
| search     | Optional, string, trim — tìm trong subject, email, ticketNumber (chỉ Admin API)            | Controller   |
| fromDate   | Optional, ISO 8601 date string                                                             | Controller   |
| toDate     | Optional, ISO 8601 date string, phải >= fromDate nếu cả hai đều có                        | Controller   |
| sortBy     | Optional, enum: createdAt \| priority \| status \| category, default: createdAt           | Controller   |
| sortOrder  | Optional, enum: asc \| desc, default: desc                                                 | Controller   |

**Body (PATCH /admin/contacts/:id/status):**

| Field  | Rule                                         | Validate tại |
| ------ | -------------------------------------------- | ------------ |
| status | Required, enum: new \| processing \| resolved | Controller   |

**Params (:id):**

| Param | Rule                                         | Validate tại |
| ----- | -------------------------------------------- | ------------ |
| id    | Required, valid ObjectId pattern `/^[a-fA-F0-9]{24}$/` | Controller |

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
| NF-06 | Security      | Admin API: chỉ role `admin` mới được gọi, trả về 403 với role khác    |
| NF-07 | Security      | User API `/auth/contacts/me`: user chỉ thấy contacts của chính mình   |
| NF-08 | Performance   | Query API response time < 500ms với dataset 100k records (có index)    |
| NF-09 | Data          | `previewUrl` trong attachments: chỉ sinh URL cho image files (jpg/jpeg/png/gif), non-image trả về `null` |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu (NF-01 đến NF-09)
- [ ] Admin không thể truy cập User API và ngược lại
- [ ] User chỉ thấy contacts của chính mình (isolation)
- [ ] Image preview URL hoạt động đúng, PDF/DOC không có previewUrl
- [ ] Unit test coverage >= 90%
- [ ] Swagger/OpenAPI cập nhật cho 4 endpoints mới
- [ ] Không có bug severity Critical hoặc High còn open
