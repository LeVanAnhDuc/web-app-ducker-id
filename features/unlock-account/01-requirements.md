# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                                     |
| ----------------- | -------------------------------------------- |
| **Tên feature**   | Unlock Account (Mở khóa tài khoản)          |
| **Người yêu cầu** | Owner                                         |
| **Ngày tạo**      | 01/03/2026                                    |
| **Phiên bản**     | v1.0                                          |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống có cơ chế progressive lockout khi nhập sai mật khẩu nhiều lần. Sau khi bị lock, user phải chờ hết thời gian lockout (tối đa 30 phút) mới đăng nhập lại được.

**Vấn đề:**
User bị lock tài khoản và quên mật khẩu sẽ không thể truy cập hệ thống. Cần cơ chế mở khóa bằng mật khẩu tạm thời gửi qua email để user khôi phục quyền truy cập ngay lập tức.

---

## 1.3. Mục tiêu (Objectives)

- Cho phép user yêu cầu mở khóa tài khoản bị lock qua email
- Gửi mật khẩu tạm thời (16 ký tự, an toàn) qua email
- Mật khẩu tạm thời chỉ dùng 1 lần, hết hạn sau 15 phút
- Reset failed attempts counter sau khi mở khóa thành công
- Ghi login history cho event mở khóa

---

## 1.4. Đối tượng người dùng (Target Users)

| Role | Mô tả                                         | Nhu cầu chính                               |
| ---- | ---------------------------------------------- | -------------------------------------------- |
| User | Người dùng bị khóa tài khoản do nhập sai nhiều lần | Khôi phục quyền truy cập nhanh chóng     |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                                         | Ghi chú                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| US-01 | Là một user bị lock tài khoản, tôi muốn yêu cầu gửi mật khẩu tạm thời qua email để mở khóa tài khoản                                          | Bước 1: Request unlock                   |
| US-02 | Là một user đã nhận mật khẩu tạm thời, tôi muốn dùng nó để đăng nhập và mở khóa tài khoản                                                      | Bước 2: Verify temp password              |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- Endpoint request unlock: kiểm tra tài khoản bị lock → gửi email mật khẩu tạm thời
- Endpoint verify unlock: xác thực mật khẩu tạm thời → mở khóa → trả tokens
- Mật khẩu tạm thời: 16 ký tự (chữ hoa + thường + số + đặc biệt), hash bằng bcrypt
- Expiry: 15 phút, single-use (đánh dấu `tempPasswordUsed` sau khi dùng)
- Cooldown 60 giây giữa các request
- Rate limit: max 3 requests/email/giờ
- Reset failed attempts counter sau khi unlock thành công
- Ghi login history (method: password, status: success)
- Không tiết lộ email có tồn tại hay không (trả success cho mọi email)

### Ngoài phạm vi (Out of Scope)

- Admin unlock cho user (từ admin panel)
- Unlock bằng OTP hoặc magic link
- Buộc đổi mật khẩu sau khi unlock (flag `mustChangePassword` chưa được enforce ở client)
- Client-side UI cho unlock flow

### Cân nhắc cho tương lai (Future Considerations)

- Client-side UI pages cho unlock flow
- Buộc đổi mật khẩu sau unlock
- Admin unlock tool
- Notification cho admin khi có unlock request bất thường

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Chỉ hoạt động với tài khoản đang bị lock (kiểm tra qua FailedAttemptsRepository)
- Tài khoản phải active (isActive = true)
- Mật khẩu tạm thời lưu trong MongoDB (field `tempPasswordHash`, `tempPasswordExpAt`, `tempPasswordUsed`)
- Cooldown và rate limit lưu trong Redis
- Verify endpoint chịu rate limit của login (loginByIp)

**Giả định:**

- Email service hoạt động ổn định
- User có quyền truy cập email để nhận mật khẩu tạm thời
- Client sẽ redirect user đến trang đổi mật khẩu sau khi unlock (trong tương lai)
