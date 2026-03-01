# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung             |
| ----------------- | -------------------- |
| **Tên feature**   | Logout (Đăng xuất)  |
| **Người yêu cầu** | Owner                |
| **Ngày tạo**      | 01/03/2026           |
| **Phiên bản**     | v1.0                 |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống cho phép đăng nhập và cấp JWT tokens (access, refresh, id) nhưng chưa có cơ chế đăng xuất.

**Vấn đề:**
User không thể kết thúc phiên đăng nhập một cách an toàn. Refresh token vẫn còn trong cookie và có thể bị lợi dụng nếu thiết bị bị truy cập trái phép.

---

## 1.3. Mục tiêu (Objectives)

- Cho phép user đăng xuất bằng cách xóa refresh token cookie
- Đảm bảo endpoint logout yêu cầu authentication (chỉ user đã đăng nhập mới logout được)

---

## 1.4. Đối tượng người dùng (Target Users)

| Role | Mô tả                                | Nhu cầu chính                     |
| ---- | ------------------------------------ | --------------------------------- |
| User | Người dùng đã đăng nhập vào hệ thống | Kết thúc phiên làm việc an toàn  |

---

## 1.5. User Stories

| ID    | User Story                                                                                         | Ghi chú                                    |
| ----- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| US-01 | Là một user đã đăng nhập, tôi muốn đăng xuất để kết thúc phiên làm việc an toàn                  | Xóa refresh token cookie trên server        |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- Endpoint `POST /auth/logout` yêu cầu Bearer token
- Xóa refresh token HTTP-only cookie
- Trả về response success

### Ngoài phạm vi (Out of Scope)

- Token blacklist (revoke access token đang còn hiệu lực)
- Logout tất cả thiết bị (logout all sessions)
- Client-side token cleanup (do client tự xử lý)
- Ghi login history cho event logout

### Cân nhắc cho tương lai (Future Considerations)

- Token blacklist / revocation list (Redis)
- Logout all devices
- Force logout từ admin panel

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Yêu cầu valid access token (Bearer auth) để gọi logout
- Refresh token được lưu trong HTTP-only cookie tên `refreshToken`
- Cookie options: httpOnly=true, secure=true (production), sameSite=lax, path=/

**Giả định:**

- Client sẽ tự xóa access token và id token khỏi memory sau khi nhận response logout thành công
- Access token hiện tại vẫn valid cho đến khi hết hạn (không revoke)
