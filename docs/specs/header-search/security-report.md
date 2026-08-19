# Header Search — Security Report

**Verdict: ✅ PASS** (no Critical/High; no new attack surface)

**Scope**: FE-only, read-only search widget in `AppHeader`. Reuses existing `/apps?search=` endpoint. No BE change, no auth/authz change, no data mutation, no new env/secret.

## Trục rà soát

| Trục | Đánh giá |
| --- | --- |
| Input validation | Query người dùng → truyền làm param `search` tới `/apps` (endpoint đã tồn tại, đã validate/escape phía BE, dùng chung với trang Apps). Trim trước khi search. Không eval/không dựng query BE ở FE. |
| XSS / output encoding | Kết quả render qua React (`displayName`/`category` auto-escaped). Query KHÔNG được reflect dưới dạng HTML. Không dùng `dangerouslySetInnerHTML`. |
| Open redirect / tabnabbing | Mở app qua `window.open(homeUrl, "_blank", "noopener,noreferrer")` — có `noopener,noreferrer` (chống reverse tabnabbing). `homeUrl` là dữ liệu app do admin cấu hình (không phải input user), pattern y hệt `AppCard` đã tồn tại → không phải bề mặt mới. |
| URL param injection | "View All" điều hướng `/apps?search=<q>` với `encodeURIComponent` → không cho phép chèn param khác. |
| AuthN/AuthZ | Không đổi. Header chỉ render trong private routes (sau `AuthGuardLayout`). Search khả dụng cho mọi user đã đăng nhập (không role-gate mới). |
| Data exposure | Chỉ hiển thị apps mà endpoint `/apps` (đã phân quyền BE) trả về cho user hiện tại. Không lộ field nhạy cảm. |
| Injection (NoSQL/etc.) | N/A ở FE; BE `/apps?search=` xử lý — không thay đổi trong feature này. |

## Kết luận

Feature không mở rộng bề mặt tấn công (tái dùng endpoint + pattern mở app sẵn có, không đụng auth/data write). Không có finding cần fix. Không chặn PR.
