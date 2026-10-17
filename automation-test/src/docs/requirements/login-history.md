# LOGINHISTORY — Lịch sử đăng nhập của tôi

- **REQ-LOGINHISTORY-01** User xem được các lần thử đăng nhập của chính mình: phương thức, kết quả và lý do, IP, vị trí, thiết bị, hệ điều hành, trình duyệt, cờ bất thường.
- **REQ-LOGINHISTORY-02** Mỗi dòng cho biết lần đăng nhập diễn ra ở đâu — Ducker ID hay một ứng dụng vệ tinh — và lần đăng nhập SSO mang badge "Auto".
- **REQ-LOGINHISTORY-03** Danh sách lọc được theo kết quả, phương thức, thiết bị, ứng dụng và ngày, và có phân trang.
- **REQ-LOGINHISTORY-04** User không bao giờ thấy các lần thử đăng nhập của user khác.
- **REQ-LOGINHISTORY-05** Địa chỉ IP công khai trong lịch sử của chính user được che phần cuối (IPv4 `a.b.*.*`, IPv6 giữ ba nhóm đầu); IP loopback / private hiện nguyên (`127.0.0.1`, không bao giờ `::1` hay `::ffff:`). Vị trí `LOCAL` / `UNKNOWN` hiện thành nhãn ("Local" / "Unknown"), thành phố sentinel thì chỉ hiện nhãn quốc gia; thiết bị `UNKNOWN` thì chỉ hiện trình duyệt.
- **REQ-LOGINHISTORY-06** API `GET /login-history` sắp xếp theo `createdAt` / `method` / `status` / `country` (tăng / giảm), lọc thêm theo `clientType` và theo text `country` / `city` / `os` / `browser` (khớp một phần, không phân biệt hoa thường, theo nghĩa đen, tối đa 200 ký tự). Bộ lọc chỉ dành cho admin (`userId`, `ip`) bị bỏ qua.
- **REQ-LOGINHISTORY-07** Tham số truy vấn không hợp lệ bị từ chối bằng 400 `VALIDATION_ERROR`, mỗi trường lỗi có một mục trong `errors` với message đã dịch theo ngôn ngữ của request; toán tử truy vấn (`status[$ne]=…`) bị từ chối, không bao giờ 200 hay 5xx.
