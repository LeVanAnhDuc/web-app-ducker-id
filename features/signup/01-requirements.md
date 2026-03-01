# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                    |
| ----------------- | --------------------------- |
| **Tên feature**   | Signup (Đăng ký tài khoản) |
| **Người yêu cầu** | Owner                       |
| **Ngày tạo**      | 01/03/2026                  |
| **Phiên bản**     | v1.0                        |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống quản lý căn hộ cần cho phép người dùng mới tạo tài khoản để sử dụng các dịch vụ. Hiện tại chưa có cơ chế đăng ký.

**Vấn đề:**
Người dùng mới không thể tự tạo tài khoản. Cần quy trình đăng ký an toàn với xác thực email để đảm bảo tài khoản hợp lệ và tránh spam.

---

## 1.3. Mục tiêu (Objectives)

- Cung cấp quy trình đăng ký 3 bước: nhập email → xác thực OTP → điền thông tin cá nhân
- Xác thực email thật qua OTP trước khi cho phép tạo tài khoản
- Thu thập thông tin cá nhân cơ bản (họ tên, giới tính, ngày sinh)
- Đảm bảo mật khẩu đủ mạnh (chữ hoa, chữ thường, số)
- Hỗ trợ đa ngôn ngữ (Tiếng Việt, Tiếng Anh)

---

## 1.4. Đối tượng người dùng (Target Users)

| Role          | Mô tả                                    | Nhu cầu chính                        |
| ------------- | ---------------------------------------- | ------------------------------------ |
| Người dùng mới | Cư dân muốn sử dụng hệ thống quản lý căn hộ | Tạo tài khoản nhanh, đơn giản       |

---

## 1.5. User Stories

| ID    | User Story                                                                                                              | Ghi chú                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| US-01 | Là một người dùng mới, tôi muốn nhập email để bắt đầu đăng ký và nhận mã OTP xác thực                                | Bước 1: Email + gửi OTP              |
| US-02 | Là một người dùng mới, tôi muốn nhập mã OTP đã nhận qua email để chứng minh email thuộc về tôi                        | Bước 2: Xác thực OTP                 |
| US-03 | Là một người dùng mới, tôi muốn điền thông tin cá nhân và tạo mật khẩu để hoàn tất đăng ký                            | Bước 3: Thông tin + mật khẩu         |
| US-04 | Là một người dùng mới, tôi muốn kiểm tra email đã được đăng ký chưa trước khi bắt đầu quy trình                      | Check email availability              |
| US-05 | Là một người dùng mới, tôi muốn gửi lại mã OTP nếu chưa nhận được                                                    | Resend OTP                            |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- Quy trình đăng ký 3 bước (email → OTP → thông tin cá nhân)
- Gửi OTP 6 chữ số qua email, hết hạn 5 phút
- Xác thực OTP với lockout sau 5 lần sai (15 phút)
- Session token sau khi verify OTP thành công (hết hạn 30 phút)
- Thu thập: họ tên, giới tính (nam/nữ/khác), ngày sinh
- Mật khẩu: 8-100 ký tự, chứa chữ hoa + chữ thường + số
- Kiểm tra email trùng lặp (check availability)
- Gửi lại OTP (tối đa 5 lần, cooldown 60 giây)
- Rate limiting trên IP và email
- Validation input (client Zod + server Joi)
- Đa ngôn ngữ (vi, en)
- Email template OTP (React Email)

### Ngoài phạm vi (Out of Scope)

- Đăng ký bằng mạng xã hội (Google, Facebook) — UI có sẵn nhưng chưa kết nối
- Upload ảnh đại diện
- Xác thực số điện thoại
- CAPTCHA / reCAPTCHA
- Chọn role khi đăng ký (mặc định role = user)
- Email chào mừng sau khi đăng ký thành công

### Cân nhắc cho tương lai (Future Considerations)

- Social signup (Google, Facebook)
- Upload avatar trong bước đăng ký
- Thêm trường số điện thoại
- Email chào mừng / onboarding flow

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Server: Node.js + Express + MongoDB + Redis
- Client: Next.js (App Router) + React Hook Form + Zod
- OTP được hash trước khi lưu vào Redis
- Session token: 64 hex chars, sinh từ crypto.randomBytes(32)
- Password hash: bcrypt, salt rounds 10
- Email phải unique trong collection `auths`
- Tài khoản mới tạo có `verifiedEmail: true` (đã verify qua OTP), `isActive: true`, `roles: user`

**Giả định:**

- Redis server luôn available
- Email service hoạt động ổn định để gửi OTP
- User có quyền truy cập email để nhận OTP
