# TÀI LIỆU 1: YÊU CẦU & PHẠM VI (Requirements & Scope)

---

## 1.1. Thông tin chung

| Mục               | Nội dung                          |
| ----------------- | --------------------------------- |
| **Tên feature**   | Contact Admin                     |
| **Người yêu cầu** | User                              |
| **Ngày tạo**      | 03/03/2026                        |
| **Phiên bản**     | v1.0                              |

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
- Hỗ trợ phân loại yêu cầu theo danh mục (category) và mức độ ưu tiên (priority)
- Hỗ trợ đính kèm file kèm theo yêu cầu liên hệ
- Áp dụng rate limiting để chống spam

---

## 1.4. Đối tượng người dùng (Target Users)

| Role          | Mô tả                                             | Nhu cầu chính                                        |
| ------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Guest (chưa đăng nhập) | Người truy cập chưa có tài khoản hoặc chưa đăng nhập | Gửi yêu cầu hỗ trợ, báo cáo sự cố                   |
| User (đã đăng nhập)    | Người dùng đã có tài khoản và đăng nhập             | Gửi khiếu nại, yêu cầu hỗ trợ với thông tin tự động điền |
| Admin                   | Quản trị viên hệ thống                              | Xem và quản lý các yêu cầu liên hệ từ user            |

---

## 1.5. User Stories

| ID    | User Story                                                                                                         | Ghi chú                                |
| ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| US-01 | Là một **guest/user**, tôi muốn **gửi yêu cầu liên hệ đến admin** để **được hỗ trợ giải quyết vấn đề**          | Cả guest và user đều có thể gửi        |
| US-02 | Là một **guest/user**, tôi muốn **chọn danh mục và mức độ ưu tiên** để **admin phân loại và xử lý nhanh hơn**     | Categories: account, technical, feature, billing, security, other |
| US-03 | Là một **guest/user**, tôi muốn **đính kèm file** để **minh họa rõ hơn vấn đề tôi đang gặp**                     | Hỗ trợ hình ảnh/tài liệu               |
| US-04 | Là một **admin**, tôi muốn **hệ thống lưu trữ tất cả yêu cầu liên hệ** để **xem xét và xử lý sau**              | Có thuộc tính trạng thái (status)       |

---

## 1.6. Phạm vi (Scope)

### Trong phạm vi (In Scope)

- **Backend API**: Tạo endpoint `POST /api/v1/contact` để nhận yêu cầu liên hệ
- **Model**: Tạo Mongoose schema cho Contact với các fields: email, subject, category, priority, message, attachments, status
- **Validation**: Validate input phía server (Joi)
- **Rate Limiting**: Giới hạn số lần gửi liên hệ (chống spam)
- **File Upload**: Hỗ trợ đính kèm file (hình ảnh/tài liệu)
- **Trạng thái**: Mỗi yêu cầu có thuộc tính status (new, processing, resolved)
- **Client Integration**: Kết nối frontend form hiện có với API mới

### Ngoài phạm vi (Out of Scope)

- API xem lịch sử liên hệ (sẽ làm sau)
- Admin dashboard quản lý yêu cầu liên hệ
- Thông báo real-time cho admin khi có yêu cầu mới
- Gửi email thông báo cho admin
- Chat 2 chiều giữa user và admin
- Admin phản hồi qua hệ thống (phản hồi bằng email do con người xử lý)

### Cân nhắc cho tương lai (Future Considerations)

- API xem lịch sử liên hệ cho user
- Admin dashboard với bộ lọc và thống kê
- Thông báo email/push khi có yêu cầu mới
- Export dữ liệu liên hệ

---

## 1.7. Ràng buộc & Giả định (Constraints & Assumptions)

**Ràng buộc:**

- Phải tuân theo kiến trúc module hiện tại của server (controller → service → repository)
- Sử dụng Joi cho validation (theo codebase hiện tại)
- Sử dụng Redis cho rate limiting (theo pattern hiện tại)
- Package manager: YARN
- Hỗ trợ i18n cho error messages

**Giả định:**

- User có thể gửi liên hệ dù chưa đăng nhập (guest) hoặc đã đăng nhập
- Nếu đã đăng nhập, email tự động lấy từ thông tin user
- File đính kèm có giới hạn kích thước hợp lý
- Admin sẽ xem và phản hồi thủ công qua email riêng
