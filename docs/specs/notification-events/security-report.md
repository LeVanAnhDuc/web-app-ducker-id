# Security report — Notification Events

> Rà theo skill `standard-security` (§1 chung, §2 server, §3 client), 05.10.2026.

| Mối lo | Cách xử lý | Kết quả |
| --- | --- | --- |
| **Open redirect qua `link`** | Server: `isInternalLink` ở validator Mongoose — chỉ đường dẫn bắt đầu bằng một `/`, cấm `//` và `\`. Client kiểm lại trước khi render `<Link>`; link không hợp lệ → không render anchor. Producer chỉ dựng link từ hằng `NOTIFICATION_LINKS` + `encodeURIComponent(displayName)` | ✅ unit (`isInternalLink` 3 dạng thoát origin) + E2E 4b |
| **XSS qua nội dung** | DB không lưu text, chỉ `params` chuỗi/số do server dựng (`appName` = displayName admin nhập, browser/OS đã parse). Client render bằng next-intl → React escape; không `dangerouslySetInnerHTML` | ✅ |
| **IDOR** | Đọc/sửa vẫn lọc theo `userId` từ token (`RequestContext.requireUserId`) như trước; không endpoint mới | ✅ không đổi |
| **Rò dữ liệu nhạy cảm** | `params` của `LOGIN_ANOMALY` chỉ có tên trình duyệt, OS (đã bỏ phiên bản) và mã quốc gia — không IP, không email. Log của dispatcher không log `params` | ✅ |
| **Lỗi phụ làm hỏng luồng auth** | `NotificationDispatcher` không throw; `recordSuccessfulLogin` bọc try/catch như `logLoginAttempt`; `announceApp` bắt lỗi | ✅ unit "never throws" ở cả ba |
| **Spam / khuếch đại** | `APP_AVAILABLE` một lần mỗi app (`markAnnounced` nguyên tử); fan-out có `dedupeKey` + unique index nên retry không nhân bản; ghi theo lô 500. `ACCOUNT_LOCKED` chỉ phát khi lockout thực sự được đặt | ✅ |
| **Kẻ tấn công dùng notification để dò** | `ACCOUNT_LOCKED` ghi vào inbox của **chủ** tài khoản, không trả gì thêm cho người đang thử mật khẩu; response login giữ nguyên | ✅ |
| **Validation input** | `category` Joi `valid(...)`, sai → 400 | ✅ E2E 4a |
| **Dependency** | Không thêm package | ✅ |

**Rủi ro còn lại (chấp nhận):**

- Phát hiện bất thường dựa trên UA + geoip — kẻ có mật khẩu và giả UA giống hệt vẫn không bị báo. Đây là
  tín hiệu cảnh báo cho chủ tài khoản, không phải lớp chặn; chặn thật (step-up, MFA) nằm ngoài phạm vi.
- `TooManyRequests` khi khoá vẫn trả số giây còn lại như trước feature này (không đổi hành vi).
