# PASSWORD — Bug log

## Đang mở

| Bug                                 | Mức        | TC              | Tóm tắt                                                                                                                                                                                  |
| ----------------------------------- | ---------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BUG-PASSWORD-01](#bug-password-01) | Trung bình | TC-PASSWORD-045 | Việc buộc đổi mật khẩu chỉ được thực thi bởi gate phía client; session dùng mật khẩu tạm vẫn gọi được API (vd favourites)                                                                |
| [BUG-PASSWORD-02](#bug-password-02) | Trung bình | TC-PASSWORD-056 | Email magic link quên mật khẩu trỏ tới `/reset-password?…`, trang 404; route của client là `/forgot-password/reset`                                                                      |
| [BUG-PASSWORD-03](#bug-password-03) | Thấp       | TC-PASSWORD-063 | **Chỉ ở dev.** Trang reset verify magic link trong mount effect không có guard chạy-một-lần; React StrictMode (chỉ `next dev`) gọi verify hai lần → "link expired" hoặc ra token thứ hai |
| [BUG-PASSWORD-04](#bug-password-04) | Thấp       | TC-PASSWORD-024 | Lỗi của API đổi mật khẩu là key thô (`errors.wrongCurrentPassword`) — i18n của server không bao giờ nạp namespace `changePassword`                                                       |
| [BUG-PASSWORD-05](#bug-password-05) | Thấp       | TC-PASSWORD-062 | Card 2FA "unavailable" ở trang quên mật khẩu không có accessible name hay trạng thái disabled                                                                                            |

### BUG-PASSWORD-01

- **TC:** TC-PASSWORD-045 · **Requirement:** REQ-PASSWORD-04
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-003
- **Bước tái hiện:** chạy test của TC-PASSWORD-045 — `tests/api/password/admin-reset.api.ts:71`
- **Mong đợi:** API từ chối mọi thứ trừ change-password khi đang `mustChangePassword`
- **Thực tế:** Việc buộc đổi mật khẩu chỉ được thực thi bởi gate phía client; session dùng mật khẩu tạm vẫn gọi được API (vd favourites)

### BUG-PASSWORD-02

- **TC:** TC-PASSWORD-056 · **Requirement:** REQ-PASSWORD-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-004
- **Bước tái hiện:** chạy test của TC-PASSWORD-056 — `tests/e2e/password/forgot-password.e2e.ts:349`
- **Mong đợi:** link mở trang reset
- **Thực tế:** Email magic link quên mật khẩu trỏ tới `/reset-password?…`, trang 404; route của client là `/forgot-password/reset`

### BUG-PASSWORD-03

- **TC:** TC-PASSWORD-063 · **Requirement:** REQ-PASSWORD-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-005
- **Bước tái hiện:** chạy test của TC-PASSWORD-063 — `tests/e2e/password/forgot-password.e2e.ts:314`
- **Mong đợi:** mỗi link chỉ verify một lần
- **Thực tế:** **Chỉ ở dev.** Trang reset verify magic link trong mount effect không có guard chạy-một-lần; React StrictMode (chỉ `next dev`) gọi verify hai lần → "link expired" hoặc ra token thứ hai

### BUG-PASSWORD-04

- **TC:** TC-PASSWORD-024 · **Requirement:** REQ-PASSWORD-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-018
- **Bước tái hiện:** chạy test của TC-PASSWORD-024 — `tests/api/password/change-password.api.ts:228`
- **Mong đợi:** message đã được dịch
- **Thực tế:** Lỗi của API đổi mật khẩu là key thô (`errors.wrongCurrentPassword`) — i18n của server không bao giờ nạp namespace `changePassword`

### BUG-PASSWORD-05

- **TC:** TC-PASSWORD-062 · **Requirement:** REQ-PASSWORD-01
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-031
- **Bước tái hiện:** chạy test của TC-PASSWORD-062 — `tests/e2e/password/forgot-password.e2e.ts:64`
- **Mong đợi:** aria-label / aria-disabled tới được DOM
- **Thực tế:** Card 2FA "unavailable" ở trang quên mật khẩu không có accessible name hay trạng thái disabled

## Đã sửa

_(chưa có)_
