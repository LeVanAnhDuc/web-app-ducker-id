# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                        |
| ----------------- | ------------------------------- |
| **Tên feature**   | Token Refresh (Làm mới token)  |
| **Người yêu cầu** | Owner                           |
| **Ngày tạo**      | 01/03/2026                      |
| **Phiên bản**     | v1.0                            |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống cấp access token có thời hạn ngắn (8 giờ) khi đăng nhập. Khi token hết hạn, user phải đăng nhập lại.

**Vấn đề:**
User bị gián đoạn khi access token hết hạn giữa phiên làm việc. Cần cơ chế làm mới token tự động mà không yêu cầu đăng nhập lại.

---

## 1.3. Mục tiêu (Objectives)

- Cho phép làm mới access token bằng refresh token mà không cần đăng nhập lại
- Refresh token được lưu trong HTTP-only cookie (bảo mật, client không truy cập được)
- Trả về cả access token và id token mới

---

## 1.4. Đối tượng người dùng (Target Users)

| Role   | Mô tả                         | Nhu cầu chính                                   |
| ------ | ------------------------------ | ------------------------------------------------ |
| Client | Client-side app (axios interceptor) | Tự động refresh token khi access token hết hạn |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                         | Ghi chú                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| US-01 | Là client app, tôi muốn dùng refresh token để lấy access token mới khi token cũ hết hạn, để user không bị gián đoạn phiên làm việc | Refresh token trong HTTP-only cookie    |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- Endpoint `POST /auth/token/refresh`
- Đọc refresh token từ HTTP-only cookie
- Verify refresh token (JWT signature + expiry)
- Generate access token mới + id token mới
- Trả về tokens trong response body

### Ngoài phạm vi (Out of Scope)

- Refresh token rotation (tạo refresh token mới mỗi lần refresh)
- Token revocation / blacklist
- Rate limiting cho refresh endpoint
- Refresh token trong request body (chỉ hỗ trợ cookie)

### Cân nhắc cho tương lai (Future Considerations)

- Refresh token rotation cho security tốt hơn
- Token family tracking (detect token reuse attack)
- Rate limiting cho refresh endpoint

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Refresh token phải nằm trong HTTP-only cookie tên `refreshToken`
- JWT secrets riêng biệt cho từng loại token (access, refresh, id)
- Token expiry: access = 8h, refresh = 7d, id = 8h

**Giả định:**

- Client đã implement interceptor để tự động gọi refresh khi nhận 401
- Refresh token cookie được set đúng bởi login endpoint
