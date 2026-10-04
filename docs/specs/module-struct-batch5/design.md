# Design — Migrate `login-history` (đợt 5, kết thúc migration)

> Tiếp nối PR #5, #6, #8, #10, #12, #14. Ngày: 2026-10-04. Branch: `refactor/module-struct-batch5`.

## 1. Vì sao để cuối cùng

Chủ dự án yêu cầu để `login-history` sau cùng vì có nhánh `feat/login-history-app-source` đang làm trên module này. Nhánh đó đã merge (PR #7) và chính nó là thứ đã làm `main` đỏ giữa chừng — xem §5 của `module-struct-batch3/design.md`. Trước khi bắt đầu đợt này đã kiểm tra lại: nhánh đã xoá, PR mở duy nhất (#3) không liên quan.

## 2. Cấu trúc

8 public method, 1 private, 1 dependency, 1 repository.

```
login-history/
  services/
    index.ts                      class LoginHistoryService
    record-successful-login.ts
    record-failed-login.ts
    record-app-sign-in.ts
    record-app-sign-in-denied.ts
    get-my-login-history.ts
    get-my-login-stats.ts
    get-all-login-history.ts
    get-login-history-detail.ts
    shared/
      log-login-attempt.ts
    spec/
      login-history.spec.ts
  repository/
    login-history.repository.ts   interface
    impl/
      mongo-login-history.repository.ts
```

`logLoginAttempt` là private được **4** method `record*` dùng chung, chạm Mongo nên không phải helper → `services/shared/`, đúng quy tắc đặt ra ở đợt 3 cho `resolveClient` và `loadClaims` của `oauth`.

Một dependency nên truyền `loginHistoryRepo` thẳng, không cần `deps.ts`.

## 3. Một chi tiết phải giữ đúng

`logLoginAttempt` là `private async` nhưng 4 method gọi nó **không await** — ghi lịch sử là fire-and-forget, và bản thân hàm nuốt mọi lỗi để một lần ghi hỏng không làm hỏng lần đăng nhập. Ở layout mới các method `record*` vẫn trả `void` và gọi bằng `void logLoginAttempt(...)`, giữ nguyên ngữ nghĩa đó.

## 4. Ảnh hưởng ra ngoài module

`@/modules/login-history/login-history.service` → `@/modules/login-history/services`: 20 file, gồm `login`, `forgot-password`, `oauth`, `unlock-account` và `test/mocks/login-history-service.mock.ts`.

## 5. Migration đã xong

16 module có code đều theo layout mới; `entitlement` và `oauth-consent` là stub rỗng không có gì để tách.

| Layout | Module |
| --- | --- |
| `services/` + `repository/` | `authentication`, `contact-admin`, `favorite`, `login-history`, `notification`, `oauth`, `session`, `unlock-account`, `user` |
| `services/` + `repositories/` | `signup`, `web-app` |
| `services/` + `repositories/` + `strategies/` (sub-folder) | `forgot-password`, `login` |
| chỉ `services/` (không có repository) | `change-password`, `logout`, `token` |

Không còn `*.service.ts` hay `*.repository.ts` ở gốc module nào, và không còn barrel nào trong `repository/` / `repositories/`.

## 6. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **50 suite / 323 test pass**, đúng bằng trước toàn bộ migration.
- `pnpm lint` — sạch.

Không chạy Playwright trong suốt 6 PR: không có thay đổi nào quan sát được từ UI.

## 7. Việc còn để lại

Ba thứ đã cố ý không làm trong migration, để nguyên thành việc riêng:

1. **Logic pagination trùng lặp** — `getAllLoginHistory` và `getMyLoginHistory` ở đây, `getContactList`/`getMyContacts` ở `contact-admin`, `getAdminUsers` ở `user`. Cùng một đoạn ~12 dòng tính page/limit/sort. Giờ migration đã xong thì gộp thành helper là một PR sạch, không còn lẫn với việc dời file.
2. **`pnpm test` không chạy được từ worktree trên Windows** — Jest escape dấu chấm của `.worktrees` khi expand `<rootDir>` vào `testMatch`. Suốt 6 PR đều phải dùng `npx jest --testMatch "**/src/**/*.spec.ts"`. Fix thật là sửa `jest.config.ts` dùng pattern tương đối.
3. **Module không có test** — `logout`, `token`, `session`, `signup`, `forgot-password` vẫn chưa có unit test cho service. Migration không thêm test nào.
