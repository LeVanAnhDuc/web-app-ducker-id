# Design — Tái cấu trúc module `authentication` theo hướng interface/impl

> Refactor thuần cấu trúc: tách contract khỏi implementation ở tầng repository, tách service thành 1 method = 1 file.
> Ngày: 2026-10-04. Repo: `server/`, `docs/`. Branch: `refactor/authentication-module-structure`.

## 1. Bối cảnh

`authentication` là module **không có API** của riêng nó: không `controller`, không `routes`, không swagger. `modules.loader.ts:101` chỉ lấy `{ authService }` rồi tiêm xuống 7 module khác. Nó là nơi duy nhất được phép chạm collection `auths`.

Hiện trạng — 7 file, 2 file mang code thật:

| File                            | Nội dung                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `authentication.repository.ts`  | `export type AuthenticationRepository` (contract, 7 method) **+** `class MongoAuthenticationRepository` — chung 1 file |
| `authentication.service.ts`     | `class AuthenticationService` — 7 method, mỗi method là `validate* → authRepo.x() → Logger`                  |
| `authentication.service.spec.ts`| 3 describe cho `setActive`, `countActiveAdmins`, `adminResetPassword`                                        |
| `authentication.module.ts`      | factory 5 dòng                                                                                               |
| `constants/`, `helpers/`, `types/` | không đụng tới                                                                                            |

Cả 7 method của service đều chỉ được gọi từ service của module khác:

| method                  | caller                              |
| ----------------------- | ----------------------------------- |
| `findById`              | change-password, oauth, token, user |
| `create`                | signup                              |
| `updatePassword`        | change-password, forgot-password    |
| `requirePasswordChange` | unlock-account                      |
| `adminResetPassword`    | user                                |
| `setActive`             | user                                |
| `countActiveAdmins`     | user                                |

### Vấn đề cần giải

1. **Contract và implementation dính nhau.** `type AuthenticationRepository` nằm cùng file với `MongoAuthenticationRepository`. Nơi nào muốn phụ thuộc vào contract đều phải import từ file chứa Mongoose — ranh giới "tôi phụ thuộc cái gì" bị xoá. Đây là pattern của **cả 19 repository** trong codebase, không riêng module này.
2. **Service là một file phẳng 120 dòng chứa 7 use case độc lập.** Không method nào gọi method nào; chúng chỉ tình cờ ở chung file. Để biết "ai đổi mật khẩu" phải đọc cả file.

### Ngoài scope

- Không đổi hành vi: validate, thứ tự gọi repo, nội dung log, message lỗi giữ **nguyên văn**.
- Không đổi contract của `AuthenticationService` nhìn từ bên ngoài — 7 method, cùng signature, vẫn là class khởi tạo bằng `new`.
- Không viết test mới cho 4 method chưa có test (`findById`, `create`, `updatePassword`, `requirePasswordChange`) — việc riêng, quyết định sau.
- Không đụng 18 module còn lại. PR này là pilot.
- Không đụng FE, không đổi API ⇒ zero e2e impact.

## 2. Quyết định thiết kế

| Vấn đề                      | Quyết định                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type` hay `interface`      | `export interface AuthenticationRepository` — khớp mô hình Java Spring mà chủ dự án hướng tới                                                                   |
| Contract đặt ở đâu          | `repository/authentication.repository.ts` — ngang cấp với `impl/`, **không** bọc thêm folder `interface/`                                                       |
| Implementation đặt ở đâu    | `repository/impl/mongo-authentication.repository.ts` — tiền tố `mongo-` cho biết đây là biến thể datastore nào                                                  |
| Barrel cho `repository/`    | **Không có.** Mỗi nơi import thẳng file nó cần. Service chỉ thấy interface; chỉ `authentication.module.ts` thấy impl                                            |
| Tách service theo tiêu chí  | **1 public method = 1 file.** Module này không có controller nên không dùng được tiêu chí "1 API = 1 file"; mỗi public method ở đây đã là một use case trọn vẹn |
| Shape của method file       | Pure function nhận `authRepo` làm **param đầu tiên** — không currying, không class                                                                              |
| Shape của `service/index.ts`| Giữ `class AuthenticationService`, mỗi method là **một dòng delegate**. Không logic trong façade                                                                |
| Tên folder service          | `service/` số ít — phân biệt với `services/` số nhiều đang mang nghĩa "module có 2+ service collaborator" trong rule hiện hành                                  |
| Spec đặt ở đâu              | `service/spec/<method>.spec.ts` — gom riêng, không colocated, để folder `service/` chỉ còn code                                                                 |

### Vì sao không currying, không object factory

Ba shape khả dĩ cho "1 method 1 file":

- **Curried factory** (`makeFindById(repo)` trả function): `index.ts` không lặp signature, nhưng phải khai báo field `ReturnType<typeof makeFindById>` cho từng method rồi gán trong constructor — đọc khó hơn, và mất chỗ đọc nhanh danh sách API của service.
- **Object factory** (`createAuthenticationService(repo)` trả object): thuần functional nhất, nhưng lệch hẳn với 17 service class còn lại và buộc sửa `authentication.module.ts` + spec bỏ `new`.
- **Pure function + class façade** ← chọn. 8 module consumer đều dùng `import type` nên không đổi cách dùng; `new AuthenticationService(repo)` giữ nguyên; `index.ts` trở thành bảng mục lục đọc được trong một màn hình.

Giá phải trả: signature viết hai lần (ở method file và ở façade). Chấp nhận — đổi lại façade tự nó là tài liệu.

## 3. Cấu trúc đích

```
server/src/modules/authentication/
  authentication.module.ts
  constants/index.ts
  helpers/index.ts
  types/index.ts
  repository/
    authentication.repository.ts            ← interface AuthenticationRepository
    impl/
      mongo-authentication.repository.ts    ← class MongoAuthenticationRepository
  service/
    index.ts                                ← class AuthenticationService (façade)
    find-by-id.ts
    create.ts
    update-password.ts
    require-password-change.ts
    admin-reset-password.ts
    set-active.ts
    count-active-admins.ts
    spec/
      set-active.spec.ts
      count-active-admins.spec.ts
      admin-reset-password.spec.ts
```

Hướng phụ thuộc: `module.ts → service/index.ts → service/<method>.ts → repository/authentication.repository.ts`. Chỉ `module.ts` biết tới `repository/impl/`.

## 4. Ảnh hưởng ra ngoài module

Đường dẫn import đổi ở 16 file; không file nào đổi **cách dùng**, chỉ đổi path:

`@/modules/authentication/authentication.service` → `@/modules/authentication/service`

- `change-password/` — `change-password.module.ts`, `change-password.service.ts`, `change-password.service.spec.ts`
- `forgot-password/` — `forgot-password.module.ts`, `services/forgot-password.service.ts`
- `oauth/` — `oauth.module.ts`, `oauth.service.ts`
- `signup/` — `signup.module.ts`, `signup.service.ts`
- `token/` — `token.module.ts`, `token.service.ts`
- `unlock-account/` — `unlock-account.module.ts`, `unlock-account.service.ts`
- `user/` — `user.module.ts`, `user.service.ts`, `user.service.spec.ts`

`authentication.repository.ts` hiện **không** được import từ ngoài module, nên việc dời nó không lan ra đâu cả.

## 5. Convention bị thay đổi

Cấu trúc này mâu thuẫn trực tiếp với layer 3 (`server/.claude/`), nên rule phải sửa cùng lúc, nếu không phiên làm việc sau sẽ sửa ngược lại:

| Nguồn                            | Đang nói                                                                     | Phải thành                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `rules/modules.md` rule 20–21     | 1 service → file ở root module; 2+ service → folder `services/`              | thêm: service tách theo method → folder `service/` + façade `index.ts`                |
| `rules/modules.md` rule 41–42     | 1 repo → root file `{module}.repository.ts`; contract + impl cùng file        | contract ở `repository/{module}.repository.ts`, impl ở `repository/impl/`             |
| `rules/modules.md` rule 44        | "MongoDB repos extend `MongoDBRepository`"                                    | **xoá** — class `MongoDBRepository` không tồn tại trong codebase (rule stale sẵn)     |
| `skills/module-struct/SKILL.md`   | mục `repositories/`: contract + impl cùng file; quy tắc barrel bắt buộc       | cập nhật theo trên; ghi rõ `repository/` không có barrel                              |
| `CLAUDE.md` (app repo)            | "Module anatomy: … `<name>.repository.ts`"                                    | thêm một câu mô tả layout mới và trạng thái migrate                                   |

Rule viết theo hướng **chuẩn mới của dự án, đang migrate dần** — không viết "authentication là ngoại lệ".

`server/.claude/` bị app repo gitignore và không thuộc repo `claude-architecture-ducker-id` (đó là `.claude/` ở gốc project) ⇒ sửa tại chỗ, không commit.

## 6. Verify

BE-only, không cần DB:

- `cd server && pnpm type-check` — bắt mọi import path hỏng.
- `cd server && pnpm test` — số test phải giữ nguyên **309**; 3 describe tách ra 3 file ⇒ số suite tăng từ 46 lên **48**.
- `cd server && pnpm lint`.

Không chạy Playwright: không có thay đổi nào quan sát được từ UI.

### Hai phát hiện bên lề khi verify

1. **`CLAUDE.md` ghi sai số test.** Nó nói "44 suites / 302 tests"; thực tế trước PR này là 46 suite / 309 test. Sửa luôn trong PR này.
2. **`pnpm test` không chạy được trong worktree trên Windows.** Jest escape dấu chấm của segment `.worktrees` thành `\.` khi dựng `testMatch` từ `<rootDir>`, micromatch khớp 0 file ⇒ `No tests found`, exit 1. Không liên quan tới refactor này (đụng mọi branch chạy từ `.worktrees/`). Workaround đã dùng: `npx jest --testMatch "**/src/**/*.spec.ts"`. Fix thật sự (đổi `jest.config.ts` dùng pattern tương đối) **ngoài scope** PR này.
