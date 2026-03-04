# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                  |
| ----------------- | ------------------------- |
| **Tên feature**   | User Profile              |
| **Người yêu cầu** | Developer                 |
| **Ngày tạo**      | 04/03/2026                |
| **Phiên bản**     | v1.0                      |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

**Tình trạng hiện tại:**
Hệ thống đã có collection `users` với các field cơ bản (fullName, phone, avatar, address, dateOfBirth, gender) được tạo khi signup, nhưng chưa có API hay giao diện để user xem hoặc chỉnh sửa thông tin cá nhân sau khi đăng ký.

**Vấn đề:**
- User không thể cập nhật thông tin cá nhân sau khi đăng ký (họ tên thay đổi, số điện thoại mới, v.v.)
- User không thể upload hoặc thay đổi avatar
- Không có trang profile để xem thông tin của bản thân hoặc người khác

---

## 1.3. Mục tiêu (Objectives)

- Cho phép user xem đầy đủ thông tin profile của chính mình (sau khi đăng nhập)
- Cho phép user cập nhật các thông tin cơ bản: fullName, phone, address, dateOfBirth, gender
- Cho phép user upload avatar (lưu local disk)
- Cho phép bất kỳ ai (guest hoặc user đã đăng nhập) xem profile công khai của người dùng khác (fullName, avatar, gender)

---

## 1.4. Đối tượng người dùng (Target Users)

| Role            | Mô tả                                    | Nhu cầu chính                                          |
| --------------- | ---------------------------------------- | ------------------------------------------------------ |
| Authenticated User | User đã đăng nhập vào hệ thống        | Xem full profile của mình, cập nhật thông tin, upload avatar |
| Guest / Anyone  | Người dùng chưa đăng nhập hoặc user khác | Xem profile công khai của người dùng (fullName, avatar, gender) |

---

## 1.5. User Stories

| ID    | User Story                                                                                                     | Ghi chú                                      |
| ----- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| US-01 | Là một **authenticated user**, tôi muốn **xem đầy đủ thông tin profile của mình** để kiểm tra dữ liệu hiện tại | Route: `/profile`                            |
| US-02 | Là một **authenticated user**, tôi muốn **cập nhật thông tin cá nhân** (fullName, phone, address, dateOfBirth, gender) để giữ thông tin luôn chính xác | Route: `/profile` (edit mode)         |
| US-03 | Là một **authenticated user**, tôi muốn **upload ảnh đại diện (avatar)** để cá nhân hóa tài khoản             | Upload riêng, lưu local disk                 |
| US-04 | Là một **guest hoặc bất kỳ user nào**, tôi muốn **xem profile công khai của người dùng khác** để biết thông tin cơ bản của họ | Route: `/profile/:id`, chỉ hiện fullName, avatar, gender |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- API `GET /api/v1/users/me` — lấy full profile của user đang đăng nhập (authenticated)
- API `PATCH /api/v1/users/me` — cập nhật thông tin cá nhân (authenticated): fullName, phone, address, dateOfBirth, gender
- API `POST /api/v1/users/me/avatar` — upload avatar (authenticated, multipart/form-data)
- API `GET /api/v1/users/:id` — lấy public profile của user theo ID (public, không cần auth)
- Client: trang `/profile` — xem và chỉnh sửa profile của bản thân
- Client: trang `/profile/:id` — xem profile công khai của người khác (read-only)
- Toast thông báo thành công/thất bại sau khi update hoặc upload avatar

### Ngoài phạm vi (Out of Scope)

- Thay đổi email
- Thay đổi password (đã có forgot-password flow)
- Xóa tài khoản
- Xem lịch sử đăng nhập trên trang profile
- Admin quản lý danh sách users
- Follow / Friend system

### Cân nhắc cho tương lai (Future Considerations)

- Thay thế local disk storage bằng cloud storage (S3, Cloudinary)
- Xóa avatar cũ khi upload avatar mới
- Crop/resize ảnh trước khi lưu
- Cài đặt riêng tư (privacy settings) — user chọn field nào public

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Avatar: tối đa **10MB**, chỉ chấp nhận định dạng hiện đại: `jpg`, `jpeg`, `png`, `webp`, `gif`, `avif`
- `dateOfBirth`: không được là ngày trong tương lai; tuổi không được vượt quá **100 năm**
- `phone`: **không được phép** set về empty string — nếu gửi lên, phải là giá trị hợp lệ
- `fullName`: bắt buộc (min 2, max 100 ký tự), chỉ chứa chữ cái, khoảng trắng, dấu gạch ngang, dấu nháy đơn, dấu chấm
- `address`: tối đa 500 ký tự
- `gender`: enum — `male` | `female` | `other` | `prefer_not_to_say`
- Avatar cũ **không bị xóa** khi upload avatar mới (chỉ update URL trong DB)
- Public profile chỉ trả về: `fullName`, `avatar`, `gender` — không lộ thông tin nhạy cảm
- Phải đăng nhập để update profile và upload avatar; không cần đăng nhập để xem public profile

**Giả định:**

- `id` trong `GET /api/v1/users/:id` là `_id` của document trong collection `users` (không phải `authId`)
- User luôn có `fullName` (bắt buộc khi signup), nhưng `phone`, `address`, `dateOfBirth`, `gender` có thể chưa được set
- Avatar URL trả về là URL đầy đủ (VD: `http://localhost:3000/uploads/avatars/abc.jpg`)
- Khi PATCH, chỉ các field được gửi lên mới được update (partial update — không cần gửi toàn bộ)
