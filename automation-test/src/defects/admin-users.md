# ADMINUSERS — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-ADMINUSERS-01

- **TC:** TC-ADMINUSERS-019 · **Requirement:** REQ-ADMINUSERS-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-015
- **Bước tái hiện:** chạy test của TC-ADMINUSERS-019 — `tests/e2e/admin-users/list.e2e.ts:505`
- **Mong đợi:** trạng thái lỗi "Could not load users…"
- **Thực tế:** Danh sách Admin Users render trạng thái rỗng "No users match" khi tải thất bại
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `AdminUsersTable` đọc `isError`: lỗi thì không coi là rỗng và hiện `adminUsers.table.error` (role="alert") thay cho bảng.

### BUG-ADMINUSERS-02

- **TC:** TC-ADMINUSERS-021 · **Requirement:** REQ-ADMINUSERS-01
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-030
- **Bước tái hiện:** chạy test của TC-ADMINUSERS-021 — `tests/e2e/admin-users/list.e2e.ts:523`
- **Mong đợi:** thông báo cho screen reader
- **Thực tế:** Danh sách Admin Users không bao giờ thông báo đã tải xong (`adminUsers.announce.loaded` không được dùng)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `AdminUsersTable` gắn ghost `TableLoadedAnnouncer` với `meta.total` và `adminUsers.announce.loaded`.

### BUG-ADMINUSERS-03

- **TC:** TC-ADMINUSERS-065, TC-ADMINUSERS-066 · **Requirement:** REQ-ADMINUSERS-02, REQ-ADMINUSERS-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-ADMINUSERS-065 / TC-ADMINUSERS-066 — `tests/e2e/admin-users/lock-unlock.e2e.ts:435`,
  `tests/e2e/admin-users/reset-password.e2e.ts:337`: mở menu dòng → "Lock account" / "Reset password" → "Cancel".
- **Mong đợi:** focus quay về nút "User actions" của dòng (thiết kế `docs/specs/admin-lock-unlock-user/design.md` và
  `docs/specs/admin-reset-password/design.md`, mục Accessibility: "focus về trigger khi đóng").
- **Thực tế:** dialog được mở từ một `DropdownMenuItem` đã unmount (`UserRowActions` → `setLockTarget` /
  `setResetTarget`), không có `DialogTrigger`, nên Radix trả focus về `<body>`. Trước đây ghi là tech debt "không
  assert" trong `decisions/admin-users.md`; từ 2026-10-14 coi là bug theo tài liệu (Q3).
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `UserRowActions` truyền nút menu của dòng khi chọn item; bảng ghi nhớ nó bằng `useReturnFocus` và ba dialog trả focus về đó qua `onCloseAutoFocus`.

### BUG-ADMINUSERS-04

- **TC:** TC-ADMINUSERS-063, TC-ADMINLOGINHISTORY-036 · **Requirement:** REQ-ADMINUSERS-01, REQ-ADMINUSERS-02, REQ-ADMINUSERS-03, REQ-ADMINLOGINHISTORY-01, REQ-ADMINLOGINHISTORY-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (chạy thật)
- **Bước tái hiện:** chạy test của TC-ADMINUSERS-063 — `tests/api/admin-users/users.api.ts` ("success messages"):
  `GET /admin/users` với `Accept-Language: en`.
- **Mong đợi:** `message` là câu đã dịch theo `Accept-Language` ("Users retrieved successfully.") — `CLAUDE.md` của
  repo: "error and success text is an i18next key translated per request (`req.t`)".
- **Thực tế:** `message` là `user:success.getAdminUsers`. Key có trong `server/src/i18n/locales/{en,vi}/user.json` và
  namespace `user` được nạp; nguyên nhân là `SuccessResponse.send` (`server/src/common/responses/index.ts`) ghi
  thẳng `this.message` mà không gọi `req.t`, nên **mọi** response thành công của mọi module đều trả key thô (vd
  `GET /apps/categories` → `category:success.list`). Response lỗi thì được dịch (`error.filter.ts`).
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `SuccessResponse.send` (`server/src/common/responses/index.ts`) dịch `message` bằng `req.t` như error filter, nên mọi response thành công của mọi module trả câu đã dịch theo `Accept-Language`.
