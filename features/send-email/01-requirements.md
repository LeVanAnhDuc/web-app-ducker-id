# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                          |
| ----------------- | --------------------------------- |
| **Tên feature**   | Send Email (Gửi email hệ thống) |
| **Người yêu cầu** | Owner                             |
| **Ngày tạo**      | 01/03/2026                        |
| **Phiên bản**     | v1.0                              |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Nhiều module trong hệ thống cần gửi email (login OTP, signup OTP, magic link, mở khóa tài khoản) nhưng chưa có service gửi email tập trung.

**Vấn đề:**
Mỗi module tự implement logic gửi email sẽ dẫn đến duplicate code, khó maintain, và không nhất quán về template/style. Cần một service chung xử lý gửi email cho toàn bộ hệ thống.

---

## 1.3. Mục tiêu (Objectives)

- Cung cấp service gửi email tập trung cho toàn bộ hệ thống
- Hỗ trợ 4 loại email: Login OTP, Signup OTP, Magic Link, Unlock Temp Password
- Email template đẹp, responsive, sử dụng React Email
- Hỗ trợ đa ngôn ngữ (vi, en) cho cả subject và body
- Gửi email async, non-blocking (fire-and-forget)

---

## 1.4. Đối tượng người dùng (Target Users)

| Role   | Mô tả                              | Nhu cầu chính                           |
| ------ | ---------------------------------- | --------------------------------------- |
| System | Các module nội bộ (login, signup…) | Gửi email xác thực một cách đơn giản   |
| User   | Người nhận email                   | Nhận email đẹp, rõ ràng, đúng ngôn ngữ |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                    | Ghi chú               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| US-01 | Là hệ thống, tôi muốn gửi email OTP cho login với template đẹp và nội dung đa ngôn ngữ                                     | Template: LoginOtpEmail |
| US-02 | Là hệ thống, tôi muốn gửi email OTP cho signup với template đẹp và nội dung đa ngôn ngữ                                    | Template: SignupOtpEmail |
| US-03 | Là hệ thống, tôi muốn gửi email magic link với nút CTA cho login không cần mật khẩu                                        | Template: MagicLinkEmail |
| US-04 | Là hệ thống, tôi muốn gửi email chứa mật khẩu tạm thời để mở khóa tài khoản                                               | Template: UnlockTempPasswordEmail |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- SendEmailService với method `send<T>(type, options)` — generic, type-safe
- 4 email types: LOGIN_OTP, SIGNUP_OTP, MAGIC_LINK, UNLOCK_TEMP_PASSWORD
- React Email templates với shared components (EmailLayout, OtpBlock, InfoBox, CtaButton)
- i18n: subject và body đa ngôn ngữ (vi, en)
- Nodemailer transport qua Gmail SMTP
- Connection pooling (max 5 connections) và rate limiting (5 emails/giây)
- Singleton pattern cho transport instance
- Async, non-blocking gửi email (fire-and-forget)

### Ngoài phạm vi (Out of Scope)

- Email queue / retry mechanism
- Email delivery tracking (open rate, click rate)
- Attachment support
- Multiple SMTP providers / failover
- Email template editor (admin UI)
- Unsubscribe mechanism

### Cân nhắc cho tương lai (Future Considerations)

- Email queue (Bull/BullMQ) cho reliability
- Multiple SMTP providers (SendGrid, AWS SES) với failover
- Email delivery webhooks
- Template preview trong admin panel

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Module này là service-only (không có controller/routes)
- Sử dụng Gmail SMTP (cần USERNAME_EMAIL và PASSWORD_EMAIL trong env)
- React Email để render template thành HTML
- Nodemailer cho transport layer
- Connection pool: max 5 connections, max 100 messages/connection
- Rate limit: 5 emails/giây

**Giả định:**

- Gmail App Password đã được cấu hình đúng
- Gmail sending limit đủ cho lượng email hệ thống
- React Email render ổn định cho tất cả email clients
