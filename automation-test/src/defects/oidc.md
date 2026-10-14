# OIDC — Bug log

## Đang mở

| Bug                         | Mức        | TC          | Tóm tắt                                                                                               |
| --------------------------- | ---------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| [BUG-OIDC-01](#bug-oidc-01) | Trung bình | TC-OIDC-041 | `/oauth/userinfo` chấp nhận access token first-party của Ducker ID (kiểm issuer, không kiểm audience) |
| [BUG-OIDC-02](#bug-oidc-02) | Trung bình | TC-OIDC-040 | Gửi `id_token` làm Bearer tới `/oauth/userinfo` → 500 `server_error`                                  |
| [BUG-OIDC-03](#bug-oidc-03) | Thấp       | TC-OIDC-031 | Không kiểm độ dài `code_verifier` (42 và 129 ký tự vẫn đổi được)                                      |
| [BUG-OIDC-04](#bug-oidc-04) | Thấp       | TC-OIDC-039 | Lỗi của `/oauth/userinfo` là 400 và không có `WWW-Authenticate`                                       |
| [BUG-OIDC-05](#bug-oidc-05) | Thấp       | TC-OIDC-044 | `/oauth/logout` xoá `sid` với `Max-Age=604800` — một cookie rỗng sống 7 ngày                          |
| [BUG-OIDC-06](#bug-oidc-06) | Thấp       | TC-OIDC-054 | `/oauth/token` đổi được code khi request không gửi `redirect_uri`                                     |

### BUG-OIDC-01

- **TC:** TC-OIDC-041 · **Requirement:** REQ-OIDC-07
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-008
- **Bước tái hiện:** chạy test của TC-OIDC-041 — `tests/api/oidc/userinfo.api.ts`
- **Mong đợi:** 401 với token không được cấp cho một OAuth client
- **Thực tế:** `/oauth/userinfo` chấp nhận access token first-party của Ducker ID (kiểm issuer, không kiểm audience)

### BUG-OIDC-02

- **TC:** TC-OIDC-040 · **Requirement:** REQ-OIDC-07
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-009
- **Bước tái hiện:** chạy test của TC-OIDC-040 — `tests/api/oidc/userinfo.api.ts`
- **Mong đợi:** 401 invalid_token
- **Thực tế:** Gửi `id_token` làm Bearer tới `/oauth/userinfo` → 500 `server_error`

### BUG-OIDC-03

- **TC:** TC-OIDC-031 · **Requirement:** REQ-OIDC-02
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-021
- **Bước tái hiện:** chạy test của TC-OIDC-031 — `tests/api/oidc/token.api.ts`
- **Mong đợi:** 400 khi ngoài khoảng 43–128 (RFC 7636 §4.1)
- **Thực tế:** Không kiểm độ dài `code_verifier` (42 và 129 ký tự vẫn đổi được)

### BUG-OIDC-04

- **TC:** TC-OIDC-039 · **Requirement:** REQ-OIDC-07
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-022
- **Bước tái hiện:** chạy test của TC-OIDC-039 — `tests/api/oidc/userinfo.api.ts`
- **Mong đợi:** 401 invalid_token (RFC 6750 §3.1)
- **Thực tế:** Lỗi của `/oauth/userinfo` là 400 và không có `WWW-Authenticate`

### BUG-OIDC-05

- **TC:** TC-OIDC-044 · **Requirement:** REQ-OIDC-09
- **Mức:** Thấp · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-023
- **Bước tái hiện:** chạy test của TC-OIDC-044 — `tests/api/oidc/logout.api.ts`
- **Mong đợi:** cookie hết hạn
- **Thực tế:** `/oauth/logout` xoá `sid` với `Max-Age=604800` — một cookie rỗng sống 7 ngày

### BUG-OIDC-06

- **TC:** TC-OIDC-054 · **Requirement:** REQ-OIDC-08
- **Mức:** Thấp · **Phát hiện:** 2026-10-14 (đọc code, chưa chạy)
- **Bước tái hiện:** chạy test của TC-OIDC-054 — `tests/api/oidc/token.api.ts`
- **Mong đợi:** 400 `invalid_request` / `invalid_grant`, không có token — RFC 6749 §4.1.3 bắt buộc `redirect_uri` ở
  token request khi authorize request đã gửi nó
- **Thực tế:** `services/exchange-token.ts` chỉ so `redirect_uri` khi `body.redirect_uri` có giá trị, nên bỏ hẳn tham
  số thì code vẫn đổi ra token (200)

## Đã sửa

_(chưa có)_
