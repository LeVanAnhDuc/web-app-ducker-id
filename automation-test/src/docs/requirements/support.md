# SUPPORT — yêu cầu hỗ trợ

- **REQ-SUPPORT-01** User đã đăng nhập hoặc guest gửi yêu cầu hỗ trợ từ support dialog.
- **REQ-SUPPORT-02** `/contacts/me` liệt kê các yêu cầu user đã gửi, kèm ticket ID và trạng thái.
- **REQ-SUPPORT-03** Một yêu cầu mở ra trang chi tiết chỉ đọc; yêu cầu của user khác thì không truy cập được.
- **REQ-SUPPORT-04** Server kiểm và làm sạch một lần gửi: tiêu đề 5…200, nội dung 20…5000 ký tự tính **sau khi** bỏ thẻ
  HTML và khoảng trắng đầu/cuối; email không bắt buộc, có thì phải hợp lệ; nội dung lưu xuống đã bỏ thẻ HTML. Yêu cầu mới
  luôn ở trạng thái `new`, độ ưu tiên `medium`, chủ sở hữu lấy từ phiên đăng nhập — body không đặt được các trường đó.
- **REQ-SUPPORT-05** Gửi yêu cầu bị giới hạn 5 lần mỗi IP mỗi 15 phút (429 kèm `code`); khi gửi bị từ chối hoặc lỗi,
  dialog giữ nguyên nội dung đã nhập và đọc lý do qua `#announcer`.
- **REQ-SUPPORT-06** Support dialog: email theo ngữ cảnh mở (đã đăng nhập → email tài khoản, chỉ đọc; guest từ màn hình
  đăng nhập → điền sẵn, sửa được; guest từ user menu → trống, không bắt buộc); lỗi của từng field hiện ra trước khi gửi
  và không gửi gì; mỗi lần bấm gửi chỉ tạo một yêu cầu; màn hình thành công hiện mã ticket dạng ShortId, cho gửi tiếp
  hoặc đóng.
