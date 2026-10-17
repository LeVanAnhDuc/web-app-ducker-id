# PASSWORD — khôi phục và đổi mật khẩu

- **REQ-PASSWORD-01** Quên mật khẩu bằng mã dùng một lần, rồi đặt mật khẩu mới.
- **REQ-PASSWORD-02** Quên mật khẩu bằng magic link, rồi đặt mật khẩu mới.
- **REQ-PASSWORD-03** User tự đổi mật khẩu của mình trên trang profile, có nhập mật khẩu hiện tại.
- **REQ-PASSWORD-04** Sau khi admin reset, user bị buộc vào màn hình đổi mật khẩu và không dùng được phần còn lại của site.
- **REQ-PASSWORD-05** Đổi hoặc reset mật khẩu làm vô hiệu các session khác của user.
- **REQ-PASSWORD-06** Gửi mã hoặc magic link khôi phục không tiết lộ tài khoản có tồn tại hay không (kể cả tài khoản
  bị khoá: cùng câu trả lời, không cấp mã), và bị giới hạn: chờ 60 giây giữa hai lần gửi, tối đa 3 lần gửi mỗi cửa sổ,
  tối đa 5 request mỗi địa chỉ trong 15 phút.
- **REQ-PASSWORD-07** Các trang khôi phục mật khẩu chỉ dành cho khách: người đã đăng nhập mở chúng bị đưa về trang chủ.
- **REQ-PASSWORD-08** Trang lựa chọn khôi phục có lối "Contact administrator", mở form hỗ trợ với email đã điền sẵn và
  sửa được.
