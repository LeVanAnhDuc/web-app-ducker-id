# AUTHZ — kiểm soát truy cập

- **REQ-AUTHZ-01** Guest bị redirect từ trang private về login và nhận 401 từ endpoint được bảo vệ.
- **REQ-AUTHZ-02** Non-admin bị từ chối ở mọi trang `/admin` và mọi endpoint admin (403).
- **REQ-AUTHZ-03** `/admin` là trang landing có link tới từng khu vực admin.
- **REQ-AUTHZ-04** Lối vào "Admin Console" trong user menu chỉ hiện với admin và mở trang landing `/admin`.
- **REQ-AUTHZ-05** API chỉ tin vai trò lấy từ access token first-party do Ducker ID ký: token bị sửa claim, ID token hay refresh token dùng làm Bearer đều bị từ chối, không bao giờ mở được endpoint admin.
- **REQ-AUTHZ-06** Shell admin (huy hiệu "Admin Mode", sidebar) chỉ hiện trên `/admin/*`; "Back to User Dashboard" đưa admin về trang chủ và thoát chế độ admin.
