# AUTHZ — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-AUTHZ-02

- **TC:** TC-AUTHZ-018 · **Requirement:** REQ-AUTHZ-02
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-010
- **Bước tái hiện:** chạy test của TC-AUTHZ-018 — "A non-admin is kept out of the admin console shell" trong `tests/e2e/authz/admin-routes-denied.e2e.ts`
- **Mong đợi:** non-admin bị redirect / thấy trang từ chối
- **Thực tế:** Không có guard vai trò phía client trên `/admin/*` — non-admin thấy toàn bộ admin shell (dữ liệu vẫn 403)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — thêm `AdminGuardLayout` bọc route group `(admin)`: non-admin bị `router.replace` về trang chủ, admin shell không render; TC-AUTHZ-001 cập nhật theo (redirect thay cho trạng thái rỗng).

### BUG-AUTHZ-03

- **TC:** TC-AUTHZ-016 · **Requirement:** REQ-AUTHZ-03
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-029
- **Bước tái hiện:** chạy test của TC-AUTHZ-016 — "The landing page links to the categories area" trong `tests/e2e/authz/admin-landing.e2e.ts`
- **Mong đợi:** mỗi khu vực admin có một card
- **Thực tế:** Trang landing `/admin` không có card Categories (5 trên 6 khu vực)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — thêm card Categories (`/admin/categories`) vào `ADMIN_DASHBOARD_CARDS` + copy en/vi; TC-AUTHZ-014 nay có 6 card.

### BUG-AUTHZ-01

- **TC:** TC-AUTHZ-012, TC-OPS-012 · **Requirement:** REQ-AUTHZ-02
- **Mức:** Cao · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-001
- **Bước tái hiện:** chạy test của TC-AUTHZ-012, TC-OPS-012 — "The Bull Board queue dashboard requires an admin" trong `tests/api/authz/admin-endpoints.api.ts` và test của TC-OPS-012 trong `tests/api/ops/queues.api.ts` (`pnpm test -g "@TC-OPS-012"`)
- **Mong đợi:** chỉ admin truy cập được (hoặc không mount ngoài môi trường development)
- **Thực tế:** Bull Board `/admin/queues` trên API không có xác thực; JSON API của nó trả các email job, kể cả OTP và mật khẩu tạm dạng plaintext
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `queue.loader.ts` mount Bull Board sau `adminGuard` — guest 401 `AUTH_MISSING_TOKEN`, non-admin 403 `AUTH_ADMIN_ONLY`. Hệ quả: dashboard chỉ mở được bằng request có Bearer của admin (trình duyệt không tự gửi header này).
