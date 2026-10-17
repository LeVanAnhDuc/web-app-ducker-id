# ADMINUSERS — quản lý tài khoản người dùng (admin)

- **REQ-ADMINUSERS-01** `/admin/users` liệt kê tài khoản, có tìm kiếm cùng filter theo role và trạng thái.
- **REQ-ADMINUSERS-02** Admin khoá và mở khoá tài khoản; tài khoản bị khoá không đăng nhập được.
- **REQ-ADMINUSERS-03** Admin đặt lại mật khẩu của người dùng; một mật khẩu tạm thời được cấp.
- **REQ-ADMINUSERS-04** Chỉ admin dùng được màn hình và API quản lý tài khoản: khách bị đưa về `/login` (API trả 401), người không phải admin nhận 403 và không thấy dữ liệu tài khoản nào.
- **REQ-ADMINUSERS-05** Rào chắn thao tác: admin không tự khoá và không tự đặt lại mật khẩu của chính mình (403), không khoá được admin active cuối cùng; khoá / mở khoá lặp lại là idempotent (200, trạng thái không đổi); admin khác thì khoá và đặt lại mật khẩu được.
- **REQ-ADMINUSERS-06** Khoá là khoá mềm: tài khoản bị khoá không làm mới được phiên (`REFRESH_TOKEN_INVALID`), còn access token đang có vẫn dùng được tới khi hết hạn.
- **REQ-ADMINUSERS-07** Thao tác thay đổi của admin (khoá, mở khoá, đặt lại mật khẩu) bị giới hạn 20 yêu cầu / 15 phút cho mỗi IP + admin; vượt ngưỡng trả 429 `TOO_MANY_REQUESTS`.
