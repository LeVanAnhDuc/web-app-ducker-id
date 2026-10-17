# ADMINAPPS — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-ADMINAPPS-01

- **TC:** TC-ADMINAPPS-016 · **Requirement:** REQ-ADMINAPPS-01
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-027
- **Bước tái hiện:** chạy test của TC-ADMINAPPS-016 — `tests/e2e/admin-apps/list.e2e.ts`
- **Mong đợi:** trạng thái rỗng dành cho tìm kiếm không khớp
- **Thực tế:** tìm kiếm không khớp trên `/admin/apps` lại hiện "No apps registered yet."
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `AdminAppsTable` chỉ truyền `emptyTitle`/`emptyDescription` "registry rỗng" khi không có bộ lọc; có tìm kiếm/bộ lọc thì `PageEmptyState` hiện "nothing matched" mặc định.
