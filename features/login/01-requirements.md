# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                    |
| ----------------- | --------------------------- |
| **Tên feature**   | Login (Đăng nhập)          |
| **Người yêu cầu** | Owner                       |
| **Ngày tạo**      | 01/03/2026                  |
| **Phiên bản**     | v1.0                        |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống quản lý căn hộ cần xác thực người dùng trước khi cho phép truy cập các chức năng quản lý. Hiện tại chưa có cơ chế đăng nhập.

**Vấn đề:**
Người dùng không thể truy cập hệ thống một cách an toàn. Cần cung cấp nhiều phương thức đăng nhập để phù hợp với các tình huống khác nhau (quên mật khẩu, không muốn nhập mật khẩu, thiết bị không tin cậy...).

---

## 1.3. Mục tiêu (Objectives)

- Cung cấp 3 phương thức đăng nhập: mật khẩu, OTP qua email, và magic link
- Bảo vệ tài khoản khỏi brute force bằng progressive lockout và rate limiting
- Ghi lại lịch sử đăng nhập (thiết bị, IP, vị trí) phục vụ giám sát bảo mật
- Hỗ trợ đa ngôn ngữ (Tiếng Việt, Tiếng Anh)

---

## 1.4. Đối tượng người dùng (Target Users)

| Role       | Mô tả                                      | Nhu cầu chính                              |
| ---------- | ------------------------------------------ | ------------------------------------------ |
| User       | Cư dân sử dụng hệ thống quản lý căn hộ   | Đăng nhập nhanh, an toàn                   |
| Admin      | Quản trị viên hệ thống                     | Đăng nhập với quyền quản trị               |

---

## 1.5. User Stories

| ID    | User Story                                                                                                        | Ghi chú                        |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| US-01 | Là một user, tôi muốn đăng nhập bằng email và mật khẩu để truy cập hệ thống                                    | Phương thức chính               |
| US-02 | Là một user, tôi muốn đăng nhập bằng OTP gửi qua email để truy cập khi không nhớ mật khẩu                      | OTP 6 chữ số                   |
| US-03 | Là một user, tôi muốn đăng nhập bằng magic link gửi qua email để truy cập nhanh chỉ với 1 click                | Link gửi qua email             |
| US-04 | Là một user, tôi muốn chuyển đổi giữa các phương thức đăng nhập để chọn cách phù hợp nhất                      | Trang alternative methods      |
| US-05 | Là hệ thống, tôi muốn ghi lại lịch sử đăng nhập để phục vụ giám sát và phát hiện bất thường                    | Tự động, không cần user thao tác |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- Đăng nhập bằng email + mật khẩu
- Đăng nhập bằng OTP (gửi qua email, 6 chữ số, hết hạn 5 phút)
- Đăng nhập bằng magic link (gửi qua email, hết hạn 15 phút)
- Progressive lockout khi nhập sai mật khẩu nhiều lần
- Rate limiting trên IP và email
- JWT token (access token, refresh token, id token)
- Ghi lịch sử đăng nhập (IP, device, OS, browser, geolocation)
- Validation input (client + server)
- Đa ngôn ngữ (vi, en)
- Trang chọn phương thức đăng nhập thay thế

### Ngoài phạm vi (Out of Scope)

- Đăng nhập bằng mạng xã hội (Google, Facebook) — UI có sẵn nhưng chưa kết nối API
- Đăng ký tài khoản mới
- Quên mật khẩu / đổi mật khẩu
- Two-factor authentication (2FA)
- Remember me / keep logged in
- Phát hiện bất thường đăng nhập (anomaly detection) — model đã có field nhưng chưa implement logic

### Cân nhắc cho tương lai (Future Considerations)

- Social login (Google, Facebook)
- Anomaly detection dựa trên login history
- Biometric authentication cho mobile
- Device trust management

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Server sử dụng Node.js + Express + MongoDB + Redis
- Client sử dụng Next.js (App Router) + React Hook Form + Zod
- JWT token: access (8h), refresh (7 ngày), id (8h)
- Redis bắt buộc cho OTP, magic link, rate limiting, lockout
- Email đã được verify mới cho phép đăng nhập

**Giả định:**

- Redis server luôn available
- Email service (gửi OTP, magic link) hoạt động ổn định
- User đã có tài khoản được tạo sẵn (qua module đăng ký riêng)
