# TÀI LIỆU 2: TEST CASES & ACCEPTANCE CRITERIA

> Map với từng User Story ở Tài liệu 1.

---

## 2.1. Quy ước đọc

- 🟢 **Happy Path** — Luồng chính, input hợp lệ
- 🟡 **Edge Case** — Input bất thường, trạng thái đặc biệt
- 🔴 **Error Case** — Lỗi hệ thống, auth fail, dependency lỗi

**Trạng thái:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Authenticated user xem full profile của bản thân

| ID      | Loại     | Scenario                                                                                                                                                   | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** gọi `GET /api/v1/users/me` với valid access token **THEN** trả 200 với đầy đủ: `_id`, `fullName`, `phone`, `avatar`, `address`, `dateOfBirth`, `gender`, `email`, `createdAt` | ⚪         |
| TC-01.2 | 🟢 Happy | **GIVEN** user đã đăng nhập nhưng chưa set phone/address/dateOfBirth **WHEN** gọi `GET /api/v1/users/me` **THEN** trả 200, các field optional là `null` hoặc omitted | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** access token sắp hết hạn (< 1 phút) **THEN** vẫn trả 200 bình thường (token còn valid)                               | ⚪         |
| TC-01.4 | 🔴 Error | **GIVEN** không có Authorization header **WHEN** gọi `GET /api/v1/users/me` **THEN** trả 401 Unauthorized                                                 | ⚪         |
| TC-01.5 | 🔴 Error | **GIVEN** access token bị giả mạo hoặc sai chữ ký **WHEN** gọi `GET /api/v1/users/me` **THEN** trả 401 Unauthorized                                      | ⚪         |
| TC-01.6 | 🔴 Error | **GIVEN** access token hợp lệ nhưng MongoDB unreachable **WHEN** gọi `GET /api/v1/users/me` **THEN** trả 500 Internal Server Error                        | ⚪         |

---

### US-02: Authenticated user cập nhật thông tin cá nhân

| ID      | Loại     | Scenario                                                                                                                                                                               | Trạng thái |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** gọi `PATCH /api/v1/users/me` với `{ fullName: "Nguyen Van A" }` **THEN** trả 200, `fullName` được cập nhật, các field khác không thay đổi      | ⚪         |
| TC-02.2 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** gọi `PATCH` với đầy đủ tất cả field hợp lệ (fullName, phone, address, dateOfBirth, gender) **THEN** trả 200, tất cả field được update           | ⚪         |
| TC-02.3 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** gọi `PATCH` chỉ với `{ gender: "female" }` **THEN** trả 200, chỉ gender thay đổi, các field khác giữ nguyên                                     | ⚪         |
| TC-02.4 | 🟡 Edge  | **GIVEN** user có phone đã set **WHEN** gửi `{ phone: "" }` **THEN** trả 422 Validation Error — phone không được phép để trống                                                       | ⚪         |
| TC-02.5 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gửi body rỗng `{}` **THEN** trả 200, không có field nào thay đổi (partial update, không có gì để update)                                        | ⚪         |
| TC-02.6 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gửi `{ dateOfBirth: "2030-01-01" }` (ngày tương lai) **THEN** trả 422 Validation Error                                                           | ⚪         |
| TC-02.7 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gửi `{ dateOfBirth: "1900-01-01" }` (> 100 tuổi) **THEN** trả 422 Validation Error                                                              | ⚪         |
| TC-02.8 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gửi `{ fullName: "A" }` (< 2 ký tự) **THEN** trả 422 Validation Error                                                                           | ⚪         |
| TC-02.9 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gửi `{ gender: "alien" }` (không thuộc enum) **THEN** trả 422 Validation Error                                                                  | ⚪         |
| TC-02.10 | 🟡 Edge | **GIVEN** user đã đăng nhập **WHEN** gửi field không tồn tại `{ email: "new@test.com" }` **THEN** trả 200, field đó bị ignore — email không thay đổi                                 | ⚪         |
| TC-02.11 | 🔴 Error | **GIVEN** không có Authorization header **WHEN** gọi `PATCH /api/v1/users/me` **THEN** trả 401 Unauthorized                                                                          | ⚪         |
| TC-02.12 | 🔴 Error | **GIVEN** MongoDB unreachable **WHEN** gọi `PATCH /api/v1/users/me` với data hợp lệ **THEN** trả 500 Internal Server Error                                                           | ⚪         |

---

### US-03: Authenticated user upload avatar

| ID      | Loại     | Scenario                                                                                                                                                                        | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** user đã đăng nhập, chưa có avatar **WHEN** gọi `POST /api/v1/users/me/avatar` với file JPG hợp lệ (< 10MB) **THEN** trả 200, `avatarUrl` là full URL đến file đã lưu | ⚪         |
| TC-03.2 | 🟢 Happy | **GIVEN** user đã đăng nhập, đã có avatar cũ **WHEN** upload avatar mới hợp lệ **THEN** trả 200, `avatarUrl` là URL của file mới, file cũ vẫn còn trên disk                   | ⚪         |
| TC-03.3 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** upload file PNG, WEBP, GIF, AVIF hợp lệ **THEN** trả 200 với URL tương ứng                                                                | ⚪         |
| TC-03.4 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** upload file đúng đuôi `.jpg` nhưng MIME type thực tế là `application/pdf` **THEN** trả 400 File type not supported                        | ⚪         |
| TC-03.5 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** upload file `9.99MB` (< 10MB, gần đến giới hạn) **THEN** trả 200 thành công                                                              | ⚪         |
| TC-03.6 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** upload file `10.01MB` (vượt giới hạn) **THEN** trả 400 File too large                                                                     | ⚪         |
| TC-03.7 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gửi request không có file đính kèm **THEN** trả 400 No file uploaded                                                                      | ⚪         |
| TC-03.8 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** upload file `.exe` hoặc `.pdf` **THEN** trả 400 File type not supported                                                                   | ⚪         |
| TC-03.9 | 🔴 Error | **GIVEN** không có Authorization header **WHEN** gọi `POST /api/v1/users/me/avatar` **THEN** trả 401 Unauthorized                                                              | ⚪         |
| TC-03.10 | 🔴 Error | **GIVEN** disk đầy hoặc không có quyền ghi vào thư mục uploads **WHEN** upload avatar hợp lệ **THEN** trả 500 Internal Server Error, DB không bị update                        | ⚪         |

---

### US-04: Guest/anyone xem public profile của người khác

| ID      | Loại     | Scenario                                                                                                                                                         | Trạng thái |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** không có auth header (guest) **WHEN** gọi `GET /api/v1/users/:id` với ID tồn tại **THEN** trả 200 với chỉ `{ _id, fullName, avatar, gender }`         | ⚪         |
| TC-04.2 | 🟢 Happy | **GIVEN** user đã đăng nhập **WHEN** gọi `GET /api/v1/users/:id` của người khác **THEN** trả 200 với chỉ `{ _id, fullName, avatar, gender }` (không nhiều hơn) | ⚪         |
| TC-04.3 | 🟡 Edge  | **GIVEN** user đã đăng nhập **WHEN** gọi `GET /api/v1/users/:id` với chính ID của mình **THEN** trả 200 với public fields — KHÔNG trả full profile              | ⚪         |
| TC-04.4 | 🟡 Edge  | **GIVEN** user chưa set avatar **WHEN** gọi `GET /api/v1/users/:id` **THEN** trả 200, `avatar` là `null`                                                        | ⚪         |
| TC-04.5 | 🟡 Edge  | **GIVEN** ID là valid ObjectId format nhưng không tồn tại trong DB **WHEN** gọi `GET /api/v1/users/:id` **THEN** trả 404 Not Found                             | ⚪         |
| TC-04.6 | 🟡 Edge  | **GIVEN** ID không phải ObjectId hợp lệ (VD: `abc123`) **WHEN** gọi `GET /api/v1/users/:id` **THEN** trả 400 Invalid ID format                                 | ⚪         |
| TC-04.7 | 🔴 Error | **GIVEN** MongoDB unreachable **WHEN** gọi `GET /api/v1/users/:id` **THEN** trả 500 Internal Server Error                                                       | ⚪         |

---

## 2.3. Validation Rules

| Field         | Rule                                                                                         | Validate tại    |
| ------------- | -------------------------------------------------------------------------------------------- | --------------- |
| `fullName`    | Required nếu gửi lên. Min 2, max 100 ký tự. Chỉ chứa chữ cái, khoảng trắng, `-`, `'`, `.` | Client + Server |
| `phone`       | Optional. Nếu gửi lên, không được là empty string. Format: digits, spaces, `()`, `+`, `-`  | Client + Server |
| `address`     | Optional. Nếu gửi lên, max 500 ký tự. Chỉ chứa chữ cái, số, `,`, `.`, `-`, `'`, `/`, `#`  | Client + Server |
| `dateOfBirth` | Optional. Nếu gửi lên: không được là tương lai, tuổi không vượt 100 năm. Format ISO 8601   | Client + Server |
| `gender`      | Optional. Nếu gửi lên, phải thuộc enum: `male`, `female`, `other`, `prefer_not_to_say`      | Client + Server |
| `avatar file` | Required khi upload. Max 10MB. MIME type phải là: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif` | Server (multer) |
| `:id` param   | Phải là MongoDB ObjectId hợp lệ (24 hex chars)                                               | Server          |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                                                       | Rủi ro                          | Hành vi mong đợi                                              |
| -------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| User mở 2 tab cùng lúc, submit PATCH từ cả 2 tab gần như đồng thời              | Request sau ghi đè request trước | Last-write-wins — request nào đến sau sẽ thắng (chấp nhận được) |
| User upload avatar và PATCH profile đồng thời                                    | Race condition trong DB          | Mỗi request cập nhật field khác nhau — không conflict          |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                        | Giới hạn                                             | Hành vi khi vượt ngưỡng             |
| -------------------------- | ---------------------------------------------------- | ----------------------------------- |
| Kích thước file avatar     | Tối đa 10MB                                          | Trả 400, message "File too large"   |
| Định dạng avatar           | jpg, jpeg, png, webp, gif, avif (validate MIME type) | Trả 400, message "File type not supported" |
| Tuổi tối đa                | 100 năm tính từ ngày hiện tại                        | Trả 422 Validation Error            |
| dateOfBirth tương lai      | Không được vượt ngày hiện tại                        | Trả 422 Validation Error            |
| fullName độ dài            | Min 2, max 100 ký tự                                 | Trả 422 Validation Error            |
| address độ dài             | Max 500 ký tự                                        | Trả 422 Validation Error            |
| Rate limit update profile  | 10 req / IP / 15 phút                                | Trả 429 Too Many Requests           |
| Rate limit upload avatar   | 5 req / IP / 15 phút                                 | Trả 429 Too Many Requests           |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại        | Tiêu chí                                                                               |
| ----- | ----------- | -------------------------------------------------------------------------------------- |
| NF-01 | Security    | `GET /users/me` và `PATCH /users/me` yêu cầu valid JWT — không thể access profile người khác qua endpoint này |
| NF-02 | Security    | Public profile `GET /users/:id` KHÔNG trả phone, email, address — chỉ fullName, avatar, gender |
| NF-03 | Security    | File upload validate MIME type thực tế (không chỉ dựa vào extension) để tránh file giả mạo |
| NF-04 | Security    | Avatar URL không chứa thông tin nhạy cảm (path traversal safe)                        |
| NF-05 | Performance | `GET /users/me` và `GET /users/:id` response < 300ms trong điều kiện bình thường       |
| NF-06 | i18n        | Tất cả error/success message hỗ trợ cả tiếng Việt và tiếng Anh                        |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] API trả đúng format response theo chuẩn của project
- [ ] Không có bug severity Critical hoặc High còn open
