# APPS — Bug log

## Đang mở

| Bug                         | Mức        | TC          | Tóm tắt                                                                                |
| --------------------------- | ---------- | ----------- | -------------------------------------------------------------------------------------- |
| [BUG-APPS-01](#bug-apps-01) | Trung bình | TC-APPS-014 | `/apps` không bao giờ hiện thông báo lỗi tải khi gặp 5xx — trạng thái rỗng thay chỗ nó |

### BUG-APPS-01

- **TC:** TC-APPS-014 · **Requirement:** REQ-APPS-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-016
- **Bước tái hiện:** chạy test của TC-APPS-014 — `tests/e2e/apps/catalog.e2e.ts:297`
- **Mong đợi:** hiện thông báo lỗi (`role="alert"`)
- **Thực tế:** `/apps` không bao giờ hiện thông báo lỗi tải khi gặp 5xx — trạng thái rỗng thay chỗ nó

## Đã sửa

_(chưa có)_
