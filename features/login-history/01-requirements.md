# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                              |
| ----------------- | ------------------------------------- |
| **Tên feature**   | Login History (Lịch sử đăng nhập)    |
| **Người yêu cầu** | Owner                                 |
| **Ngày tạo**      | 01/03/2026                            |
| **Phiên bản**     | v2.0                                  |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống có nhiều phương thức đăng nhập (password, OTP, magic link) nhưng chưa có cơ chế ghi lại lịch sử đăng nhập để giám sát bảo mật.

**Vấn đề:**
Không thể theo dõi ai đăng nhập, từ đâu, bằng thiết bị gì, và có bao nhiêu lần thất bại. Điều này gây khó khăn cho việc phát hiện truy cập bất thường và hỗ trợ người dùng khi có sự cố bảo mật.

---

## 1.3. Mục tiêu (Objectives)

- Ghi lại mọi lần đăng nhập (thành công và thất bại) với đầy đủ metadata
- Thu thập thông tin thiết bị (device type, OS, browser) từ User-Agent
- Xác định vị trí địa lý (country, city) từ IP address
- Phân loại client type (web, iOS, Android)
- Tự động xóa dữ liệu cũ sau 90 ngày (TTL)
- Chuẩn bị sẵn cấu trúc dữ liệu cho anomaly detection trong tương lai
- Cung cấp API để user xem lịch sử đăng nhập của chính mình (phân trang, filter, sort)
- Cung cấp API để admin xem toàn bộ lịch sử đăng nhập (phân trang, filter theo user + tất cả metadata, sort)
- Che giấu thông tin nhạy cảm (IP partial masking) trong response trả về user

---

## 1.4. Đối tượng người dùng (Target Users)

| Role   | Mô tả                              | Nhu cầu chính                                                        |
| ------ | ---------------------------------- | -------------------------------------------------------------------- |
| System | Hệ thống nội bộ (các module khác) | Ghi lại login events một cách tự động                                |
| User   | Người dùng đã đăng nhập            | Xem lịch sử đăng nhập của chính mình để phát hiện truy cập bất thường |
| Admin  | Quản trị viên                      | Xem và giám sát toàn bộ lịch sử đăng nhập của tất cả user           |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                               | Ghi chú                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| US-01 | Là hệ thống, tôi muốn tự động ghi lại mỗi lần đăng nhập thành công với đầy đủ metadata để phục vụ giám sát                            | Non-blocking, async                 |
| US-02 | Là hệ thống, tôi muốn tự động ghi lại mỗi lần đăng nhập thất bại kèm lý do để phát hiện tấn công brute force                         | Non-blocking, async                 |
| US-03 | Là hệ thống, tôi muốn tự động xóa login history cũ hơn 90 ngày để tiết kiệm dung lượng                                                | MongoDB TTL index                   |
| US-04 | Là một User, tôi muốn xem danh sách lịch sử đăng nhập của chính mình (phân trang, filter, sort) để kiểm tra xem có truy cập bất thường không | Sensitive fields bị mask          |
| US-05 | Là một Admin, tôi muốn xem toàn bộ lịch sử đăng nhập của tất cả user (phân trang, filter theo userId + metadata, sort) để giám sát bảo mật | Full access, không bị mask IP     |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

**Ghi lại (v1.0 — đã implement):**
- Ghi lại login thành công: userId, email, method, IP, device, OS, browser, geo, clientType
- Ghi lại login thất bại: email, method, failReason, IP, device, OS, browser, geo
- Parse User-Agent (UAParser) để xác định device type, OS, browser
- GeoIP lookup để xác định country, city
- Xác định client type từ custom header `x-client-type`
- Extract IP từ `x-forwarded-for` header hoặc `socket.remoteAddress`
- TTL 90 ngày (auto-delete qua MongoDB TTL index)
- Chuẩn bị fields `isAnomaly`, `anomalyReasons` cho tương lai

**Query API (v2.0 — scope mới):**
- `GET /auth/login-history` — User xem lịch sử đăng nhập của chính mình
- `GET /admin/login-history` — Admin xem toàn bộ lịch sử (có thể filter theo userId)
- Pagination: offset-based (`page`, `limit`)
- Filter: `status`, `method`, `deviceType`, `clientType`, `country`, `city`, `os`, `browser`, `ip`, `createdAt` (from/to)
- Sort: theo các field `createdAt`, `method`, `status`, `country`, `ip` (asc/desc)
- Sensitive data masking trong response User API: IP chỉ hiện 2 octet đầu (`x.x.*.*`)

### Ngoài phạm vi (Out of Scope)

- Anomaly detection logic (fields có sẵn nhưng chưa implement)
- Dashboard hiển thị login history
- Alert / notification khi phát hiện bất thường
- Export login history (CSV/Excel)
- Xóa login history record (từng record hoặc toàn bộ)

### Cân nhắc cho tương lai (Future Considerations)

- Export login history (CSV/Excel)
- Anomaly detection (new device, new location, new IP)
- Real-time alert cho suspicious login
- Admin dashboard với chart/visualization

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Phần ghi lại (v1.0): service-only, non-blocking, không có controller
- Phần query API (v2.0): cần thêm controller, routes, middleware auth
- User chỉ được xem history của chính mình (authZ theo userId từ token)
- Admin API yêu cầu role admin
- IP và các thông tin nhạy cảm phải được mask trong User API response
- Client duy nhất là web (Next.js) — không cần hỗ trợ mobile app riêng
- Sử dụng MongoDB collection `login_histories`

**Giả định:**

- GeoIP database (geoip-lite) cung cấp dữ liệu đủ chính xác
- UAParser parse đúng phần lớn User-Agent strings phổ biến
- Private/local IP sẽ trả về "Unknown" cho geo data
- User đã được xác thực (có valid idToken) mới được gọi User API
