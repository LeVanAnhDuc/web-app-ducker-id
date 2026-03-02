# TÀI LIỆU 2: TEST CASE & ACCEPTANCE CRITERIA

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

### US-01: Là một user, tôi muốn nhập email và nhận OTP để xác thực danh tính khi quên mật khẩu

| ID       | Loại     | Scenario                                                                                                                                                                    | Trạng thái |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1  | 🟢 Happy | **GIVEN** user có tài khoản với email hợp lệ **WHEN** nhập email và gửi yêu cầu OTP **THEN** API trả success, OTP 6 số được gửi về email, cooldown 60s bắt đầu              | ⚪         |
| TC-01.2  | 🟡 Edge  | **GIVEN** email không tồn tại trong hệ thống **WHEN** nhập email đó và gửi yêu cầu OTP **THEN** API vẫn trả success (chống enumeration), nhưng không gửi email thực tế       | ⚪         |
| TC-01.3  | 🟡 Edge  | **GIVEN** user vừa gửi OTP chưa quá 60s **WHEN** gửi yêu cầu OTP lại **THEN** API trả lỗi cooldown với thời gian còn lại                                                   | ⚪         |
| TC-01.4  | 🟡 Edge  | **GIVEN** user đã gửi OTP 3 lần (max resend) **WHEN** gửi yêu cầu lần thứ 4 **THEN** API trả lỗi vượt giới hạn gửi lại                                                    | ⚪         |
| TC-01.5  | 🟡 Edge  | **GIVEN** email có format không hợp lệ (vd: "abc", "abc@") **WHEN** gửi yêu cầu OTP **THEN** API trả lỗi validation format email                                           | ⚪         |
| TC-01.6  | 🟡 Edge  | **GIVEN** tài khoản bị inactive (isActive = false) **WHEN** gửi yêu cầu OTP **THEN** API vẫn trả success giả (chống enumeration), không gửi email                           | ⚪         |
| TC-01.7  | 🔴 Error | **GIVEN** Redis server không khả dụng **WHEN** gửi yêu cầu OTP **THEN** API trả lỗi 500 Internal Server Error                                                              | ⚪         |
| TC-01.8  | 🔴 Error | **GIVEN** Email service (SMTP) gặp lỗi **WHEN** gửi yêu cầu OTP **THEN** API trả lỗi 500, OTP không được lưu vào Redis (rollback)                                          | ⚪         |

---

### US-02: Là một user, tôi muốn nhập OTP đúng và được chuyển đến trang đặt lại mật khẩu mới

| ID       | Loại     | Scenario                                                                                                                                                                              | Trạng thái |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1  | 🟢 Happy | **GIVEN** OTP hợp lệ chưa hết hạn **WHEN** user nhập đúng OTP 6 số **THEN** API trả success + resetToken (64-char hex), OTP bị xóa khỏi Redis, client chuyển đến /reset-password      | ⚪         |
| TC-02.2  | 🟡 Edge  | **GIVEN** OTP đã hết hạn (> 5 phút) **WHEN** user nhập OTP **THEN** API trả lỗi OTP hết hạn, yêu cầu gửi lại                                                                        | ⚪         |
| TC-02.3  | 🟡 Edge  | **GIVEN** user nhập sai OTP **WHEN** submit **THEN** API trả lỗi OTP không đúng, failed attempts tăng 1                                                                               | ⚪         |
| TC-02.4  | 🟡 Edge  | **GIVEN** user đã nhập sai OTP 5 lần **WHEN** nhập lần thứ 6 **THEN** API trả lỗi tài khoản bị khóa tạm thời 15 phút, tất cả OTP data bị xóa                                        | ⚪         |
| TC-02.5  | 🟡 Edge  | **GIVEN** user chưa gửi yêu cầu OTP (không có OTP trong Redis) **WHEN** nhập bất kỳ OTP nào **THEN** API trả lỗi OTP không tồn tại hoặc hết hạn                                      | ⚪         |
| TC-02.6  | 🟡 Edge  | **GIVEN** user nhập OTP ít hơn 6 số **WHEN** submit **THEN** Client validate và không cho submit (validate phía client)                                                                | ⚪         |
| TC-02.7  | 🔴 Error | **GIVEN** Redis server không khả dụng **WHEN** user nhập OTP **THEN** API trả lỗi 500 Internal Server Error                                                                           | ⚪         |

---

### US-03: Là một user, tôi muốn nhập email và nhận magic link để xác thực danh tính khi quên mật khẩu

| ID       | Loại     | Scenario                                                                                                                                                                     | Trạng thái |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1  | 🟢 Happy | **GIVEN** user có tài khoản với email hợp lệ **WHEN** nhập email và gửi yêu cầu magic link **THEN** API trả success, email chứa magic link được gửi, cooldown 60s bắt đầu    | ⚪         |
| TC-03.2  | 🟡 Edge  | **GIVEN** email không tồn tại trong hệ thống **WHEN** gửi yêu cầu magic link **THEN** API vẫn trả success giả (chống enumeration), không gửi email                           | ⚪         |
| TC-03.3  | 🟡 Edge  | **GIVEN** user vừa gửi magic link chưa quá 60s **WHEN** gửi yêu cầu lại **THEN** API trả lỗi cooldown                                                                       | ⚪         |
| TC-03.4  | 🟡 Edge  | **GIVEN** user đã gửi magic link 3 lần (max resend) **WHEN** gửi lần thứ 4 **THEN** API trả lỗi vượt giới hạn                                                               | ⚪         |
| TC-03.5  | 🟡 Edge  | **GIVEN** email format không hợp lệ **WHEN** gửi yêu cầu **THEN** API trả lỗi validation                                                                                    | ⚪         |
| TC-03.6  | 🔴 Error | **GIVEN** Email service (SMTP) gặp lỗi **WHEN** gửi yêu cầu magic link **THEN** API trả lỗi 500, token không được lưu Redis                                                 | ⚪         |

---

### US-04: Là một user, tôi muốn click magic link trong email và được chuyển đến trang đặt lại mật khẩu mới

| ID       | Loại     | Scenario                                                                                                                                                                                                            | Trạng thái |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-04.1  | 🟢 Happy | **GIVEN** magic link hợp lệ chưa hết hạn **WHEN** user click link (GET /reset-password?email=...&token=...) **THEN** Client gọi verify API, nhận resetToken, hiển thị form đặt lại password                          | ⚪         |
| TC-04.2  | 🟡 Edge  | **GIVEN** magic link đã hết hạn (> 15 phút) **WHEN** user click link **THEN** API trả lỗi token hết hạn, client hiển thị thông báo và nút gửi lại                                                                   | ⚪         |
| TC-04.3  | 🟡 Edge  | **GIVEN** magic link đã được sử dụng 1 lần **WHEN** user click lại lần 2 **THEN** API trả lỗi token không tồn tại (đã bị xóa sau lần dùng đầu)                                                                      | ⚪         |
| TC-04.4  | 🟡 Edge  | **GIVEN** URL bị chỉnh sửa / token không hợp lệ **WHEN** user truy cập **THEN** API trả lỗi token không hợp lệ                                                                                                     | ⚪         |
| TC-04.5  | 🔴 Error | **GIVEN** Redis server không khả dụng **WHEN** user click magic link **THEN** API trả lỗi 500                                                                                                                       | ⚪         |

---

### US-05: Là một user, tôi muốn đặt mật khẩu mới mà không cần nhớ mật khẩu cũ

| ID       | Loại     | Scenario                                                                                                                                                                                            | Trạng thái |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-05.1  | 🟢 Happy | **GIVEN** user có resetToken hợp lệ **WHEN** nhập password mới + confirm password khớp nhau **THEN** password được cập nhật, tất cả session bị invalidate, resetToken bị xóa, redirect về /login     | ⚪         |
| TC-05.2  | 🟡 Edge  | **GIVEN** resetToken đã hết hạn (> 10 phút) **WHEN** submit đặt lại password **THEN** API trả lỗi token hết hạn, yêu cầu thực hiện lại từ đầu                                                      | ⚪         |
| TC-05.3  | 🟡 Edge  | **GIVEN** resetToken đã được dùng 1 lần **WHEN** submit lại lần 2 **THEN** API trả lỗi token không hợp lệ                                                                                          | ⚪         |
| TC-05.4  | 🟡 Edge  | **GIVEN** password mới không đáp ứng yêu cầu (quá ngắn, thiếu ký tự đặc biệt...) **WHEN** submit **THEN** Client validate và hiển thị lỗi, không gửi API                                           | ⚪         |
| TC-05.5  | 🟡 Edge  | **GIVEN** confirm password không khớp với password mới **WHEN** submit **THEN** Client validate và hiển thị lỗi                                                                                      | ⚪         |
| TC-05.6  | 🟡 Edge  | **GIVEN** resetToken hợp lệ **WHEN** password mới giống password cũ **THEN** Cho phép (không kiểm tra khác password cũ)                                                                              | ⚪         |
| TC-05.7  | 🔴 Error | **GIVEN** MongoDB không khả dụng khi update password **WHEN** submit **THEN** API trả lỗi 500, resetToken vẫn còn trong Redis (không bị xóa)                                                         | ⚪         |
| TC-05.8  | 🔴 Error | **GIVEN** Redis không khả dụng khi verify resetToken **WHEN** submit **THEN** API trả lỗi 500                                                                                                       | ⚪         |

---

### US-06: Là một user, tôi muốn gửi lại OTP/magic link nếu chưa nhận được email

| ID       | Loại     | Scenario                                                                                                                                                                | Trạng thái |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-06.1  | 🟢 Happy | **GIVEN** cooldown đã hết (> 60s) và chưa vượt resend limit **WHEN** nhấn nút gửi lại **THEN** OTP/magic link mới được gửi, OTP cũ bị xóa, cooldown reset                | ⚪         |
| TC-06.2  | 🟡 Edge  | **GIVEN** cooldown chưa hết (< 60s) **WHEN** nhấn nút gửi lại **THEN** Nút bị disable, hiển thị countdown thời gian còn lại                                             | ⚪         |
| TC-06.3  | 🟡 Edge  | **GIVEN** đã gửi lại 3 lần (max) **WHEN** nhấn nút gửi lại **THEN** API trả lỗi vượt giới hạn gửi lại                                                                  | ⚪         |

---

## 2.3. Validation Rules

| Field           | Rule                                                       | Error Message (key)                   | Validate tại    |
| --------------- | ---------------------------------------------------------- | ------------------------------------- | --------------- |
| email           | Required, valid email format (Joi.string().email())         | `validation.email.invalid`            | Client + Server |
| otp             | Required, exactly 6 digits, numeric only                   | `validation.otp.invalid`              | Client + Server |
| magicLinkToken  | Required, 128-char hex string                              | `validation.token.invalid`            | Server only     |
| resetToken      | Required, 128-char hex string                              | `validation.resetToken.invalid`       | Server only     |
| newPassword     | Required, min 8 chars, phải có uppercase + lowercase + number + special char | `validation.password.weak` | Client + Server |
| confirmPassword | Required, phải khớp với newPassword                        | `validation.password.mismatch`        | Client only     |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                                        | Rủi ro                                    | Hành vi mong đợi                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| User mở 2 tab, gửi OTP ở cả 2 tab cùng lúc                      | 2 OTP được tạo, OTP đầu bị ghi đè         | OTP sau ghi đè OTP trước trong Redis (chỉ OTP mới nhất hợp lệ), cooldown vẫn áp dụng |
| User verify OTP ở tab 1, đồng thời verify ở tab 2               | Reset token có thể bị tạo 2 lần           | OTP bị xóa sau lần verify đầu, lần verify thứ 2 sẽ fail (OTP không tồn tại)          |
| User submit reset password ở 2 tab cùng lúc                     | Password có thể bị update 2 lần           | Reset token bị xóa sau lần đầu, lần thứ 2 sẽ fail (token không tồn tại)              |
| User gửi OTP rồi ngay lập tức gửi magic link (hoặc ngược lại)   | 2 phương thức tồn tại song song           | Mỗi phương thức có Redis key riêng, cả 2 đều hợp lệ, resetToken chung khi verify     |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                                   | Giới hạn                    | Hành vi khi vượt ngưỡng                                         |
| ------------------------------------- | --------------------------- | --------------------------------------------------------------- |
| OTP expiry                            | 5 phút                     | OTP tự động hết hạn trong Redis, verify sẽ fail                  |
| Magic link expiry                     | 15 phút                    | Token tự động hết hạn trong Redis, verify sẽ fail                |
| Reset token expiry                    | 10 phút                    | Token tự động hết hạn, reset password sẽ fail                    |
| Cooldown giữa các lần gửi            | 60 giây                    | API trả lỗi kèm thời gian còn lại                                |
| Max resend OTP                        | 3 lần / window             | API trả lỗi "Đã vượt giới hạn gửi lại"                          |
| Max resend magic link                 | 3 lần / window             | API trả lỗi "Đã vượt giới hạn gửi lại"                          |
| Max failed OTP attempts               | 5 lần                      | Lockout 15 phút, xóa OTP data                                   |
| Rate limit per IP (OTP send)          | 10 requests / 15 phút      | HTTP 429 Too Many Requests                                       |
| Rate limit per email (OTP send)       | 5 requests / 15 phút       | HTTP 429 Too Many Requests                                       |
| Rate limit per IP (magic link send)   | 10 requests / 15 phút      | HTTP 429 Too Many Requests                                       |
| Rate limit per email (magic link send)| 5 requests / 15 phút       | HTTP 429 Too Many Requests                                       |
| Rate limit per IP (reset password)    | 10 requests / 15 phút      | HTTP 429 Too Many Requests                                       |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại          | Tiêu chí                                                                                        |
| ----- | ------------- | ----------------------------------------------------------------------------------------------- |
| NF-01 | Security      | OTP và token phải được hash (bcrypt) trước khi lưu Redis                                         |
| NF-02 | Security      | Không tiết lộ email có tồn tại hay không (chống enumeration)                                     |
| NF-03 | Security      | Reset token chỉ dùng 1 lần, bị xóa ngay sau khi sử dụng                                        |
| NF-04 | Security      | Tất cả session bị invalidate sau khi reset password thành công                                   |
| NF-05 | Security      | Rate limiting trên cả IP và email                                                                |
| NF-06 | Performance   | API response time < 2s (bao gồm thời gian gửi email async)                                      |
| NF-07 | Audit         | Ghi log vào login-history với method FORGOT_PASSWORD cho mỗi lần reset password thành công       |
| NF-08 | i18n          | Tất cả error message và UI text hỗ trợ đa ngôn ngữ (EN + VI)                                    |
| NF-09 | Accessibility | Form input hỗ trợ keyboard navigation, OTP input có aria-label                                   |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Validation rules được implement đầy đủ ở cả Client và Server
- [ ] Race conditions được xử lý đúng
- [ ] Rate limiting hoạt động đúng theo ngưỡng đã định
- [ ] i18n keys có cho cả EN và VI
- [ ] Không có bug severity Critical hoặc High còn open
