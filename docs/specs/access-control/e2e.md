# E2E — access-control

> 05.10.2026 · Ma trận gốc: `design.md` §10. Chạy trên worktree: server `:5400` (DB riêng
> `ducker-id-access-control`, đã `pnpm seed`), client `:3400`,
> `E2E_BASE_URL=http://127.0.0.1:3400` (lý do dùng IPv4: `e2e-bugs.md`, ghi chú môi trường).

## File

| File | Project | Nội dung |
| --- | --- | --- |
| `e2e/admin-entitlements/matrix.e2e.ts` | `admin` | Reconcile toàn bộ suite cũ sang API thật: bỏ trạng thái "Role required" / ô disabled, thêm marker ngoại lệ, persist, xoá override, double-submit, lỗi 500, i18n marker |
| `e2e/admin-entitlements/admin-sso.e2e.ts` | `admin` | #11c — admin SSO vào app `[user]` |
| `e2e/access-control/launcher.e2e.ts` | `chromium` | #3 (API 401/403), #7, #11b — revoke / grant thấy ở `/apps`, search, favorites, `/oauth/authorize` |
| `e2e/helpers/entitlements.ts` | — | setup/teardown qua admin API; `clearOverrides` đưa user về mặc định theo role |
| `e2e/admin-entitlements/picker.e2e.ts` | `admin` | Không đổi (picker không phụ thuộc mock entitlement) — vẫn xanh |

Mọi test ghi DB chạy `serial` và gọi `clearOverrides(user@test.com)` ở `afterEach` / `afterAll`.

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
| 12 | A11y | `matrix` › accessibility (4 test) |

## Follow-up

- Notification khi đổi quyền — spec §9, chờ `feat/notification-events`.
- 51 E2E đang đỏ sẵn trên `main` (danh sách ở trên) — ngoài phạm vi feature này.
