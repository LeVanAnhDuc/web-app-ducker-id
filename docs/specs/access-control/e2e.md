# E2E — access-control

> 05.10.2026 · Ma trận gốc: `design.md` §10. Chạy trên worktree: server `:5400` (DB riêng
> `ducker-id-access-control`, đã `pnpm seed`), client `:3400`,
> `E2E_BASE_URL=http://127.0.0.1:3400` (lý do dùng IPv4: `e2e-bugs.md`, ghi chú môi trường).

## File

| File | Project | Nội dung |
| --- | --- | --- |
| `e2e/admin-entitlements/matrix.e2e.ts` | `admin` | Reconcile toàn bộ suite cũ sang API thật: bỏ trạng thái "Role required" / ô disabled, thêm marker ngoại lệ, persist, xoá override, double-submit, lỗi 500, i18n marker |
| `e2e/admin-entitlements/admin-sso.e2e.ts` | `admin` | #11c — admin SSO vào app `[user]` |
| `e2e/web-app-access/launcher.e2e.ts` | `chromium` | #3 (API 401/403), #7, #11b — revoke / grant thấy ở `/apps`, search, favorites, `/oauth/authorize` |
| `e2e/helpers/entitlements.ts` | — | setup/teardown qua admin API; `clearOverrides` đưa user về mặc định theo role |
| `e2e/admin-entitlements/picker.e2e.ts` | `admin` | Không đổi (picker không phụ thuộc mock entitlement) — vẫn xanh |

Mọi test ghi DB chạy `serial` và gọi `clearOverrides(user@test.com)` ở `afterEach` / `afterAll`.

**Thứ tự chạy (10.10.2026):** từ §9 mỗi lần revoke / grant ở launcher ghi notification thật cho
`user@test.com` (~11 dòng mỗi lượt), mà suite `notifications/` neo vào các dòng seed nằm ở trang đầu
(20 dòng) của chính user đó. Đặt ở `access-control/` thì launcher chạy trước và đẩy các mốc sang trang
hai, nên file được chuyển sang `e2e/web-app-access/` — sort sau `notifications/`, và với `workers: 1`
cũng chạy sau. Nhóm notification của launcher đăng nhập API **một lần** rồi dùng lại token:
`fetchNotifications` đăng nhập mỗi lần gọi, nằm trong `expect.poll` sẽ đốt hết rate limit đăng nhập
(30 / 15 phút) của các suite chạy sau.

## Kết quả

| Gate | Kết quả |
| --- | --- |
| A — feature suites (`admin-entitlements/` + `access-control/`) | **46 passed**, 2 skipped (`fixme` có chủ đích: non-admin page denial thuộc `admin-authz/`) |
| A — toàn bộ suite (499 test) | 415 passed, 51 failed, 8 skipped, 25 did not run. **51 lỗi đều fail y hệt trên `origin/main`** (baseline worktree, DB mới seed, cùng môi trường: 52 failed — tập lỗi của feature là tập con). Không có regression. Danh sách: `change-password` (1), `header-search` (9), `notifications` (1), `team-removal` (5), `unified-list/admin-users` (14 — chạy trong project `chromium` nên không bao giờ có quyền admin), `admin-apps` (1), `admin-categories` (1), `admin-login-history-detail` (6), `admin-users-lock` (8), `admin-users-reset` (5). |
| B — duyệt UI thật (Playwright capture, read-only) | PASS — `/admin/entitlements` en + vi: marker brass hai chiều với tooltip đúng nghĩa, ô "đủ/thiếu role" đều là checkbox ở edit mode, subtitle mới, **0 console error**. Ảnh không commit. |

## Ma trận → test

| # | Scenario | Test |
| - | --- | --- |
| 1 | Role default, không marker | `matrix` › happy render › "a user with no override…" |
| 1b | Seed override hai chiều | `matrix` › "seeded exceptions show in both directions…" |
| 2 | AuthN | `matrix` › unauthenticated redirect; `launcher` › "no token gets 401" |
| 3 | AuthZ API | `launcher` › "a regular user gets 403…" (GET + PATCH) |
| 4 | Dirty gate, ô thiếu role chỉnh được | `matrix` › edit mode + dirty gate (4 test). Validation API [EP]/[BVA]: Jest `validators/schemas/entitlement.spec.ts` (0/1/50/51 user, 0/1/200/201 change, trùng, sai kiểu) |
| 7 | Search launcher không thấy app bị revoke | `launcher` › "searching /apps for a revoked app…" |
| 8 | Data rendering | `matrix` › data rendering |
| 9 | i18n marker en + vi | `matrix` › i18n (2 test) |
| 10 | Loading, lỗi 500 khi lưu | `matrix` › loading; save error |
| 11 | [DT] persist deny / xoá override / allow; [ST] reload; double-submit | `matrix` › save (4 test), check-all |
| 11b | [DT] override × điểm áp | `launcher` › revoke (4 test), grant beyond the role |
| 11c | Admin SSO app `[user]` | `admin-sso.e2e.ts` |
| §9 | [ST] revoke → `ENTITLEMENT_REVOKED`, xoá override → `ENTITLEMENT_GRANTED` có link `/apps?search=Notes`, hiện ở `/notifications` | `launcher` › notifications › "revoking and restoring an app tells the user both times" |
| §9 | [DT] lưu đúng giá trị đang có (grant app role đã cho, revoke app role không cho) → không có notification | `launcher` › notifications › "saving the value the user already has sends nothing". Phần còn lại của bảng quyết định (allow → mặc định role, admin, app inactive, lỗi đọc tên, lỗi ghi): Jest `update-matrix.spec.ts` |
| 12 | A11y | `matrix` › accessibility (4 test) |

## Follow-up

- 51 E2E đang đỏ sẵn trên `main` (danh sách ở trên) — ngoài phạm vi feature này.

## Kết quả — 10.10.2026, sau khi tích hợp notification (§9)

Merge `feat/notification-events` vào branch, server `:5400` (DB `ducker-id-access-control`,
`pnpm seed:clear`), client **production** (`next build` + `next start -p 3400`). Jest 86 suite / 672
test, lint + tsc hai phía sạch.

| Lượt | Kết quả |
| --- | --- |
| Feature suites (`web-app-access/` + `admin-entitlements/`) | 48 passed, 2 skipped |
| Toàn bộ lần 1 (launcher còn ở `access-control/`) | 380 passed, 59 failed — 9 lỗi mới: 4 ở `notifications/` (mốc seed bị ~11 dòng entitlement đẩy sang trang hai), 1 ở chính test §9 (dòng `REVOKED Operations Console` từ teardown test trước đến muộn), 4 lỗi `429` ở `admin-authz` / `favorite-apps` (poll gọi `fetchNotifications`, mỗi lần một login) |
| Toàn bộ lần 2 (chuyển sang `web-app-access/`, một login cho cả nhóm, lọc theo `appName`) | **441 passed, 38 failed, 8 skipped, 25 did not run — 38 lỗi đều nằm trong 52 lỗi baseline `origin/main`, 0 lỗi mới** |
