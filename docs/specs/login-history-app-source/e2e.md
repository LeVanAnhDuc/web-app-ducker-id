# E2E — login-history-app-source

Specs:

- `client/e2e/login-history/login-history-app-source.e2e.ts` (project `chromium`, user thường)
- `client/e2e/admin-login-history/admin-login-history-app-source.e2e.ts` (project `admin`)
- Stub cũ trong `my-login-history.e2e.ts` và `admin-login-history-detail.e2e.ts` được thêm `source` / `app` / `interactive`

## Kết quả chạy 04.10.2026

Worktree chạy server `:5100` + client `:3100` (`E2E_BASE_URL=http://localhost:3100`), dùng chung MongoDB local `ducker-id`.

| Spec | Kết quả |
| --- | --- |
| `login-history-app-source` — 5 case stub (render, filter ↔ query, reload, empty, vi) | ✅ pass |
| `login-history-app-source` — 2 case real SSO (`client_idms_core`, `client_analytics_2b7d`) | ❌ 401 `invalid_client`. DB local **chưa seed**: `web_apps` chỉ có app thật "Tinh tien cau long", không có client seed |
| `admin-login-history-app-source` — 3 case | ✅ pass |
| `my-login-history` — 2 case cũ | ✅ pass |
| `admin-login-history-detail` — 6 case tìm button "View" | ❌ **lỗi có sẵn trên `main`** (chạy lại trên `:3000` = main cũng fail). Bảng đã render dòng dạng link "View details for …" từ đợt list refactor, test vẫn tìm `button`. Ngoài phạm vi feature này |

Tổng: 26 pass / 8 fail. Không fail nào do thay đổi của feature.

## Thay cho 2 case real SSO

Đã kiểm tay luồng thật với client có sẵn trong DB: gọi `GET /oauth/authorize` qua `:3100` bằng cookie `sid` của `user@test.com`.
Kết quả là 302 về `http://localhost:5173/?code=…`, và `login_histories` có dòng mới:
`method = sso`, `status = success`, `source = oauth`, `webAppId = 6ab746dc…`, `clientName = "Tinh tien cau long"`, `interactive = false`.

Không chạy `pnpm seed` trên DB local, vì sẽ đụng vào dữ liệu thật (app badminton đã đăng ký). Muốn chạy 2 case
real SSO thì seed trên một DB riêng (`DB_NAME` khác) rồi chạy:

```bash
cd client && pnpm e2e e2e/login-history/login-history-app-source.e2e.ts --project=chromium
```

## Cập nhật 04.10.2026: gỡ filter "Kiểu đăng nhập"

- Bỏ case "signIn filter maps to the interactive query param" (user) và "signIn=interactive" (admin).
- Thêm "the default list sends no interactive filter and shows silent SSO" và "method = SSO sends method=sso and no interactive filter".
- Hai case real SSO giờ kiểm ở `/login-history?method=sso` thay vì `?signIn=silent`.
