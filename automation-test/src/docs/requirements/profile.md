# PROFILE — Hồ sơ cá nhân

- **REQ-PROFILE-01** User xem hồ sơ của mình: họ tên, email, số điện thoại, ngày sinh, giới tính, địa chỉ.
- **REQ-PROFILE-02** User sửa họ tên, số điện thoại, ngày sinh, giới tính và địa chỉ, có kiểm tra hợp lệ.
- **REQ-PROFILE-03** Ai cũng xem được hồ sơ công khai của một user qua `GET /users/:id` mà không cần đăng nhập, và chỉ
  thấy `_id`, họ tên, avatar, giới tính; id sai định dạng bị từ chối (400), id không tồn tại trả 404.
- **REQ-PROFILE-04** Cập nhật hồ sơ bị giới hạn 10 lần / 15 phút mỗi IP; vượt quá thì bị từ chối (429) với thông báo
  "thử lại sau".
