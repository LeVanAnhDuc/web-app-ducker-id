# ADMINLOGINHISTORY — Lịch sử đăng nhập (admin)

- **REQ-ADMINLOGINHISTORY-01** `/admin/login-history` hiện các lần đăng nhập của mọi tài khoản, lọc được.
- **REQ-ADMINLOGINHISTORY-02** Mỗi bản ghi mở được trang chi tiết, kèm nguồn app của nó.
- **REQ-ADMINLOGINHISTORY-03** API danh sách sắp xếp được theo `createdAt`, `method`, `status`, `country`, `ip`, `usernameAttempted`, tăng hoặc giảm; mặc định mới nhất trước.
- **REQ-ADMINLOGINHISTORY-04** Query hoặc id không hợp lệ bị từ chối với 400 `VALIDATION_ERROR`, mỗi trường sai được nêu trong `errors` kèm message đã dịch theo ngôn ngữ của người gọi (không bao giờ là key i18n thô); toán tử truy vấn (`a[$ne]=…`) không bao giờ tới được database; id không tồn tại trả 404 `LOGIN_HISTORY_NOT_FOUND`.
- **REQ-ADMINLOGINHISTORY-05** Bộ lọc của API: text (`ip`, `country`, `city`, `os`, `browser`, tối đa 200 ký tự) khớp một phần, không phân biệt hoa thường, bỏ khoảng trắng hai đầu và khớp theo nghĩa đen; enum, boolean và id khớp chính xác; một ngày không kèm giờ nghĩa là trọn ngày đó.
