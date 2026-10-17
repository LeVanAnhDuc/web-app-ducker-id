# SETTINGS — Bug log

## Đang mở

| Bug                                 | Mức  | TC              | Tóm tắt                                                                   |
| ----------------------------------- | ---- | --------------- | ------------------------------------------------------------------------- |
| [BUG-SETTINGS-01](#bug-settings-01) | Thấp | TC-SETTINGS-016 | Thời gian của notification là `<span>` trơn, không phải `<time datetime>` |

### BUG-SETTINGS-01

- **TC:** TC-SETTINGS-016 · **Requirement:** REQ-SETTINGS-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-032
- **Bước tái hiện:** chạy test của TC-SETTINGS-016 — `tests/e2e/settings/datetime-format.e2e.ts` ("Notification times are <time> elements")
- **Mong đợi:** phần tử `<time>`
- **Thực tế:** Thời gian của notification là `<span>` trơn, không phải `<time datetime>`

## Đã sửa

_(chưa có)_
