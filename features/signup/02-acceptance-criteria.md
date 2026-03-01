# TÀI LIỆU 2: TEST CASE

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

### US-01: Nhập email và nhận mã OTP

| ID      | Loại     | Scenario                                                                                                                                                                            | Trạng thái |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** email chưa tồn tại trong hệ thống **WHEN** nhập email hợp lệ và gửi OTP **THEN** OTP 6 chữ số được gửi qua email, trả về expiresIn=300 và cooldownSeconds=60           | ⚪         |
| TC-01.2 | 🟡 Edge  | **GIVEN** email đã được đăng ký trong hệ thống **WHEN** nhập email đó để đăng ký **THEN** trả về lỗi 409 "Email đã được sử dụng"                                                 | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** vừa gửi OTP chưa đến 60 giây **WHEN** gửi lại OTP cho cùng email **THEN** bị từ chối do cooldown, hiển thị thời gian chờ còn lại                                      | ⚪         |
| TC-01.4 | 🔴 Error | **GIVEN** email service bị lỗi **WHEN** gửi OTP **THEN** trả về lỗi 500, OTP không được lưu vào Redis                                                                           | ⚪         |
| TC-01.5 | 🔴 Error | **GIVEN** rate limit đạt ngưỡng (5/IP hoặc 3/email per 15 phút) **WHEN** gửi thêm request **THEN** trả về lỗi 429                                                               | ⚪         |

### US-02: Xác thực OTP

| ID      | Loại     | Scenario                                                                                                                                                                                               | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** OTP đã được gửi và còn hiệu lực (< 5 phút) **WHEN** nhập đúng 6 chữ số **THEN** xác thực thành công, nhận sessionToken (64 hex chars, hết hạn 30 phút), OTP data bị xóa khỏi Redis       | ⚪         |
| TC-02.2 | 🟡 Edge  | **GIVEN** OTP đã hết hạn (> 5 phút) **WHEN** nhập OTP **THEN** hiển thị lỗi "OTP đã hết hạn", yêu cầu gửi lại                                                                                      | ⚪         |
| TC-02.3 | 🟡 Edge  | **GIVEN** nhập sai OTP 5 lần **WHEN** nhập lần thứ 6 **THEN** bị lockout 15 phút, hiển thị thời gian chờ                                                                                            | ⚪         |
| TC-02.4 | 🟡 Edge  | **GIVEN** nhập sai OTP 3 lần **WHEN** nhập đúng OTP **THEN** xác thực thành công, counter reset                                                                                                      | ⚪         |
| TC-02.5 | 🔴 Error | **GIVEN** Redis không khả dụng **WHEN** verify OTP **THEN** trả về lỗi 500                                                                                                                           | ⚪         |

### US-03: Điền thông tin cá nhân và tạo tài khoản

| ID      | Loại     | Scenario                                                                                                                                                                                                                    | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** có sessionToken hợp lệ **WHEN** điền đầy đủ thông tin (fullName, gender, birthday, password, confirmPassword, acceptTerms=true) **THEN** tạo auth + user record, trả về tokens (access + refresh), tự động login | ⚪         |
| TC-03.2 | 🟡 Edge  | **GIVEN** sessionToken hết hạn (> 30 phút) **WHEN** submit thông tin **THEN** trả về lỗi "Phiên đăng ký hết hạn", yêu cầu bắt đầu lại                                                                                   | ⚪         |
| TC-03.3 | 🟡 Edge  | **GIVEN** sessionToken hợp lệ nhưng email đã bị người khác đăng ký (race condition) **WHEN** submit **THEN** trả về lỗi 409 "Email đã được sử dụng"                                                                      | ⚪         |
| TC-03.4 | 🟡 Edge  | **GIVEN** password không đạt yêu cầu (thiếu chữ hoa/thường/số) **WHEN** submit **THEN** hiển thị lỗi validation cụ thể                                                                                                   | ⚪         |
| TC-03.5 | 🟡 Edge  | **GIVEN** password và confirmPassword không khớp **WHEN** submit **THEN** hiển thị lỗi "Mật khẩu không khớp"                                                                                                              | ⚪         |
| TC-03.6 | 🟡 Edge  | **GIVEN** acceptTerms = false **WHEN** submit **THEN** validation lỗi, không cho phép tạo tài khoản                                                                                                                       | ⚪         |
| TC-03.7 | 🔴 Error | **GIVEN** MongoDB không khả dụng **WHEN** tạo tài khoản **THEN** trả về lỗi 500, không tạo record dở dang                                                                                                                | ⚪         |

### US-04: Kiểm tra email availability

| ID      | Loại     | Scenario                                                                                                                              | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** email chưa tồn tại **WHEN** check email **THEN** trả về `{ available: true }`                                              | ⚪         |
| TC-04.2 | 🟢 Happy | **GIVEN** email đã tồn tại **WHEN** check email **THEN** trả về `{ available: false }`                                               | ⚪         |
| TC-04.3 | 🔴 Error | **GIVEN** rate limit check-email đạt ngưỡng (10/IP/phút) **WHEN** gửi thêm request **THEN** trả về lỗi 429                          | ⚪         |

### US-05: Gửi lại OTP

| ID      | Loại     | Scenario                                                                                                                                                                                      | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-05.1 | 🟢 Happy | **GIVEN** đã qua cooldown 60 giây và chưa đạt max resend **WHEN** yêu cầu gửi lại OTP **THEN** OTP mới được gửi, trả về resendCount, remainingResends                                     | ⚪         |
| TC-05.2 | 🟡 Edge  | **GIVEN** cooldown chưa hết (< 60 giây) **WHEN** yêu cầu gửi lại **THEN** bị từ chối, hiển thị thời gian chờ còn lại                                                                      | ⚪         |
| TC-05.3 | 🟡 Edge  | **GIVEN** đã gửi lại 5 lần (đạt max resend) **WHEN** yêu cầu gửi lại **THEN** bị từ chối "Đã đạt giới hạn gửi lại"                                                                       | ⚪         |
| TC-05.4 | 🟡 Edge  | **GIVEN** email đã bị người khác đăng ký trong lúc chờ OTP **WHEN** resend OTP **THEN** trả về lỗi 409 "Email đã được sử dụng"                                                             | ⚪         |

---

## 2.3. Validation Rules

| Field           | Rule                                                               | Error Message                                   | Validate tại    |
| --------------- | ------------------------------------------------------------------ | ----------------------------------------------- | --------------- |
| email           | Required, format email hợp lệ (REGEX_EMAIL)                       | "Email không hợp lệ"                            | Client + Server |
| otp             | Required, đúng 6 chữ số                                           | "OTP phải gồm 6 chữ số"                         | Client + Server |
| sessionToken    | Required, hex string 64 ký tự                                     | "Token không hợp lệ"                            | Server          |
| fullName        | Required, tối thiểu 2 ký tự                                       | "Họ tên phải có ít nhất 2 ký tự"                | Client + Server |
| gender          | Required, enum: "male" \| "female" \| "other"                     | "Vui lòng chọn giới tính"                       | Client + Server |
| dateOfBirth     | Required, định dạng ngày hợp lệ, phải là ngày trong quá khứ      | "Ngày sinh không hợp lệ"                        | Client + Server |
| password        | Required, 8-100 ký tự, chứa chữ hoa + chữ thường + số            | "Mật khẩu phải chứa chữ hoa, chữ thường và số" | Client + Server |
| confirmPassword | Required, phải khớp với password                                   | "Mật khẩu không khớp"                           | Client + Server |
| acceptTerms     | Required, phải là true                                             | "Bạn phải đồng ý điều khoản"                    | Client + Server |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                               | Rủi ro                           | Hành vi mong đợi                                                       |
| -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| 2 user cùng đăng ký 1 email gần như đồng thời           | Tạo 2 tài khoản trùng email     | MongoDB unique index ngăn trùng, request sau nhận lỗi 409              |
| User gửi nhiều request send-otp cùng lúc                | Gửi nhiều email                  | Cooldown 60s + rate limiting ngăn gửi liên tiếp                        |
| User complete signup 2 lần với cùng sessionToken         | Tạo 2 tài khoản                  | Session bị xóa sau lần đầu, lần sau nhận lỗi "session không hợp lệ"   |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                          | Giới hạn                         | Hành vi khi vượt ngưỡng                           |
| ---------------------------- | -------------------------------- | -------------------------------------------------- |
| Rate limit send-otp (IP)     | 5 req/IP/15 phút                | HTTP 429                                           |
| Rate limit send-otp (email)  | 3 req/email/15 phút             | HTTP 429                                           |
| Rate limit check-email       | 10 req/IP/phút                  | HTTP 429                                           |
| OTP expiry                   | 5 phút                          | OTP hết hạn, cần gửi lại                           |
| OTP cooldown                 | 60 giây                         | Phải chờ hết cooldown mới gửi lại                  |
| OTP failed attempts          | 5 lần                           | Lockout 15 phút                                    |
| OTP max resend               | 5 lần/giờ                       | Không cho gửi thêm                                 |
| Session token expiry         | 30 phút                         | Phải bắt đầu lại quy trình đăng ký                |
| Password length              | 8-100 ký tự                     | Validation error                                   |
| fullName min length          | 2 ký tự                         | Validation error                                   |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại          | Tiêu chí                                                                       |
| ----- | ------------- | ------------------------------------------------------------------------------ |
| NF-01 | Performance   | API response < 500ms (trừ gửi email có thể lâu hơn)                           |
| NF-02 | Security      | OTP được hash trước khi lưu Redis, không lưu plaintext                         |
| NF-03 | Security      | Password hash bằng bcrypt (salt rounds: 10)                                    |
| NF-04 | Security      | Session token sinh từ crypto.randomBytes (64 hex chars)                        |
| NF-05 | Security      | Không tiết lộ thông tin tài khoản qua error message (trừ check-email endpoint) |
| NF-06 | Accessibility | Form navigable bằng keyboard, label đúng cho screen reader                     |
| NF-07 | i18n          | Hỗ trợ Tiếng Việt và Tiếng Anh đầy đủ (client + server messages)              |
| NF-08 | UX            | OTP input auto-focus sang ô tiếp theo, auto-submit khi nhập đủ 6 số           |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
