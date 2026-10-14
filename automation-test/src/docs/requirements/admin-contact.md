# ADMINCONTACT — Hộp thư hỗ trợ (admin)

- **REQ-ADMINCONTACT-01** `/admin/contact` liệt kê các yêu cầu hỗ trợ gửi đến, có tìm kiếm và bộ lọc.
- **REQ-ADMINCONTACT-02** Mỗi yêu cầu mở được trang chi tiết.
- **REQ-ADMINCONTACT-03** Trạng thái đi theo luồng `new → processing → resolved`.
- **REQ-ADMINCONTACT-04** Mọi phản hồi của API hộp thư (`/admin/contacts*`, thành công lẫn lỗi validation) mang thông điệp đã dịch theo `Accept-Language`, không bao giờ là key catalogue.
