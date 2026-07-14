# E2E — AdminEntitlements multi-user picker + bulk matrix

> Scenario Matrix (rubric `e2e-scenario-coverage`). Slice này entitlement chạy **mock** (chưa persist thật) → **E2E test author + chạy ở slice wiring endpoint entitlement thật**, khi trang hoạt-động end-to-end. Matrix dưới đây định sẵn phạm vi cho slice đó.

## Tiền đề
- Auth admin (`E2E_USER_EMAIL/PASSWORD` = admin) qua `auth.setup.ts`. Route `/admin/entitlements`.
- User search dùng API thật `GET /admin/users?search=&limit=20`.

## Scenario Matrix

| # | Nhóm | Scenario | Trạng thái |
|---|------|----------|-----------|
| 1 | Happy | Admin gõ tên → popover ~20 kết quả; chọn nhiều user → chips hiện; matrix hiện app + trạng thái tổng hợp `[EP]` | ✅ (slice wiring thật) |
| 2 | AuthN | Chưa login → `/admin/entitlements` redirect `/login` | ✅ |
| 3 | AuthZ | role=user gọi `/admin/users` → 403; route admin-only | ✅ |
| 4 | Validation | search rỗng → không gọi (enabled khi có query); `[error-guessing]` ký tự đặc biệt escaped | ✅ |
| 5 | Empty/null | 0 user chọn → empty state "No users selected"; search không kết quả → popover empty | ✅ |
| 6 | Boundary/pagination | `[BVA]` search trả >20 → footer "Showing 20 — refine"; chọn 1 vs nhiều user (bulk count đúng) | ✅ |
| 7 | Filter/search | Debounce 300ms; gõ kỹ hơn → kết quả hẹp hơn; bỏ chip → matrix cập nhật | ✅ |
| 8 | Data render | Chip = tên + ×; matrix mỗi app: badge All/M-N/Not granted đúng theo mock; role pill USER/ADMIN | ✅ |
| 9 | i18n (en+vi) | `/en` + `/vi`: placeholder, "App access", "Changes apply to N users", nhãn status, Grant/Revoke all dịch đúng | ✅ |
| 10 | Error/loading | `/admin/users` 500 → popover không crash; loading skeleton | ✅ |
| 11 | Mutation safety | Grant all / Revoke all áp đúng N user; Revoke all confirm trước; **INSUFFICIENT_ROLE → nút disabled** (không mutate). Gate = A only (mutation) | ✅ (slice wiring thật) |
| 12 | A11y | combobox `aria-expanded`, option rows; `useAnnounce` result count + selection + grant/revoke; keyboard | ✅ |

## Deferral
- Slice hiện tại entitlement **mock** (không persist) → E2E assert grant/revoke thật chưa có nghĩa. Author + chạy dual-gate ở slice wiring endpoint entitlement thật. Slice này phủ: green checks FE (lint+build) + code review.
