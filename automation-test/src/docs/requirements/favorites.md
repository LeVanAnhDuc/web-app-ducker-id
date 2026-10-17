# FAVORITES — Yêu thích

- **REQ-FAVORITES-01** User gắn sao hoặc bỏ sao bất kỳ app nào ngay từ tile của app.
- **REQ-FAVORITES-02** `/favorites` chỉ hiện những app user đã gắn sao.
- **REQ-FAVORITES-03** Yêu thích còn nguyên qua reload và là riêng tư của từng user.
- **REQ-FAVORITES-04** App đã gắn sao nhưng bị thu hồi quyền truy cập thì bị ẩn khỏi `/favorites`, không bị xoá, và xuất hiện lại khi quyền được khôi phục.
- **REQ-FAVORITES-05** App đã gắn sao mà admin chuyển sang inactive thì bị ẩn khỏi `/favorites` (và catalogue), không bị xoá, và xuất hiện lại khi app active trở lại.
- **REQ-FAVORITES-06** API yêu thích từ chối input sai bằng 400 (`appId` không phải ObjectId, `sort` ngoài `recent` / `name`, `categoryId` sai định dạng, `search` dài hơn 200 ký tự sau khi trim) và trả cùng một 404 `FAVORITE_APP_NOT_FOUND` cho app không tồn tại, inactive hay người gọi không được mở — không phân biệt được hai trường hợp, không bao giờ 5xx.
- **REQ-FAVORITES-07** Lỗi được báo cho user: gắn / bỏ sao thất bại thì trái tim quay về trạng thái cũ, lỗi được announce và hiện toast lỗi; tải `/favorites` thất bại thì hiện thông báo lỗi, không giả làm danh sách rỗng.
- **REQ-FAVORITES-08** Trái tim là nút toggle truy cập được: `aria-pressed` theo trạng thái, nhãn chứa tên app, bấm được bằng bàn phím, kết quả được announce ("Added to favorites." / "Removed from favorites."); bỏ sao trên `/favorites` không làm focus rơi về `<body>`.
