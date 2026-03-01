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
- 🔴 **Error Case** — Lỗi hệ thống, SMTP lỗi

**Trạng thái test:** ✅ Pass | ❌ Fail | ⚪ Chưa test

---

## 2.2. Test Scenarios theo User Story

### US-01: Gửi email OTP cho login

| ID      | Loại     | Scenario                                                                                                                                                                                          | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** SMTP transport đã khởi tạo **WHEN** gọi send(LOGIN_OTP, { email, data: { otp, expiryMinutes }, locale: "vi" }) **THEN** email được gửi với subject tiếng Việt, body chứa OTP block    | ⚪         |
| TC-01.2 | 🟢 Happy | **GIVEN** locale = "en" **WHEN** gửi login OTP email **THEN** subject và body bằng tiếng Anh                                                                                                    | ⚪         |
| TC-01.3 | 🔴 Error | **GIVEN** SMTP transport chưa khởi tạo **WHEN** gửi email **THEN** lỗi được catch và log, KHÔNG throw lên caller                                                                                | ⚪         |
| TC-01.4 | 🔴 Error | **GIVEN** SMTP connection bị refused **WHEN** gửi email **THEN** lỗi được catch và log, caller không bị ảnh hưởng                                                                               | ⚪         |

### US-02: Gửi email OTP cho signup

| ID      | Loại     | Scenario                                                                                                                                                                                          | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** SMTP transport OK **WHEN** gọi send(SIGNUP_OTP, { email, data: { otp, expiryMinutes }, locale }) **THEN** email được gửi với template signup OTP, chứa OTP block và warning messages   | ⚪         |

### US-03: Gửi email magic link

| ID      | Loại     | Scenario                                                                                                                                                                                                        | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** SMTP transport OK **WHEN** gọi send(MAGIC_LINK, { email, data: { magicLinkUrl, expiryMinutes }, locale }) **THEN** email được gửi với CTA button "Sign In Now" trỏ đến magicLinkUrl                 | ⚪         |
| TC-03.2 | 🟡 Edge  | **GIVEN** magicLinkUrl rất dài **WHEN** render template **THEN** button vẫn hiển thị đúng, URL không bị truncate                                                                                               | ⚪         |

### US-04: Gửi email unlock temp password

| ID      | Loại     | Scenario                                                                                                                                                                                                           | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** SMTP transport OK **WHEN** gọi send(UNLOCK_TEMP_PASSWORD, { email, data: { tempPassword, loginUrl }, locale }) **THEN** email được gửi với temp password hiển thị, CTA button "Log In Now", security warnings | ⚪         |
| TC-04.2 | 🟡 Edge  | **GIVEN** locale không được truyền (undefined) **WHEN** gửi email **THEN** sử dụng locale mặc định "vi"                                                                                                          | ⚪         |

---

## 2.3. Validation Rules

Không có validation riêng — input được validate bởi module caller trước khi gọi send().

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                           | Rủi ro                      | Hành vi mong đợi                                              |
| ---------------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Nhiều module gọi send() đồng thời                    | SMTP connection overload    | Connection pool (max 5) và rate limit (5/s) quản lý tự động  |
| Transport chưa initialize xong mà đã gọi send()     | Email không gửi được        | Error logged, caller không bị ảnh hưởng                       |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                          | Giới hạn                       | Hành vi khi vượt ngưỡng                        |
| ---------------------------- | ------------------------------ | ----------------------------------------------- |
| SMTP connections             | Max 5 concurrent               | Requests đợi trong pool queue                   |
| Messages per connection      | Max 100                        | Tạo connection mới                              |
| Email send rate              | 5 emails/giây                  | Emails được queued trong Nodemailer              |
| Gmail daily limit            | ~500 emails/ngày (free)        | Lỗi SMTP, cần nâng cấp hoặc đổi provider       |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại        | Tiêu chí                                                                           |
| ----- | ----------- | ---------------------------------------------------------------------------------- |
| NF-01 | Performance | Gửi email là async non-blocking — không tăng response time của API caller          |
| NF-02 | Reliability | Lỗi gửi email chỉ được log, KHÔNG throw lên caller                                |
| NF-03 | UX          | Email template responsive, hiển thị đúng trên Gmail, Outlook, Apple Mail           |
| NF-04 | i18n        | Subject và body hỗ trợ Tiếng Việt và Tiếng Anh                                    |
| NF-05 | Security    | Email credentials (USERNAME_EMAIL, PASSWORD_EMAIL) chỉ nằm trong .env              |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
