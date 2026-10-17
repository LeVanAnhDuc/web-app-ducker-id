# APPS — Danh mục ứng dụng và tìm kiếm

- **REQ-APPS-01** `/apps` liệt kê mọi ứng dụng đang hoạt động mà user được mở: các ứng dụng role của họ cho phép, cộng những ứng dụng admin cấp thêm ngoài role, trừ những ứng dụng admin thu hồi; thay đổi hiện ra ở lần tải kế tiếp.
- **REQ-APPS-02** `/apps` hỗ trợ tìm kiếm theo chữ, lọc theo danh mục, chuyển dạng lưới/danh sách và phân trang, tất cả giữ trên URL.
- **REQ-APPS-03** Mở một ô ứng dụng sẽ mở URL riêng của ứng dụng đó trong tab mới và ghi lại lần mở.
- **REQ-APPS-04** Ô tìm kiếm trên header tìm ứng dụng ngay khi gõ, điều hướng được bằng bàn phím, và mở một ứng dụng hoặc chuyển sang trang danh sách.
- **REQ-APPS-05** Tên danh mục hiển thị theo ngôn ngữ đang dùng (tiếng Anh / tiếng Việt).
- **REQ-APPS-06** Ứng dụng mà user không được mở không bao giờ xuất hiện trong kết quả tìm kiếm của `/apps`, kể cả khi tìm đúng tên.
- **REQ-APPS-07** Danh mục ứng dụng của user (`GET /apps`) và danh sách danh mục công khai chỉ trả các trường dùng để hiển thị: không lộ client ID / secret, redirect URI, role yêu cầu, trạng thái hay số ứng dụng theo danh mục.
- **REQ-APPS-08** Tham số không hợp lệ của `GET /apps` (page < 1 hoặc không nguyên, limit ngoài 1…100, search dài hơn 200 ký tự, categoryId không phải ObjectId) bị từ chối 400 `VALIDATION_ERROR`, nêu đúng trường và thông điệp theo ngôn ngữ của request.
- **REQ-APPS-09** Tìm kiếm khớp tên hiển thị hoặc mô tả, không phân biệt hoa thường, coi ký tự đặc biệt là chữ (không phải biểu thức chính quy) và bỏ khoảng trắng đầu / cuối.
- **REQ-APPS-10** Danh sách danh mục (`GET /apps/categories`) là endpoint công khai: không cần đăng nhập nhưng token sai vẫn bị từ chối, cache được 60 giây, và giới hạn 100 request / 5 phút cho mỗi IP.
