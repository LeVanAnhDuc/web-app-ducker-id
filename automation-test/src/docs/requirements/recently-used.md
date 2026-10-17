# RECENTLYUSED — dùng gần đây

- **REQ-RECENTLYUSED-01** `/recently-used` liệt kê mỗi app đã mở một lần, mới nhất trước, nhóm theo Today / Yesterday / This Week / Earlier.
- **REQ-RECENTLYUSED-02** Mỗi dòng hiển thị thời điểm mở lần cuối và số lần mở.
- **REQ-RECENTLYUSED-03** Tìm kiếm và cuộn vô hạn trên lịch sử.
- **REQ-RECENTLYUSED-04** Xoá một app kèm Undo, hoặc xoá toàn bộ lịch sử sau khi xác nhận.
- **REQ-RECENTLYUSED-05** Đăng nhập vào một app vệ tinh qua Ducker ID cũng ghi app đó là đã dùng.
- **REQ-RECENTLYUSED-06** App bị thu hồi quyền truy cập biến mất khỏi `/recently-used` và quay lại, lịch sử còn nguyên, khi quyền được khôi phục.
- **REQ-RECENTLYUSED-07** Việc ghi lượt mở bị giới hạn theo từng user (60 lần mỗi phút); vượt giới hạn thì bị từ chối với 429 kèm thông báo, không ảnh hưởng user khác.
