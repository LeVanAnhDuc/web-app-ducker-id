# ADMINCATEGORIES — Quản lý category (admin)

- **REQ-ADMINCATEGORIES-01** `/admin/categories` liệt kê các category kèm tên tiếng Anh và tiếng Việt.
- **REQ-ADMINCATEGORIES-02** Admin tạo và đổi tên category; slug đi theo tên tiếng Anh và luôn duy nhất.
- **REQ-ADMINCATEGORIES-03** Admin sắp xếp lại thứ tự các category.
- **REQ-ADMINCATEGORIES-04** Xoá một category sẽ chuyển các app chỉ thuộc category đó sang một category chung hoặc sang category được chọn riêng cho từng app.
- **REQ-ADMINCATEGORIES-05** Mọi thao tác thay đổi category (tạo, đổi tên, sắp xếp, xoá) bị giới hạn 120 lần / 60 giây cho mỗi admin trên mỗi IP; vượt giới hạn trả 429 kèm message đã dịch, và không chặn admin khác.
