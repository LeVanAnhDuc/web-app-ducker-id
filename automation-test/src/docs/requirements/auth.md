# AUTH — Đăng nhập, đăng ký, khoá tài khoản, session

- **REQ-AUTH-01** Màn hình đăng nhập hỏi email trước; địa chỉ đã biết đi tiếp sang bước nhập mật khẩu.
- **REQ-AUTH-02** Địa chỉ chưa biết được tự động gửi mã đăng ký và đi tiếp vào luồng đăng ký.
- **REQ-AUTH-03** Đăng ký phải xác minh mã 6 chữ số gửi qua email (có gửi lại và cooldown) trước khi tài khoản được tạo.
- **REQ-AUTH-04** Đăng ký hoàn tất với họ tên, giới tính, ngày sinh và mật khẩu đạt policy độ mạnh, kèm chấp nhận điều khoản.
- **REQ-AUTH-05** User đăng nhập được bằng email + mật khẩu.
- **REQ-AUTH-06** User đăng nhập được bằng mã một lần gửi tới email.
- **REQ-AUTH-07** User đăng nhập được bằng magic link gửi tới email.
- **REQ-AUTH-08** Màn hình cách đăng nhập khác cho chuyển giữa mật khẩu, mã và magic link ngay giữa luồng.
- **REQ-AUTH-09** Nhập sai mật khẩu quá nhiều lần thì tài khoản bị khoá tạm thời, và message nói rõ khoá trong bao lâu.
- **REQ-AUTH-10** User bị khoá có thể yêu cầu mã mở khoá qua email và xác minh nó để vào lại.
- **REQ-AUTH-11** Tài khoản inactive và chưa xác minh email không đăng nhập được.
- **REQ-AUTH-12** Các endpoint đăng nhập bị rate limit theo IP và theo email.
- **REQ-AUTH-13** Session còn nguyên qua reload nhờ cookie refresh token; access token không bao giờ được lưu bền trong trình duyệt.
- **REQ-AUTH-14** Logout kết thúc session; refresh token cũ không còn dùng được.
- **REQ-AUTH-15** User đã đăng nhập không vào được trang guest (login, sign-up) và guest không vào được trang private.
- **REQ-AUTH-16** Màn hình mã đăng nhập và magic link cho gửi lại sau khi hết cooldown 60 s; mã đăng nhập chỉ gửi được 3 lần trong vòng đời 5 phút của mã, và giới hạn đó trả lời giống nhau dù địa chỉ có tồn tại hay không.
- **REQ-AUTH-17** Tài khoản bị vô hiệu hoá sau khi đã đăng nhập không làm mới được access token nữa: session đang có kết thúc ở lần refresh kế tiếp.
