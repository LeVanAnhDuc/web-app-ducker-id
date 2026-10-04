# Design — Migrate `unlock-account`, `web-app`, `user` sang layout mới (đợt 2)

> Tiếp nối `docs/specs/authentication-module-structure/` (PR #5) và `docs/specs/module-struct-batch1/` (PR #6).
> Ngày: 2026-10-04. Repo: `server/`, `docs/`. Branch: `refactor/module-struct-batch2`.

## 1. Phạm vi

| Module | Public method | Dependency | Repository |
| --- | --- | --- | --- |
| `unlock-account` | 2 | 9 | 1 (Redis) |
| `web-app` | 6 | 3 | **2** (Mongo) |
| `user` | 10 | 3 | 1 (Mongo) |

Cả ba đều rơi vào nhánh "nhiều dependency" nên đều có `service/deps.ts` và constructor nhận object — đợt 1 mới chỉ `favorite` chạm tới nhánh này.

Còn lại: `signup`, `oauth` (đợt 3); `forgot-password`, `login` (đợt 4); `login-history` **cuối cùng** vì nhánh `feat/login-history-app-source` đang mở trên module đó.

## 2. Ba tình huống mới của đợt này

### 2.1 Module có 2+ repository khác nhau → `repositories/` số nhiều

`web-app` có `WebAppRepository` và `WebAppCategoryRepository` — hai repo **khác nhau**, không phải hai implementation của một contract. Cách bày giữ nguyên tinh thần: interface ở gốc folder, implementation trong `impl/`.

```
web-app/repositories/
  web-app.repository.ts               interface WebAppRepository
  web-app-category.repository.ts      interface WebAppCategoryRepository
  impl/
    mongo-web-app.repository.ts
    mongo-web-app-category.repository.ts
```

**Barrel `repositories/index.ts` bị xoá.** Nó đang re-export cả interface lẫn class, nên `favorite/guards/app-favoritable.guard.ts` chỉ cần contract vẫn phải đi qua file kéo theo Mongoose. 6 chỗ import xuyên module được trỏ thẳng vào file cần: 4 chỗ lấy interface, 2 chỗ (`favorite.module.ts`, `oauth.module.ts`) lấy class.

### 2.2 Repository cũng có spec → `repository/spec/`

`unlock-account` và `user` có `*.repository.spec.ts`. Đặt ở `repository/spec/`, đối xứng với `service/spec/`. Nội dung test không đổi.

### 2.3 Constructor đổi sang object → phải sửa cả spec

`web-app.service.spec.ts` dựng service **18 lần**, `user.service.spec.ts` **15 lần**, đều bằng param vị trí. Tất cả chuyển sang object form, không đổi một assertion nào.

Chỗ này là rủi ro thật của việc đổi constructor: nếu một call site bị bỏ sót mà các param cùng kiểu thì TypeScript không bắt được. Ở đây không xảy ra — ba param của `UserService` là ba type khác nhau, và `tsc` chạy sạch.

## 3. Repository đã tách

| Module | Contract | Implementation |
| --- | --- | --- |
| `unlock-account` | `repository/unlock-account.repository.ts` | `repository/impl/redis-unlock-account.repository.ts` |
| `web-app` | `repositories/web-app.repository.ts` | `repositories/impl/mongo-web-app.repository.ts` |
| `web-app` | `repositories/web-app-category.repository.ts` | `repositories/impl/mongo-web-app-category.repository.ts` |
| `user` | `repository/user.repository.ts` | `repository/impl/mongo-user.repository.ts` |

`type` → `interface` ở cả bốn, không barrel.

## 4. Ảnh hưởng ra ngoài module

- `@/modules/user/user.service` → `@/modules/user/service`: **18 file** (gồm `test/mocks/user-service.mock.ts`). `UserService` là service được tiêm rộng nhất trong codebase.
- `@/modules/unlock-account/unlock-account.repository` → `…/repository/unlock-account.repository`: 4 guard trong module + `test/mocks/unlock-account-repo.mock.ts`.
- `@/modules/web-app/repositories` (barrel) → file cụ thể: 6 chỗ ở `favorite` và `oauth`.

## 5. Cố ý KHÔNG làm

- **Không gộp logic trùng.** `getAdminUsers` (user) và `getContactList`/`getMyContacts` (contact-admin, từ đợt 1) vẫn lặp phần tính page/limit/sort. Cùng lý do như đợt 1: gộp trong commit dời file làm diff hết đọc được như một phép move.
- **Không thêm test.** `unlock-account` service và `web-app` vẫn giữ nguyên bộ test cũ.
- **Không đụng hành vi.** Thân mọi method copy nguyên văn, kể cả comment tiếng Việt về public client và về `mustChangePassword`.

## 6. Verify

- `pnpm type-check` — pass.
- `pnpm test` — **48 suite / 309 test pass**, đúng bằng trước PR.
- `pnpm lint` — sạch (2 lỗi format do generate ra, đã `lint:fix`).
