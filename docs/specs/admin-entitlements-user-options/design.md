# Design — AdminEntitlements: multi-user picker + bulk app-access matrix

> Feature: trang `/admin/entitlements`. Admin **tìm + chọn nhiều user** (server-side search), rồi **grant/revoke quyền truy cập app cho tất cả user đã chọn cùng lúc** (bulk). Slice này: **UI + logic chạy trên MOCK** cho phần entitlement; **user search dùng API thật**. Endpoint entitlement thật (bulk grant/revoke persist) để slice sau.

## 1. Bối cảnh

- Trang FE `client/src/views/AdminEntitlements/` đã dựng (single-select + mock). Redesign sang multi-select + bulk theo yêu cầu user.
- `GET /admin/users` (module user) **đã có sẵn**: hỗ trợ `search` (regex fullName/email, escaped), `limit`, phân trang, trả `AdminUser` (gồm `role`). → picker tái dùng endpoint này (`?search=&limit=20`), **không cần BE mới**.

## 2. Scope

**Trong scope (slice này)**
- FE: picker **multi-select server-side search** (tái dùng `getAdminUsers({search, limit:20})`, debounce 300ms, chips + popover kết quả).
- FE: **bulk app-access matrix** trên **mock** entitlement data — mỗi app tính trạng thái tổng hợp across N user đã chọn (All granted / M/N granted / Not granted / Role required), nút **Grant all** / **Revoke all** áp cho tất cả user đã chọn.
- Mock `@/mocks/AdminEntitlements` rework sang bulk; user search thật.

**Ngoài scope (slice sau)**
- Endpoint entitlement thật (BE `entitlement` module: bulk grant/revoke persist + list). Slice này mock.
- Seeder, notification grant/revoke, entitlement-gated launch.

## 3. Quyết định thiết kế (DR)

- **DR-1 — Tái dùng `/admin/users` search, KHÔNG endpoint load-all**: picker server-side search (gõ → 20 kết quả), không load hết user → scale tốt khi đông user. `/admin/users?search=&limit=20` đã đủ (có search + role). Endpoint `/admin/users/options` (ý tưởng slice cũ) bị **huỷ** (dead code). BE **không đổi**.
- **DR-2 — Multi-select = BULK**: chọn N user → 1 thao tác grant/revoke 1 app áp cho cả N. Ma trận hiển thị trạng thái tổng hợp per-app (All / partial M/N / None), disable khi có user thiếu role (INSUFFICIENT_ROLE).
- **DR-3 — Selected users giữ ở local state** (`AdminUser[]`), không URL — multi-select + resolve id→user phức tạp, mock scope không cần persist. (Có thể nâng lên URL ở slice sau nếu cần share link.)
- **DR-4 — Entitlement trên MOCK slice này**: matrix + grant/revoke chạy client-side mock; user search thật. Tách để giao picker+UX sớm; persist thật ở slice sau.

## 4. API (tái dùng, không đổi)

```
GET /api/v1/admin/users?search=<q>&limit=20   (authGuard + adminGuard, đã có)
  → { items: AdminUser[], meta }   // AdminUser gồm role → tính INSUFFICIENT_ROLE
```

## 5. UI (mock đã user duyệt)

`docs/ui-designs/admin-entitlements-user-options/picker-bulk-matrix.html` (light+dark, đã duyệt §1.5). Gồm: picker field (search + chips × + popover user rows check/plus) + card "App access" (5 app rows: All granted/Revoke all · M/N granted/Grant all · Not granted/Grant all · Role required/disabled) + empty state "No users selected". Bám design-system `.claude/uiux/` (token, lucide icon, copy).

## 6. Security

**N/A (skip)** — không thêm bề mặt tấn công BE: picker tái dùng `/admin/users` (đã review + ship), matrix + grant/revoke là **mock client-side** slice này. Khi wire endpoint entitlement thật (slice sau) → chạy security review lúc đó.

## 7. E2E — xem `e2e.md`

Trang chỉ persist thật khi endpoint entitlement được wire (slice sau) → **E2E test author + chạy ở slice đó**. Slice này (mock) phủ bằng green checks FE (lint + build) + review.
