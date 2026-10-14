# ADMINENTITLEMENTS — phân quyền truy cập app (admin)

- **REQ-ADMINENTITLEMENTS-01** `/admin/entitlements` hiện ma trận user × app cho các user được chọn trong picker; mỗi ô khởi đầu bằng giá trị role của user cho phép.
- **REQ-ADMINENTITLEMENTS-02** Admin cấp một app vượt ngoài role hoặc thu hồi một app dù role cho phép; ngoại lệ được lưu, còn nguyên sau reload và được đánh dấu theo chiều của nó; đặt ô về lại mặc định của role thì ngoại lệ bị xoá.
- **REQ-ADMINENTITLEMENTS-03** API entitlement của admin từ chối guest (401) và người không phải admin (403).
- **REQ-ADMINENTITLEMENTS-04** User được thông báo mỗi khi quyền truy cập thực tế của họ tới một app thay đổi — được cấp (kèm link tới app) hoặc bị thu hồi — và không được thông báo khi một lần lưu để nguyên quyền như cũ.
- **REQ-ADMINENTITLEMENTS-05** `GET /admin/entitlements?userIds=…` trả cho từng user, theo đúng thứ tự `userIds` gửi lên, các app user được mở trên toàn catalog (mọi trạng thái) và các app đang có ngoại lệ; admin mặc định được mọi app.
- **REQ-ADMINENTITLEMENTS-06** Một id user hoặc app không tồn tại bị từ chối bằng 404 (`ENTITLEMENT_USER_NOT_FOUND` / `ENTITLEMENT_APP_NOT_FOUND`); `PATCH` kiểm mọi thay đổi trước khi ghi nên một lô có id hỏng không ghi gì. Lưu lại đúng giá trị đang có không đổi gì, và `PATCH` trả cùng dạng với `GET` cho các user bị ảnh hưởng.
- **REQ-ADMINENTITLEMENTS-07** `PATCH /admin/entitlements` bị giới hạn 60 request / phút cho mỗi IP + admin; request vượt giới hạn nhận 429 `TOO_MANY_REQUESTS`.
- **REQ-ADMINENTITLEMENTS-08** Đảo quyền tới một app không `active` không gửi thông báo nào cho user (launcher không hiện app đó).
