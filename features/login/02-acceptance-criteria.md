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

### US-01: Đăng nhập bằng email và mật khẩu

| ID      | Loại     | Scenario                                                                                                                                                                                        | Trạng thái |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-01.1 | 🟢 Happy | **GIVEN** user có tài khoản active với email đã verify **WHEN** nhập đúng email và mật khẩu **THEN** nhận được access token, refresh token, id token và chuyển vào trang chính                | ⚪         |
| TC-01.2 | 🟡 Edge  | **GIVEN** user có tài khoản nhưng email chưa verify **WHEN** nhập đúng email và mật khẩu **THEN** hiển thị lỗi yêu cầu verify email trước                                                   | ⚪         |
| TC-01.3 | 🟡 Edge  | **GIVEN** user đã nhập sai mật khẩu 4 lần (hết free attempts) **WHEN** nhập sai lần thứ 5 **THEN** tài khoản bị lockout 30 giây, hiển thị thời gian chờ                                     | ⚪         |
| TC-01.4 | 🟡 Edge  | **GIVEN** user đang bị lockout **WHEN** nhập đúng mật khẩu **THEN** vẫn bị từ chối, hiển thị thời gian lockout còn lại                                                                      | ⚪         |
| TC-01.5 | 🟡 Edge  | **GIVEN** user nhập sai nhiều lần liên tục **WHEN** lockout hết hạn và nhập đúng mật khẩu **THEN** đăng nhập thành công, counter failed attempts được reset                                  | ⚪         |
| TC-01.6 | 🟡 Edge  | **GIVEN** tài khoản bị deactivate (isActive = false) **WHEN** nhập đúng email và mật khẩu **THEN** hiển thị lỗi tài khoản bị vô hiệu hóa                                                   | ⚪         |
| TC-01.7 | 🟡 Edge  | **GIVEN** user có flag mustChangePassword = true **WHEN** đăng nhập thành công **THEN** chuyển đến trang đổi mật khẩu bắt buộc                                                               | ⚪         |
| TC-01.8 | 🔴 Error | **GIVEN** email không tồn tại trong hệ thống **WHEN** nhập email và mật khẩu **THEN** hiển thị lỗi chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không)         | ⚪         |
| TC-01.9 | 🔴 Error | **GIVEN** server gặp lỗi kết nối DB **WHEN** user gửi request login **THEN** trả về lỗi 500 với message phù hợp                                                                             | ⚪         |
| TC-01.10 | 🔴 Error | **GIVEN** rate limit đã đạt ngưỡng (30 req/15 phút/IP) **WHEN** user gửi thêm request **THEN** trả về lỗi 429 Too Many Requests                                                            | ⚪         |

### US-02: Đăng nhập bằng OTP

| ID      | Loại     | Scenario                                                                                                                                                                                    | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-02.1 | 🟢 Happy | **GIVEN** user có tài khoản active **WHEN** yêu cầu gửi OTP → nhập đúng 6 chữ số trong vòng 5 phút **THEN** đăng nhập thành công, nhận tokens                                           | ⚪         |
| TC-02.2 | 🟡 Edge  | **GIVEN** OTP đã gửi chưa đến 60 giây **WHEN** user yêu cầu gửi lại OTP **THEN** bị từ chối do cooldown, hiển thị thời gian chờ còn lại                                                 | ⚪         |
| TC-02.3 | 🟡 Edge  | **GIVEN** OTP đã gửi quá 5 phút **WHEN** user nhập OTP **THEN** hiển thị lỗi OTP hết hạn, cần gửi lại                                                                                   | ⚪         |
| TC-02.4 | 🟡 Edge  | **GIVEN** user đã nhập sai OTP 5 lần **WHEN** nhập lại **THEN** bị lockout 15 phút, OTP hiện tại bị vô hiệu                                                                             | ⚪         |
| TC-02.5 | 🟡 Edge  | **GIVEN** user đã gửi lại OTP 3 lần (đạt max resend) **WHEN** yêu cầu gửi lại **THEN** bị từ chối, hiển thị đã đạt giới hạn gửi lại                                                    | ⚪         |
| TC-02.6 | 🔴 Error | **GIVEN** Redis không khả dụng **WHEN** user yêu cầu gửi OTP **THEN** trả về lỗi 500, không gửi email                                                                                   | ⚪         |
| TC-02.7 | 🔴 Error | **GIVEN** email service bị lỗi **WHEN** user yêu cầu gửi OTP **THEN** trả về lỗi gửi email thất bại                                                                                     | ⚪         |
| TC-02.8 | 🔴 Error | **GIVEN** rate limit OTP send đạt ngưỡng (10/IP hoặc 5/email per 15 phút) **WHEN** gửi thêm request **THEN** trả về lỗi 429                                                             | ⚪         |

### US-03: Đăng nhập bằng magic link

| ID      | Loại     | Scenario                                                                                                                                                                                          | Trạng thái |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-03.1 | 🟢 Happy | **GIVEN** user có tài khoản active **WHEN** yêu cầu gửi magic link → click link trong email trong vòng 15 phút **THEN** đăng nhập thành công, nhận tokens                                      | ⚪         |
| TC-03.2 | 🟡 Edge  | **GIVEN** magic link đã gửi chưa đến 60 giây **WHEN** yêu cầu gửi lại **THEN** bị từ chối do cooldown                                                                                         | ⚪         |
| TC-03.3 | 🟡 Edge  | **GIVEN** magic link đã gửi quá 15 phút **WHEN** user click link **THEN** hiển thị lỗi link hết hạn                                                                                            | ⚪         |
| TC-03.4 | 🟡 Edge  | **GIVEN** user đã gửi lại magic link 3 lần (đạt max resend) **WHEN** yêu cầu gửi lại **THEN** bị từ chối                                                                                      | ⚪         |
| TC-03.5 | 🟡 Edge  | **GIVEN** magic link đã được sử dụng 1 lần **WHEN** click lại lần 2 **THEN** hiển thị lỗi link đã được sử dụng                                                                                | ⚪         |
| TC-03.6 | 🔴 Error | **GIVEN** token trong URL bị sửa đổi/giả mạo **WHEN** verify magic link **THEN** trả về lỗi token không hợp lệ                                                                                | ⚪         |
| TC-03.7 | 🔴 Error | **GIVEN** rate limit magic link send đạt ngưỡng **WHEN** gửi thêm request **THEN** trả về lỗi 429                                                                                              | ⚪         |

### US-04: Chuyển đổi giữa các phương thức đăng nhập

| ID      | Loại     | Scenario                                                                                                                                                                    | Trạng thái |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-04.1 | 🟢 Happy | **GIVEN** user đang ở trang nhập mật khẩu **WHEN** click "Thử phương thức khác" **THEN** chuyển đến trang alternative methods với các lựa chọn: OTP, magic link            | ⚪         |
| TC-04.2 | 🟢 Happy | **GIVEN** user đang ở trang alternative methods **WHEN** chọn "Đăng nhập bằng OTP" **THEN** chuyển đến trang OTP, email được giữ nguyên                                   | ⚪         |
| TC-04.3 | 🟡 Edge  | **GIVEN** user nhập email ở bước 1 rồi quay lại **WHEN** quay lại trang email **THEN** email đã nhập trước đó vẫn được giữ                                                | ⚪         |

### US-05: Ghi lại lịch sử đăng nhập

| ID      | Loại     | Scenario                                                                                                                                                                                                    | Trạng thái |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TC-05.1 | 🟢 Happy | **GIVEN** user đăng nhập thành công (bất kỳ phương thức nào) **WHEN** hoàn tất login **THEN** hệ thống ghi lại: userId, email, method, status=success, IP, device, OS, browser, geolocation, timestamp    | ⚪         |
| TC-05.2 | 🟢 Happy | **GIVEN** user đăng nhập thất bại **WHEN** nhập sai mật khẩu/OTP **THEN** hệ thống ghi lại: email, method, status=failed, failureReason, IP, device info                                                 | ⚪         |
| TC-05.3 | 🟡 Edge  | **GIVEN** login history record đã tồn tại hơn 90 ngày **WHEN** TTL hết hạn **THEN** MongoDB tự động xóa record                                                                                           | ⚪         |
| TC-05.4 | 🔴 Error | **GIVEN** ghi login history gặp lỗi DB **WHEN** user đăng nhập **THEN** đăng nhập vẫn thành công (login history là non-blocking), lỗi được log                                                           | ⚪         |

---

## 2.3. Validation Rules

| Field    | Rule                                                   | Error Message                          | Validate tại    |
| -------- | ------------------------------------------------------ | -------------------------------------- | --------------- |
| email    | Required, format email hợp lệ (REGEX_EMAIL)           | "Email không hợp lệ"                  | Client + Server |
| password | Required, 8-100 ký tự                                 | "Mật khẩu phải từ 8-100 ký tự"        | Client + Server |
| otp      | Required, đúng 6 chữ số                               | "OTP phải gồm 6 chữ số"              | Client + Server |
| token    | Required, hex string 128 ký tự (magic link)            | "Token không hợp lệ"                  | Server          |

---

## 2.4. Concurrent & Race Conditions

| Tình huống                                        | Rủi ro                                 | Hành vi mong đợi                                                  |
| ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| User gửi nhiều request OTP cùng lúc              | Gửi nhiều email, tốn resource          | Cooldown 60s ngăn gửi liên tiếp, chỉ OTP cuối cùng hợp lệ       |
| User click magic link 2 lần rất nhanh            | Token verify 2 lần                     | Lần đầu thành công, lần sau lỗi "đã sử dụng" (Redis delete atomic) |
| 2 tab khác nhau gửi login request cùng lúc       | Failed attempts counter bị race        | Redis atomic increment đảm bảo đếm chính xác                     |

---

## 2.5. Giới hạn & Ngưỡng (Limits & Thresholds)

| Mục                                   | Giới hạn                    | Hành vi khi vượt ngưỡng                                  |
| ------------------------------------- | --------------------------- | --------------------------------------------------------- |
| Rate limit password login             | 30 req/IP/15 phút          | HTTP 429 Too Many Requests                                |
| Rate limit OTP send                   | 10/IP + 5/email per 15 phút | HTTP 429 Too Many Requests                               |
| Rate limit magic link send            | 10/IP + 5/email per 15 phút | HTTP 429 Too Many Requests                               |
| Failed password attempts (free)       | 4 lần                       | Bắt đầu lockout từ lần thứ 5                             |
| Progressive lockout duration          | 30s → 60s → 2m → 4m → 8m → 30m | Tăng dần, tối đa 30 phút                             |
| Failed OTP attempts                   | 5 lần                       | Lockout 15 phút                                          |
| OTP resend                            | 3 lần                       | Không cho gửi thêm                                       |
| Magic link resend                     | 3 lần                       | Không cho gửi thêm                                       |
| OTP cooldown                          | 60 giây                     | Phải chờ hết cooldown mới gửi lại được                   |
| Magic link cooldown                   | 60 giây                     | Phải chờ hết cooldown mới gửi lại được                   |
| Login history retention               | 90 ngày                     | Tự động xóa qua MongoDB TTL index                        |

---

## 2.6. Tiêu chí phi chức năng (Non-functional Criteria)

| NF-ID | Loại          | Tiêu chí                                                                          |
| ----- | ------------- | --------------------------------------------------------------------------------- |
| NF-01 | Performance   | API login response < 500ms trong điều kiện bình thường                            |
| NF-02 | Security      | Mật khẩu được hash bằng bcrypt (salt rounds: 10), không bao giờ lưu plaintext    |
| NF-03 | Security      | OTP và magic link token được hash trước khi lưu vào Redis                         |
| NF-04 | Security      | Thông báo lỗi không tiết lộ email có tồn tại trong hệ thống hay không            |
| NF-05 | Security      | JWT sử dụng 3 secret riêng biệt cho access, refresh, id token                    |
| NF-06 | Accessibility | Tất cả form navigable bằng keyboard, label đúng cho screen reader                |
| NF-07 | i18n          | Hỗ trợ Tiếng Việt và Tiếng Anh đầy đủ                                            |
| NF-08 | Compatibility | Hoạt động trên Chrome, Safari, Firefox, Edge phiên bản mới nhất                  |

---

## 2.7. Definition of Done (DoD)

- [ ] Tất cả 🟢 Happy Path scenario: ✅ Pass
- [ ] Tất cả 🟡 Edge Case scenario: ✅ Pass
- [ ] Tất cả 🔴 Error Case scenario: ✅ Pass
- [ ] Tất cả Non-functional Criteria đạt yêu cầu
- [ ] Unit test coverage >= 80%
- [ ] Không có bug severity Critical hoặc High còn open
