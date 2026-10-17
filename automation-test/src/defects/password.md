# PASSWORD — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-PASSWORD-01

- **TC:** TC-PASSWORD-045 · **Requirement:** REQ-PASSWORD-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-003
- **Bước tái hiện:** chạy test của TC-PASSWORD-045 — `tests/api/password/admin-reset.api.ts:71`
- **Mong đợi:** API từ chối mọi thứ trừ change-password khi đang `mustChangePassword`
- **Thực tế:** Việc buộc đổi mật khẩu chỉ được thực thi bởi gate phía client; session dùng mật khẩu tạm vẫn gọi được API (vd favourites)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — access token của phiên mật khẩu tạm mang claim `mustChangePassword: true`; `authGuard` từ chối nó (403 `AUTH_PASSWORD_CHANGE_REQUIRED`), chỉ `PATCH /auth/change-password` và `POST /auth/logout` dùng `passwordChangeAuthGuard` cho qua.

### BUG-PASSWORD-02

- **TC:** TC-PASSWORD-056 · **Requirement:** REQ-PASSWORD-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-004
- **Bước tái hiện:** chạy test của TC-PASSWORD-056 — `tests/e2e/password/forgot-password.e2e.ts:349`
- **Mong đợi:** link mở trang reset
- **Thực tế:** Email magic link quên mật khẩu trỏ tới `/reset-password?…`, trang 404; route của client là `/forgot-password/reset`
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — link trong email magic link quên mật khẩu đổi thành `${CLIENT_URL}/forgot-password/reset?email=…&token=…&method=magic-link`.

### BUG-PASSWORD-04

- **TC:** TC-PASSWORD-024 · **Requirement:** REQ-PASSWORD-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-018
- **Bước tái hiện:** chạy test của TC-PASSWORD-024 — `tests/api/password/change-password.api.ts:228`
- **Mong đợi:** message đã được dịch
- **Thực tế:** Lỗi của API đổi mật khẩu là key thô (`errors.wrongCurrentPassword`) — i18n của server không bao giờ nạp namespace `changePassword`
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — namespace `changePassword` được nạp (`ns` trong `server/src/i18n/config.ts`, cùng bản sửa BUG-ADMINLOGINHISTORY-03).

### BUG-PASSWORD-03

- **TC:** TC-PASSWORD-063 · **Requirement:** REQ-PASSWORD-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-005
- **Bước tái hiện:** chạy test của TC-PASSWORD-063 — `tests/e2e/password/forgot-password.e2e.ts:314`
- **Mong đợi:** mỗi link chỉ verify một lần
- **Thực tế:** **Chỉ ở dev.** Trang reset verify magic link trong mount effect không có guard chạy-một-lần; React StrictMode (chỉ `next dev`) gọi verify hai lần → "link expired" hoặc ra token thứ hai
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `useForgotPasswordReset` chỉ verify magic link một lần (ref guard sống qua lần remount của StrictMode)

### BUG-PASSWORD-05

- **TC:** TC-PASSWORD-062 · **Requirement:** REQ-PASSWORD-01
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-031
- **Bước tái hiện:** chạy test của TC-PASSWORD-062 — `tests/e2e/password/forgot-password.e2e.ts:64`
- **Mong đợi:** aria-label / aria-disabled tới được DOM
- **Thực tế:** Card 2FA "unavailable" ở trang quên mật khẩu không có accessible name hay trạng thái disabled
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — aria-label / aria-disabled đặt trên một `div role="group"` bên trong `FadeSlideLeft`
