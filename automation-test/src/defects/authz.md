# AUTHZ — Bug log

## Đang mở

| Bug                           | Mức        | TC                       | Tóm tắt                                                                                                                            |
| ----------------------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [BUG-AUTHZ-01](#bug-authz-01) | Cao        | TC-AUTHZ-012, TC-OPS-012 | Bull Board `/admin/queues` trên API không có xác thực; JSON API của nó trả các email job, kể cả OTP và mật khẩu tạm dạng plaintext |
| [BUG-AUTHZ-02](#bug-authz-02) | Trung bình | TC-AUTHZ-018             | Không có guard vai trò phía client trên `/admin/*` — non-admin thấy toàn bộ admin shell (dữ liệu vẫn 403)                          |
| [BUG-AUTHZ-03](#bug-authz-03) | Thấp       | TC-AUTHZ-016             | Trang landing `/admin` không có card Categories (5 trên 6 khu vực)                                                                 |

### BUG-AUTHZ-01

- **TC:** TC-AUTHZ-012, TC-OPS-012 · **Requirement:** REQ-AUTHZ-02
- **Mức:** Cao · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-001
- **Bước tái hiện:** chạy test của TC-AUTHZ-012, TC-OPS-012 — "The Bull Board queue dashboard requires an admin" trong `tests/api/authz/admin-endpoints.api.ts` và test của TC-OPS-012 trong `tests/api/ops/queues.api.ts` (`pnpm test -g "@TC-OPS-012"`)
- **Mong đợi:** chỉ admin truy cập được (hoặc không mount ngoài môi trường development)
- **Thực tế:** Bull Board `/admin/queues` trên API không có xác thực; JSON API của nó trả các email job, kể cả OTP và mật khẩu tạm dạng plaintext

### BUG-AUTHZ-02

- **TC:** TC-AUTHZ-018 · **Requirement:** REQ-AUTHZ-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-010
- **Bước tái hiện:** chạy test của TC-AUTHZ-018 — "A non-admin is kept out of the admin console shell" trong `tests/e2e/authz/admin-routes-denied.e2e.ts`
- **Mong đợi:** non-admin bị redirect / thấy trang từ chối
- **Thực tế:** Không có guard vai trò phía client trên `/admin/*` — non-admin thấy toàn bộ admin shell (dữ liệu vẫn 403)

### BUG-AUTHZ-03

- **TC:** TC-AUTHZ-016 · **Requirement:** REQ-AUTHZ-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-029
- **Bước tái hiện:** chạy test của TC-AUTHZ-016 — "The landing page links to the categories area" trong `tests/e2e/authz/admin-landing.e2e.ts`
- **Mong đợi:** mỗi khu vực admin có một card
- **Thực tế:** Trang landing `/admin` không có card Categories (5 trên 6 khu vực)

## Đã sửa

_(chưa có)_
