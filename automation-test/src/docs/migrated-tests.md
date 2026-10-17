# Test đã gom về `src/`

Bộ regression có sẵn trước khi áp skill `scaffold-automation-testing` (2026-10-13). Toàn bộ đã nằm đúng chỗ trong
`src/` và chạy được. "Đã chuẩn hóa" = spec dùng page object, api client, copy import, tên test = tiêu đề TC, và
helper riêng của module (`src/helpers/<module>.ts` cũ) đã tách ra các lớp — cả 20 module xong ngày 2026-10-14 bằng
`/write-tests <module>`; `src/helpers/` đã xoá.

| Từ                                                                                          | Về                                                                                  | Trạng thái   |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------ |
| `automation-test/tests/{e2e,api}/admin-apps/`, `test-cases/admin-apps.md`                   | `src/tests/{e2e,api}/admin-apps/`, `src/test-cases/admin-apps.md`                   | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/admin-categories/`, `test-cases/admin-categories.md`       | `src/tests/{e2e,api}/admin-categories/`, `src/test-cases/admin-categories.md`       | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/admin-contact/`, `test-cases/admin-contact.md`             | `src/tests/{e2e,api}/admin-contact/`, `src/test-cases/admin-contact.md`             | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/admin-entitlements/`, `test-cases/admin-entitlements.md`   | `src/tests/{e2e,api}/admin-entitlements/`, `src/test-cases/admin-entitlements.md`   | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/admin-login-history/`, `test-cases/admin-login-history.md` | `src/tests/{e2e,api}/admin-login-history/`, `src/test-cases/admin-login-history.md` | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/admin-users/`, `test-cases/admin-users.md`                 | `src/tests/{e2e,api}/admin-users/`, `src/test-cases/admin-users.md`                 | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/apps/`, `test-cases/apps.md`                               | `src/tests/{e2e,api}/apps/`, `src/test-cases/apps.md`                               | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/auth/`, `test-cases/auth.md`                               | `src/tests/{e2e,api}/auth/`, `src/test-cases/auth.md`                               | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/authz/`, `test-cases/authz.md`                             | `src/tests/{e2e,api}/authz/`, `src/test-cases/authz.md`                             | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/favorites/`, `test-cases/favorites.md`                     | `src/tests/{e2e,api}/favorites/`, `src/test-cases/favorites.md`                     | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/home/`, `test-cases/home.md`                               | `src/tests/{e2e,api}/home/`, `src/test-cases/home.md`                               | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/login-history/`, `test-cases/login-history.md`             | `src/tests/{e2e,api}/login-history/`, `src/test-cases/login-history.md`             | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/notifications/`, `test-cases/notifications.md`             | `src/tests/{e2e,api}/notifications/`, `src/test-cases/notifications.md`             | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/oidc/`, `test-cases/oidc.md`                               | `src/tests/{e2e,api}/oidc/`, `src/test-cases/oidc.md`                               | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/ops/`, `test-cases/ops.md`                                 | `src/tests/{e2e,api}/ops/`, `src/test-cases/ops.md`                                 | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/password/`, `test-cases/password.md`                       | `src/tests/{e2e,api}/password/`, `src/test-cases/password.md`                       | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/profile/`, `test-cases/profile.md`                         | `src/tests/{e2e,api}/profile/`, `src/test-cases/profile.md`                         | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/recently-used/`, `test-cases/recently-used.md`             | `src/tests/{e2e,api}/recently-used/`, `src/test-cases/recently-used.md`             | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/settings/`, `test-cases/settings.md`                       | `src/tests/{e2e,api}/settings/`, `src/test-cases/settings.md`                       | đã chuẩn hóa |
| `automation-test/tests/{e2e,api}/support/`, `test-cases/support.md`                         | `src/tests/{e2e,api}/support/`, `src/test-cases/support.md`                         | đã chuẩn hóa |

Hạ tầng dùng chung đã tách ngay: `helpers/env.ts` → `src/config/`, `helpers/redis.ts` + `helpers/accounts.ts` →
`src/utils/`, `fixtures/index.ts` → `src/fixtures/*.fixture.ts`, `docs/requirements.md` → `src/docs/requirements/<module>.md`,
`defects/bug-log.md` → `src/defects/<module>.md` + `src/docs/bug-history.md`.

## Còn trỏ về nơi cũ

| Nơi                                                                                    | Đang nói gì                                                                              | Vì sao chưa sửa                                           |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `.claude/skills/e2e-scenario-coverage/SKILL.md` (repo `claude-architecture-ducker-id`) | ghi requirement vào `automation-test/docs/requirements.md`, bug vào `defects/bug-log.md` | repo lồng riêng — sửa và commit tách sau khi PR này merge |
| `docs/specs/**` (design / plan / e2e.md / e2e-bugs.md có ngày)                         | đường dẫn và ID cũ (`TC-PWD-…`, `BUG-0NN`)                                               | tài liệu lịch sử, không sửa; tra `id-migration.md`        |
| `src/docs/runs/run-2026-10-11.md`, `src/docs/bug-history.md`                           | ID và đường dẫn trước 2026-10-13                                                         | bản ghi lịch sử, có ghi chú đầu file                      |
