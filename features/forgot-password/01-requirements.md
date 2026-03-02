# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                          |
| ----------------- | --------------------------------- |
| **Tên feature**   | Forgot Password (OTP & Magic Link) |
| **Người yêu cầu** | Developer                         |
| **Ngày tạo**      | 02/03/2026                        |
| **Phiên bản**     | v1.0                              |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống đã có đầy đủ các phương thức đăng nhập (password, OTP, magic link), đăng ký, và quản lý session. Tuy nhiên, chưa có chức năng khôi phục mật khẩu khi user quên password. Client đã có sẵn các trang UI (forgot-password, forgot-password/otp, forgot-password/magic-link, reset-password) nhưng chưa kết nối với backend API (các chỗ đều đang là TODO).

**Vấn đề:**
Khi user quên mật khẩu, không có cách nào để lấy lại quyền truy cập tài khoản ngoài việc liên hệ admin. Điều này gây trải nghiệm xấu và tăng workload cho admin.

---

## 1.3. Mục tiêu (Objectives)

- Cho phép user tự khôi phục mật khẩu thông qua OTP gửi về email đã đăng ký
- Cho phép user tự khôi phục mật khẩu thông qua magic link gửi về email đã đăng ký
- Đảm bảo bảo mật: chống brute-force OTP, chống email enumeration, token dùng 1 lần
- Sau khi đổi mật khẩu thành công, invalidate tất cả session hiện tại của user

---

## 1.4. Đối tượng người dùng (Target Users)

| Role     | Mô tả                                | Nhu cầu chính                              |
| -------- | ------------------------------------ | ----------------------------------------- |
| User     | Người dùng đã có tài khoản trong hệ thống | Lấy lại quyền truy cập khi quên mật khẩu   |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                  | Ghi chú |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-01 | Là một user, tôi muốn nhập email và nhận OTP để xác thực danh tính khi quên mật khẩu                                         | Flow OTP |
| US-02 | Là một user, tôi muốn nhập OTP đúng và được chuyển đến trang đặt lại mật khẩu mới                                           | Flow OTP |
| US-03 | Là một user, tôi muốn nhập email và nhận magic link để xác thực danh tính khi quên mật khẩu                                  | Flow Magic Link |
| US-04 | Là một user, tôi muốn click magic link trong email và được chuyển đến trang đặt lại mật khẩu mới                             | Flow Magic Link |
| US-05 | Là một user, tôi muốn đặt mật khẩu mới mà không cần nhớ mật khẩu cũ, sau khi đã xác thực OTP hoặc magic link thành công     | Chung |
| US-06 | Là một user, tôi muốn gửi lại OTP/magic link nếu chưa nhận được email                                                      | Resend |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- **Backend:** Tạo module forgot-password với 5 API endpoints (OTP send/verify, magic link send/verify, reset password)
- **Backend:** Redis repositories cho OTP, magic link, reset token (hash, cooldown, failed attempts, resend count)
- **Backend:** Email template mới cho forgot-password OTP
- **Backend:** Rate limiting cho các endpoint forgot-password
- **Backend:** Ghi log vào login-history với method FORGOT_PASSWORD
- **Backend:** Invalidate tất cả session sau khi reset password thành công
- **Backend:** Chống email enumeration (trả success giả khi email không tồn tại, vẫn validate format)
- **Client:** Kết nối các trang UI hiện có (forgot-password, otp, magic-link, reset-password) với backend API
- **Client:** Tạo dataSources/ForgotPassword cho API calls
- **i18n:** Translation keys cho cả backend (error messages) và frontend (đã có sẵn phần lớn)

### Ngoài phạm vi (Out of Scope)

- Forgot password qua SMS/điện thoại
- Security questions
- Admin reset password cho user
- Thay đổi email đã đăng ký
- Kiểm tra password mới phải khác password cũ
- Notification cho user khi password bị thay đổi (có thể làm phase sau)

### Cân nhắc cho tương lai (Future Considerations)

- Gửi email thông báo khi password bị thay đổi thành công (security notification)
- Forgot password qua SMS cho user có số điện thoại
- Rate limiting nâng cao theo device fingerprint

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Phải follow cùng pattern/architecture với các module login, signup hiện có (controller → service → repository)
- OTP và token phải được hash (bcrypt) trước khi lưu vào Redis
- Magic link redirect thẳng đến `/reset-password?email=...&token=...` (không qua trang verify riêng)
- Sử dụng cùng email service (Nodemailer + React Email templates) đã có
- Sử dụng Yarn làm package manager (cả client và server)

**Giả định:**

- User đã có tài khoản (email đã tồn tại trong collection authentication)
- Email service (Gmail SMTP) hoạt động ổn định
- Redis server luôn available cho OTP/token storage
- Client đã có sẵn UI components (OtpInputGroup, ResendButton, PasswordInput, AuthStepLayout...)
