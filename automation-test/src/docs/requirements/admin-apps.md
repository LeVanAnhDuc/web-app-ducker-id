# ADMINAPPS — Quản lý danh sách ứng dụng (admin)

- **REQ-ADMINAPPS-01** `/admin/apps` liệt kê các ứng dụng đã đăng ký, có tìm kiếm, lọc theo trạng thái và danh mục, và tuỳ chỉnh cột.
- **REQ-ADMINAPPS-02** Admin tạo ứng dụng kèm cấu hình OAuth (URI, grant/response type, scope, phương thức xác thực token, 1–5 danh mục có thứ tự).
- **REQ-ADMINAPPS-03** Client ID và secret được sinh khi tạo; secret chỉ hiện một lần, kèm nút sao chép.
- **REQ-ADMINAPPS-04** Admin sửa một ứng dụng đã có.
- **REQ-ADMINAPPS-05** Admin bật hoặc tắt một ứng dụng bằng công tắc trạng thái.
- **REQ-ADMINAPPS-06** Server từ chối mọi input sai (thiếu, sai kiểu, sai định dạng, body không phải JSON hợp lệ) bằng 400 kèm lỗi theo từng trường và message theo ngôn ngữ người gọi; không bao giờ trả 5xx.
- **REQ-ADMINAPPS-07** Đăng ký, sửa, ẩn và hiện lại thành công đều được xác nhận bằng toast và đọc qua live region cho trình đọc màn hình.
