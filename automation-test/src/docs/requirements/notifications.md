# NOTIFICATIONS — thông báo

- **REQ-NOTIFICATIONS-01** Header hiện badge chưa đọc và một panel chứa các thông báo mới nhất, có trạng thái rỗng và lỗi riêng, cùng Mark all và View all.
- **REQ-NOTIFICATIONS-02** `/notifications` liệt kê thông báo mới nhất trước, nhóm theo Today / Yesterday / Earlier, có Load more, trạng thái rỗng và lỗi (thử lại).
- **REQ-NOTIFICATIONS-03** Người dùng đánh dấu một thông báo, hoặc tất cả, là đã đọc.
- **REQ-NOTIFICATIONS-04** Sự kiện thật tạo thông báo cho người dùng: mật khẩu do chính họ đổi hoặc admin đặt lại, tài khoản bị khoá vì sai mật khẩu, đăng nhập từ thiết bị hoặc quốc gia mới, app mới xuất hiện trong launcher của họ.
- **REQ-NOTIFICATIONS-05** Danh sách có tab All / Unread / Read và bộ lọc loại (security, account, apps, system); hai bộ lọc kết hợp được với nhau.
- **REQ-NOTIFICATIONS-06** Mở một thông báo sẽ đánh dấu đã đọc và đi theo link nội bộ của nó; đăng nhập bất thường có "Not you? Change your password"; link không phải đường dẫn nội bộ thì không bao giờ được render.
- **REQ-NOTIFICATIONS-07** Thông báo được render từ type và tham số theo ngôn ngữ của người đọc (tiếng Anh / tiếng Việt), kể cả tên quốc gia.
- **REQ-NOTIFICATIONS-08** Badge chưa đọc tự làm mới mỗi phút.
- **REQ-NOTIFICATIONS-09** Thông báo là riêng của từng người: người dùng chỉ xem và đánh dấu được thông báo của chính mình, id của người khác được trả lời y như id không tồn tại (404 `NOTIFICATION_NOT_FOUND`), mỗi mục không lộ chủ sở hữu, và mọi endpoint cần phiên đăng nhập.
