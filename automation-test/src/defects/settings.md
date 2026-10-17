# SETTINGS — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-SETTINGS-01

- **TC:** TC-SETTINGS-016 · **Requirement:** REQ-SETTINGS-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-032
- **Bước tái hiện:** chạy test của TC-SETTINGS-016 — `tests/e2e/settings/datetime-format.e2e.ts` ("Notification times are <time> elements")
- **Mong đợi:** phần tử `<time>`
- **Thực tế:** Thời gian của notification là `<span>` trơn, không phải `<time datetime>`
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `NotificationItem` render thời gian qua `FormatTime` (`<time dateTime>`)
