# OPS — Bug log

## Đang mở

_(không có)_

## Đã sửa

### BUG-OPS-01

- **TC:** TC-OPS-006 · **Requirement:** REQ-OPS-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-024
- **Bước tái hiện:** chạy test của TC-OPS-006 — `tests/api/ops/api-docs.api.ts:92`
- **Mong đợi:** mọi route đã mount đều có tài liệu
- **Thực tế:** `/api-docs.json` thiếu các path login-history, favourites, admin contacts và unlock (notifications đã có tài liệu từ #26)
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — thêm `swagger/` cho login-history (user + admin), favorite, unlock-account và các path `/admin/contacts*`, đăng ký trong `server/src/libs/swagger/openapi.ts`; spec `openapi.spec.ts` kiểm từng module và mọi `$ref`.

### BUG-OPS-02

- **TC:** TC-OPS-016, TC-ADMINAPPS-072 · **Requirement:** REQ-OPS-03, REQ-ADMINAPPS-06
- **Mức:** Trung bình · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Gộp:** BUG-ADMINAPPS-02 (cùng nguyên nhân, ghi trùng ở module admin-apps ngày 2026-10-14) — mã đó không dùng lại
- **Bước tái hiện:** chạy test của TC-OPS-016 — `tests/api/ops/error-envelope.api.ts`; hoặc
  `curl -X POST <api>/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":'`
- **Mong đợi:** 400 trong error envelope — body hỏng là lỗi của caller
- **Thực tế:** `express.json()` ném `SyntaxError` (status 400, type `entity.parse.failed`); `handleError` trong
  `server/src/middlewares/filters/error.filter.ts` chỉ nhận `ErrorResponse` / lỗi Mongoose nên rơi vào nhánh cuối và
  trả 500 `INTERNAL_SERVER_ERROR`. Body > 10mb (413 `entity.too.large`) đi cùng nhánh.
- **Đã sửa:** 2026-10-15, nhánh fix/open-bugs — `handleError` nhận lỗi body-parser (`expose` + status 4xx): giữ status (400 `MALFORMED_BODY`, 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_MEDIA_TYPE`) trong error envelope đã dịch, không lặp lại body; `requestId` và i18n chạy trước body parser trong `app.ts` để lỗi đó có `req.t` và `X-Request-Id`.
