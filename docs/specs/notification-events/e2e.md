# E2E — Notification Events

> Spec: `design.md` §9 (ma trận). Test: `client/e2e/notifications/notifications.e2e.ts` (viết lại),
> `client/e2e/frontend-cleanup/notifications-loading.e2e.ts` (cập nhật shape). Helper:
> `client/e2e/helpers/notifications.ts`.

## 1. Cách chạy

```bash
cd server && pnpm seed:clear          # xoá + seed lại (notification phải sạch)
cd client && E2E_BASE_URL=http://localhost:3100 pnpm e2e e2e/notifications/ --project=chromium
```

Worktree chạy server `:5100` + client `:3100` trên DB riêng `ducker-id-notification-events` để không
đụng dữ liệu dev của checkout chính.

## 2. Kịch bản

| # | Test | Kỹ thuật | Backend | Gate |
| --- | --- | --- | --- | --- |
| 1 | mặc định tab Tất cả, template seed, nhóm ngày, không ISO | — | thật | A+B |
| 2 | chưa đăng nhập → màn đăng nhập | — | thật | A+B |
| 4a | `category=bogus` → 400 | EP | thật (API) | A+B |
| 4b | link `https://…` / `//host` / `/\host` → không có `<a>` | EP | intercept | A+B |
| 4c | link nội bộ → `<a href>` đúng đường dẫn | EP | intercept | A+B |
| 5a | danh sách rỗng → empty state | — | intercept | A+B |
| 5b | tab Đã đọc rỗng riêng | EP | intercept | A+B |
| 5c | type lạ → hiện tên type, không lỗi JS | Error Guessing | intercept | A+B |
| 6a | 25 dòng: tải thêm → trang 2, nút biến mất, announce | BVA | intercept | A+B |
| 6b | đúng 20 dòng / 1 trang → không có nút | BVA | intercept | A+B |
| 6c | panel xin `limit=8` | BVA | intercept | A+B |
| 7a | tab × nhóm gộp một request; mặc định không gửi | DT | intercept | A+B |
| 7b | chip Bảo mật / Ứng dụng lọc đúng | EP | thật | A+B |
| 7c | tab Đã đọc chỉ còn dòng đã đọc + announce | — | thật | A+B |
| 8a | actor admin/self, reason device, số phút, không lộ enum | DT | thật | A+B |
| 8b | reason `both` → tên nước `Japan` | DT | intercept | A+B |
| 8c | dòng chưa đọc có nút mark-read, dòng đã đọc không | EP | intercept | A+B |
| 9a | vi: tab, nút, template, `trước`, không lọt tiếng Anh | — | thật | A+B |
| 9b | vi: `VN` → `Việt Nam` | — | intercept | A+B |
| 10a | list 500 → error state → Thử lại → có dữ liệu | ST | intercept | A+B |
| 10b | mark-read 500 → toast riêng, không toast 5xx chung, dòng giữ nguyên | Error Guessing | intercept | A+B |
| 10c | skeleton khi chờ, biến mất khi có dữ liệu | ST | intercept | A+B |
| 11a | mark Seed App 12 → unread −1, rời tab Chưa đọc | ST | **thật** | A only |
| 11b | mark Seed App 14 → còn đã đọc sau reload | ST | **thật** | A only |
| 11c | mở dòng chưa đọc → PATCH + điều hướng `link` | ST | intercept | A only |
| 11d | mở dòng đã đọc → không PATCH (invalid transition) | ST | intercept | A only |
| 11e | "Không phải bạn?" → `/profile` | — | intercept | A only |
| 11f | mark-all → Chưa đọc rỗng, badge biến mất | ST | intercept | A only |
| 11g | double-click mark-read → 1 PATCH | Error Guessing | intercept | A only |
| 11h | đăng nhập API từ thiết bị chưa thấy → `LOGIN_ANOMALY` thật, hiện trên trang | ST | **thật** | A only |
| 12a | Enter / Space trên nút mark-read | — | intercept | A+B |
| 12b | `article` có tên = tiêu đề; link focus được | — | intercept | A+B |
| 12c | chip có `aria-pressed` | — | intercept | A+B |
| 13a | badge 3; panel liệt kê + nút mark-all | — | intercept | A+B |
| 13b | badge ẩn khi 0; panel empty | — | intercept | A+B |
| 13c | panel error | — | intercept | A+B |
| 13d | mở item trong panel → đóng panel + điều hướng | — | intercept | A+B |
| 13e | "Xem tất cả" → `/notifications` | — | thật | A+B |

## 3. Không có trong E2E, đã kiểm cách khác

| Sự kiện | Vì sao không E2E | Đã kiểm |
| --- | --- | --- |
| `PASSWORD_CHANGED` | đổi mật khẩu tăng `tokenVersion` → refresh token của storageState chết, các test sau fail | unit (change-password, user) + gọi API thật 05.10.2026: đổi rồi đổi lại → 2 notification `actor: self` |
| `ACCOUNT_LOCKED` | khoá `user@test.com` 30 phút | unit (password-login strategy) |
| `APP_AVAILABLE` | cần app mới trong seed dùng chung với suite admin-apps | unit (web-app) + API thật: tạo app ẩn → bật → tắt → bật → user và admin nhận **đúng 1** |
| Badge tự cập nhật (polling 60s) | phải chờ 60s | cấu hình `refetchInterval` trong `useUnreadCount` |

## 4. Mutation & dọn dẹp

Không có API đánh dấu chưa đọc. 11a/11b tiêu thụ Seed App 12/14; 11h thêm một `LOGIN_ANOMALY` và một
dòng login history. Khôi phục: `cd server && pnpm seed:clear`. 11h duyệt một danh sách User-Agent cho tới
khi gặp tổ hợp trình duyệt/OS chưa từng đăng nhập — nếu mọi tổ hợp đã được dùng (DB chưa reseed sau nhiều
lần chạy) thì test báo rõ lý do.

Helper đăng nhập API luôn dùng **một** User-Agent cố định; lần đăng nhập đầu tiên của nó trên DB mới tự
sinh một `LOGIN_ANOMALY`, nên block mutation "làm nóng" thiết bị này (`warmUpHelperDevice`) trước khi đo
delta unread.

## 5. Kết quả

Xem cuối file — cập nhật sau mỗi lần chạy gate.

### 10.10.2026 — Gate A, toàn bộ suite

Worktree: server `:5100` (DB riêng `ducker-id-notification-events`, `pnpm seed`), client **production**
(`next build` + `next start -p 3100` — `next dev` từng làm máy hết RAM ở test 166/496),
`E2E_BASE_URL=http://127.0.0.1:3100`. Server Jest 81 suite / 601 test, lint + tsc hai phía sạch.

| | Kết quả |
| --- | --- |
| Toàn bộ (496) | 396 passed, 46 failed, 8 skipped, 46 did not run — 14,1 phút |
| So baseline `origin/main` (52 failed, dựng 05.10 trong phiên access-control) | 41 lỗi trùng baseline. 5 lỗi mới đều là môi trường, không phải code: |
| — `admin-entitlements/matrix` × 3 | app `Smoke Notify` sót trong DB riêng từ lần kiểm tay bật/tắt app → thêm một cột. `seed:clear` không xoá app ngoài seed; đã xoá tay |
| — `admin-users-reset/reset-action` × 1 | `POST /auth/login` → **429**: suite production chạy nhanh hơn 3 lần nên chạm rate limit đăng nhập 30 / 15 phút |
| — `notifications` › [DT] fills each template | lần đăng nhập đầu của trình duyệt E2E trên DB mới seed cũng là thiết bị Chrome/Windows lạ → câu trùng câu seed, `getByText` strict thấy 2 phần tử. Sửa test bằng `.first()` (`c0c4d54b`) |
| Chạy lại `notifications/`, `admin-entitlements/`, `admin-users-reset/reset-action` sau 15 phút | **85 passed, 3 skipped, 0 failed** |
