# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                          |
| ----------------- | --------------------------------- |
| **Tên feature**   | Contact Admin                     |
| **Người yêu cầu** | User                              |
| **Ngày tạo**      | 03/03/2026                        |
| **Phiên bản**     | v2.0                              |

---

## 1.2. Bối cảnh & Vấn đề (Context & Problem Statement)

> Dự án này là một **App Store** platform.

**Tình trạng hiện tại:**
Hiện tại hệ thống chưa có kênh liên hệ nào để user gửi khiếu nại, yêu cầu hỗ trợ, hoặc báo cáo sự cố đến Admin. Frontend đã có sẵn form UI nhưng chưa có backend API xử lý.

**Vấn đề:**
User không có cách nào liên hệ trực tiếp với Admin khi gặp vấn đề. Điều này dẫn đến trải nghiệm kém và thiếu kênh phản hồi giữa user và đội ngũ quản trị.

---

## 1.3. Mục tiêu (Objectives)

- Cung cấp API endpoint cho user gửi yêu cầu liên hệ đến Admin
- Lưu trữ tất cả các yêu cầu liên hệ vào database để Admin quản lý
- Category (danh mục) và priority (mức độ ưu tiên) được hệ thống tự động gán khi submit (category mặc định: "other", priority mặc định: "medium"); user không chọn
- Hỗ trợ đính kèm file kèm theo yêu cầu liên hệ
- Áp dụng rate limiting để chống spam
- Cung cấp API cho Admin xem danh sách toàn bộ contact (phân trang, filter tất cả fields, sort)
- Cung cấp API cho Admin xem chi tiết một contact (message đầy đủ + image preview attachments)
- Cung cấp API cho Admin cập nhật trạng thái contact (new → processing → resolved)
- Cung cấp API cho Admin cập nhật danh mục (category) của contact
- Cung cấp API cho User xem danh sách contact mình đã gửi (phân trang, sort)

---

## 1.4. Đối tượng người dùng (Target Users)

| Role          | Mô tả                                             | Nhu cầu chính                                                        |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Guest (chưa đăng nhập) | Người truy cập chưa có tài khoản hoặc chưa đăng nhập | Gửi yêu cầu hỗ trợ, báo cáo sự cố                           |
| User (đã đăng nhập)    | Người dùng đã có tài khoản và đăng nhập             | Gửi yêu cầu hỗ trợ, xem lại danh sách contact mình đã gửi          |
| Admin                   | Quản trị viên hệ thống                              | Xem toàn bộ contact, xem chi tiết, cập nhật trạng thái xử lý       |

---

## 1.5. User Stories

| ID    | User Story                                                                                                         | Ghi chú                                |
| ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| US-01 | Là một **guest/user**, tôi muốn **gửi yêu cầu liên hệ đến admin** để **được hỗ trợ giải quyết vấn đề**          | Cả guest và user đều có thể gửi        |
| US-02 | ~~Là một **guest/user**, tôi muốn **chọn danh mục**~~ → **Hệ thống tự gán category mặc định** khi user submit | Category mặc định: "other"; Priority mặc định: "medium" — cả hai đều do hệ thống gán, user không chọn |
| US-03 | Là một **guest/user**, tôi muốn **đính kèm file** để **minh họa rõ hơn vấn đề tôi đang gặp**                     | Hỗ trợ hình ảnh/tài liệu               |
| US-04 | Là một **admin**, tôi muốn **hệ thống lưu trữ tất cả yêu cầu liên hệ** để **xem xét và xử lý sau**              | Có thuộc tính trạng thái (status)       |
| US-05 | Là một **admin**, tôi muốn **xem danh sách tất cả contact** (phân trang, filter, sort) để **nắm bắt tổng quan và ưu tiên xử lý** | Table view với các fields chính |
| US-06 | Là một **admin**, tôi muốn **xem chi tiết một contact** để **đọc nội dung đầy đủ và xem ảnh đính kèm**           | Full message + image preview            |
| US-07 | Là một **admin**, tôi muốn **cập nhật trạng thái contact** (new/processing/resolved) để **theo dõi tiến độ xử lý** | Chỉ update field status                |
| US-08 | Là một **user đã đăng nhập**, tôi muốn **xem danh sách contact mình đã gửi** để **theo dõi trạng thái yêu cầu**  | Filter theo userId của chính mình       |
| US-09 | Là một **admin**, tôi muốn **cập nhật danh mục (category) của contact** để **phân loại yêu cầu sau khi xem xét** | Chỉ update field category; chỉ admin mới có quyền |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

**Submit (v1.0 — đã implement):**
- `POST /api/v1/contact/submit` — Guest/User gửi yêu cầu liên hệ
- Mongoose schema với đầy đủ fields, Joi validation, Rate limiting, File upload (Multer)
- Trạng thái contact: new, processing, resolved

**Admin & User Query API (v2.0 — scope mới):**
- `GET /api/v1/admin/contacts` — Admin xem danh sách tất cả contact (table view)
  - Pagination: offset-based (page, limit)
  - Filter: `status`, `category`, `priority`, `email`, `ticketNumber`, `createdAt` range, `userId` (priority vẫn filter được vì field tồn tại trong DB)
  - Search: text search trên `subject`, `email`, `ticketNumber`
  - Sort: `createdAt`, `priority`, `status`, `category` (asc/desc), mặc định `createdAt desc`
  - Response fields (table): `_id`, `ticketNumber`, `email`, `subject`, `category`, `status`, `userId`, `attachmentCount`, `createdAt`, `updatedAt`
- `GET /api/v1/admin/contacts/:id` — Admin xem chi tiết một contact
  - Full fields: tất cả fields của table + `message`, `attachments` (với `previewUrl` cho image files), `ipAddress`
- `PATCH /api/v1/admin/contacts/:id/status` — Admin cập nhật status
  - Body: `{ status: 'new' | 'processing' | 'resolved' }`
- `PATCH /api/v1/admin/contacts/:id/category` — Admin cập nhật category
  - Body: `{ category: 'account' | 'technical' | 'feature' | 'billing' | 'security' | 'other' }`
- `GET /api/v1/auth/contacts/me` — User xem danh sách contact mình đã gửi
  - Filter theo `userId` từ token (không thể xem của người khác)
  - Pagination + sort
  - Response fields: `ticketNumber`, `subject`, `category`, `status`, `attachmentCount`, `createdAt`

### Ngoài phạm vi (Out of Scope)

- Thông báo real-time cho admin khi có yêu cầu mới
- Gửi email thông báo cho admin
- Chat 2 chiều giữa user và admin
- Admin phản hồi qua hệ thống (phản hồi bằng email do con người xử lý)
- Download file đính kèm (chỉ xem preview ảnh)
- Export dữ liệu liên hệ (CSV/Excel)
- Xóa contact

### Cân nhắc cho tương lai (Future Considerations)

- Export dữ liệu liên hệ (CSV/Excel)
- Thông báo email/push khi có yêu cầu mới
- Admin reply qua hệ thống (thread messages)
- Download file đính kèm
- Dashboard thống kê (chart theo category, status)
- Tự động gán priority dựa trên nội dung yêu cầu (AI classification)

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Phải tuân theo kiến trúc module hiện tại của server (controller → service → repository)
- Sử dụng Joi cho validation (theo codebase hiện tại)
- Sử dụng Redis cho rate limiting (theo pattern hiện tại)
- Package manager: YARN
- Hỗ trợ i18n cho error messages
- Admin API yêu cầu role `admin` (dùng `AdminGuard` — đã tạo từ login-history v2.0)
- User API (`/auth/contacts/me`) yêu cầu đăng nhập, chỉ thấy contact của chính mình (filter theo `userId`)
- Image preview: chỉ hỗ trợ xem ảnh (jpg, jpeg, png, gif), không hỗ trợ download file

**Giả định:**

- User có thể gửi liên hệ dù chưa đăng nhập (guest) hoặc đã đăng nhập
- Nếu đã đăng nhập, email tự động lấy từ thông tin user
- File đính kèm có giới hạn kích thước hợp lý
- Admin sẽ xem và phản hồi thủ công qua email riêng
- `AdminGuard` đã tồn tại (từ login-history v2.0), dùng lại không cần tạo mới
