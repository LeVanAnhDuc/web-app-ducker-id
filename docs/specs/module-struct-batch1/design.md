# Design — Migrate 7 module sang layout `service/` + `repository/` (đợt 1)

> Tiếp nối `docs/specs/authentication-module-structure/`. Refactor thuần cấu trúc, không đổi hành vi.
> Ngày: 2026-10-04. Repo: `server/`, `docs/`. Branch: `refactor/module-struct-batch1`.

## 1. Phạm vi

`authentication` đã đi trước ở PR #5. Đợt này 7 module:

| Module | Public method | Dependency | Repository |
| --- | --- | --- | --- |
| `logout` | 1 | 1 | không có |
| `token` | 1 | 7 | không có |
| `change-password` | 1 | 5 | không có |
| `session` | 5 | 1 | Redis |
| `favorite` | 3 | 3 | Mongo |
| `notification` | 4 | 1 | Mongo |
| `contact-admin` | 6 | 1 | Mongo |

Để lại: `user`, `web-app`, `unlock-account`, `signup`, `oauth`, `forgot-password`, `login` (đợt sau); `login-history` **cuối cùng** vì đang có nhánh `feat/login-history-app-source` làm trên module đó; `entitlement` và `oauth-consent` là stub rỗng, không có gì để tách.

## 2. Hai quy tắc mới, phát sinh từ đợt này

`authentication` có 7 method và đúng 1 dependency nên không chạm tới hai tình huống dưới đây. Cả hai đã chốt với chủ dự án trước khi làm.

### 2.1 Service chỉ có 1 public method → gộp vào `service/index.ts`

`logout`, `token`, `change-password` mỗi cái chỉ có một method. Tách thành `service/logout.ts` + `service/index.ts` là 2 file cho 23 dòng, không thêm khả năng truy vết nào mà tên module đã không cho.

Quy tắc: **1 method → class và logic cùng nằm trong `service/index.ts`**. Khi module có method thứ hai thì mới tách ra file riêng. Cái vẫn giữ được là **đường import đồng nhất** — mọi module đều là `@/modules/<m>/service`.

### 2.2 Service có 2+ dependency → `service/deps.ts`

Pattern `fn(repo, …)` của `authentication` không scale: `TokenService` có 7 dependency, `ChangePasswordService` có 5. `refreshAccessToken(authService, userService, g1, g2, g3, g4, g5, refreshToken)` là không đọc được.

Quy tắc: **2+ dependency → `service/deps.ts` khai `interface XxxServiceDeps`**, method file nhận `deps` làm param đầu, constructor của façade nhận một object thay vì danh sách param vị trí. Module factory đổi theo, gọi bằng tên.

Đợt này chỉ `favorite` chạm quy tắc 2.2 — ba module nhiều dependency nhất (`token`, `change-password`) lại rơi vào 2.1 nên không có file method nào cần truyền `deps` vào, constructor giữ nguyên param vị trí.

## 3. Quyết định riêng của từng module

| Module | Quyết định |
| --- | --- |
| `session` | `readSid()` là pure function, được `resolve` và `end` dùng chung → chuyển sang `helpers/index.ts`. Nó vẫn là public method của façade (delegate một dòng) dù **không module nào bên ngoài gọi** — giữ để public surface không đổi trong một PR thuần cấu trúc |
| `favorite` | Contract `FavoriteRepository` được `web-app` import xuyên module → `web-app.service.ts` nay import interface từ `repository/favorite.repository`, `web-app.module.ts` import class từ `repository/impl/` |
| `contact-admin` | `CreateContactInput` đang export từ file repository, không ai ngoài module dùng → chuyển sang file contract cùng `ContactRepository` (nó là một phần của contract) |
| `contact-admin` | `getContactList` và `getMyContacts` có ~12 dòng tính page/limit/sort **giống hệt nhau**. Copy nguyên văn sang hai file, **không** gộp thành helper — xem §5 |

## 4. Repository đã tách

| Module | Contract | Implementation |
| --- | --- | --- |
| `session` | `repository/session.repository.ts` | `repository/impl/redis-session.repository.ts` |
| `favorite` | `repository/favorite.repository.ts` | `repository/impl/mongo-favorite.repository.ts` |
| `notification` | `repository/notification.repository.ts` | `repository/impl/mongo-notification.repository.ts` |
| `contact-admin` | `repository/contact-admin.repository.ts` | `repository/impl/mongo-contact-admin.repository.ts` |

`type` → `interface` ở cả bốn. Không folder nào có barrel. `logout`, `token`, `change-password` không có repository nên không đụng tới.

## 5. Cố ý KHÔNG làm

- **Không gộp logic trùng lặp.** `getContactList` / `getMyContacts` giữ nguyên phần tính pagination trùng nhau. Rule 23 nói logic dùng lại nhiều method thì tách helper, nhưng gộp trong cùng PR với việc dời file sẽ làm diff không còn đọc được như một phép move. Để lại thành việc riêng.
- **Không thêm test.** `logout`, `token`, `session` vẫn không có unit test như trước.
- **Không đổi API, không đổi message lỗi, không đổi log.** Thân mọi method copy nguyên văn.

## 6. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **48 suite / 309 test pass**, đúng bằng trước PR (spec chỉ đổi chỗ, không thêm không bớt).
- `pnpm lint` — sạch.

Chạy test trong worktree phải dùng `npx jest --testMatch "**/src/**/*.spec.ts"` — lý do ghi ở `CLAUDE.md`.
