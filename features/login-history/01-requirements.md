# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                              |
| ----------------- | ------------------------------------- |
| **Tên feature**   | Login History (Lịch sử đăng nhập)    |
| **Người yêu cầu** | Owner                                 |
| **Ngày tạo**      | 01/03/2026                            |
| **Phiên bản**     | v1.0                                  |

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

---

## 1.4. Đối tượng người dùng (Target Users)

| Role   | Mô tả                              | Nhu cầu chính                                |
| ------ | ---------------------------------- | -------------------------------------------- |
| System | Hệ thống nội bộ (các module khác) | Ghi lại login events một cách tự động        |
| Admin  | Quản trị viên                      | Xem lịch sử đăng nhập để giám sát bảo mật   |

---

## 1.5. User Stories

| ID    | User Story                                                                                                                               | Ghi chú                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| US-01 | Là hệ thống, tôi muốn tự động ghi lại mỗi lần đăng nhập thành công với đầy đủ metadata để phục vụ giám sát                            | Non-blocking, async                 |
| US-02 | Là hệ thống, tôi muốn tự động ghi lại mỗi lần đăng nhập thất bại kèm lý do để phát hiện tấn công brute force                         | Non-blocking, async                 |
| US-03 | Là hệ thống, tôi muốn tự động xóa login history cũ hơn 90 ngày để tiết kiệm dung lượng                                                | MongoDB TTL index                   |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- Ghi lại login thành công: userId, email, method, IP, device, OS, browser, geo, clientType
- Ghi lại login thất bại: email, method, failReason, IP, device, OS, browser, geo
- Parse User-Agent (UAParser) để xác định device type, OS, browser
- GeoIP lookup để xác định country, city
- Xác định client type từ custom header `x-client-type`
- Extract IP từ `x-forwarded-for` header hoặc `socket.remoteAddress`
- TTL 90 ngày (auto-delete qua MongoDB TTL index)
- Chuẩn bị fields `isAnomaly`, `anomalyReasons` cho tương lai

### Ngoài phạm vi (Out of Scope)

- API endpoint để query login history (chưa có controller)
- Anomaly detection logic (fields có sẵn nhưng chưa implement)
- Dashboard hiển thị login history
- Alert / notification khi phát hiện bất thường
- Export login history

### Cân nhắc cho tương lai (Future Considerations)

- API endpoint để user xem lịch sử đăng nhập của mình
- Admin dashboard với filter/search login history
- Anomaly detection (new device, new location, new IP)
- Real-time alert cho suspicious login

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Module này là service-only (không có controller/routes)
- Được gọi bởi các module khác: login, unlock-account
- Ghi log là non-blocking (không ảnh hưởng login response time)
- Lỗi ghi log không được ảnh hưởng đến luồng đăng nhập chính
- Sử dụng MongoDB collection `login_histories`

**Giả định:**

- GeoIP database (geoip-lite) cung cấp dữ liệu đủ chính xác
- UAParser parse đúng phần lớn User-Agent strings phổ biến
- Private/local IP sẽ trả về "Unknown" cho geo data
