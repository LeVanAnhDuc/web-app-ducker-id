# APPS — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-APPS-01

- **TC:** TC-APPS-014 · **Requirement:** REQ-APPS-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-016
- **Bước tái hiện:** chạy test của TC-APPS-014 — `tests/e2e/apps/catalog.e2e.ts:297`
- **Mong đợi:** hiện thông báo lỗi (`role="alert"`)
- **Thực tế:** `/apps` không bao giờ hiện thông báo lỗi tải khi gặp 5xx — trạng thái rỗng thay chỗ nó
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `AppsBoard` không coi query lỗi là rỗng (`isEmpty={!isError && …}`), nên alert lỗi tải hiện thay cho empty state
