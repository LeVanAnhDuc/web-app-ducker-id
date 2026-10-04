# Plan — Tái cấu trúc module `authentication` theo hướng interface/impl

> Design: `docs/specs/authentication-module-structure/design.md`. Branch `refactor/authentication-module-structure`, worktree `.worktrees/authentication-module-structure`.
> Chạm `server/src/**` → theo `server/.claude/CLAUDE.md` + `rules/`.

**Goal:** `authentication` có contract repository tách khỏi implementation Mongo, và service tách thành 1 public method = 1 file với façade tổng hợp — không đổi một dòng hành vi nào.

**Constraint chung:** Refactor thuần. Validate, thứ tự gọi repo, nội dung log, message lỗi copy **nguyên văn**. Import group theo `rules/imports.md`. Review gate trước commit (mặc định ON).

---

### Task 1 — Repository: tách contract khỏi impl

**Files:** xoá `server/src/modules/authentication/authentication.repository.ts`; thêm `repository/authentication.repository.ts`, `repository/impl/mongo-authentication.repository.ts`

- [ ] `repository/authentication.repository.ts`: `export interface AuthenticationRepository` với đúng 7 method hiện có, giữ nguyên signature. Chỉ import type (`AuthenticationDocument`, `AuthenticationRecord`, `CreateAuthenticationData`, `ClientSession`) — **không** import `AuthenticationModel`, `asyncDatabaseHandler`, `AUTHENTICATION_ROLES`.
- [ ] `repository/impl/mongo-authentication.repository.ts`: `class MongoAuthenticationRepository implements AuthenticationRepository`, thân 7 method copy nguyên văn kể cả comment giải thích `tokenVersion` trong `updatePassword`.
- [ ] Không tạo `repository/index.ts`.

### Task 2 — Service: 7 method thành 7 file

**Files:** thêm `server/src/modules/authentication/service/{find-by-id,create,update-password,require-password-change,admin-reset-password,set-active,count-active-admins}.ts`

Mỗi file export đúng 1 arrow function, param đầu là `authRepo: AuthenticationRepository`:

- [ ] `find-by-id.ts` → `findById(authRepo, authId)`
- [ ] `create.ts` → `create(authRepo, data, session?)`
- [ ] `update-password.ts` → `updatePassword(authRepo, authId, hashedPassword, session?)`
- [ ] `require-password-change.ts` → `requirePasswordChange(authRepo, authId)`
- [ ] `admin-reset-password.ts` → `adminResetPassword(authRepo, authId, hashedPassword)`
- [ ] `set-active.ts` → `setActive(authRepo, authId, isActive)`
- [ ] `count-active-admins.ts` → `countActiveAdmins(authRepo)`

Thân hàm copy nguyên văn từ `authentication.service.ts` — cùng `validateObjectId` / `validateRequiredString`, cùng try/catch, cùng chuỗi log và payload log.

### Task 3 — Façade `service/index.ts`

**Files:** thêm `server/src/modules/authentication/service/index.ts`; xoá `authentication.service.ts`

- [ ] `class AuthenticationService`, constructor giữ `private readonly authRepo: AuthenticationRepository`.
- [ ] 7 method, mỗi method khai báo đầy đủ signature + kiểu trả về rồi `return <fn>(this.authRepo, …)`. Không try/catch, không log, không validate ở tầng này.
- [ ] Import 7 method file bằng alias (`findById as findByIdMethod`, …) hoặc đặt tên hàm khác tên method để tránh shadow — chọn một cách và dùng nhất quán.

### Task 4 — Module factory

**Files:** sửa `server/src/modules/authentication/authentication.module.ts`

- [ ] `MongoAuthenticationRepository` từ `./repository/impl/mongo-authentication.repository`.
- [ ] `AuthenticationService` từ `./service`.

### Task 5 — Tách spec sang `service/spec/`

**Files:** xoá `authentication.service.spec.ts`; thêm `service/spec/{set-active,count-active-admins,admin-reset-password}.spec.ts`

- [ ] Mỗi file giữ **nguyên** describe + 3 (hoặc 2) test case tương ứng, không đổi tên test, không đổi assertion.
- [ ] Bỏ helper `buildRepo` dùng chung — mỗi spec tự dựng mock chỉ cho method nó cần (`{ setActive } as unknown as AuthenticationRepository`).
- [ ] Vẫn test qua `new AuthenticationService(repo)` để façade nằm trong đường test, không test thẳng pure function.
- [ ] Import `AuthenticationRepository` từ `../../repository/authentication.repository`, `AuthenticationService` từ `../`.

### Task 6 — Đổi import path ở 16 file consumer

**Files:** `change-password/` (3), `forgot-password/` (2), `oauth/` (2), `signup/` (2), `token/` (2), `unlock-account/` (2), `user/` (3)

- [ ] `@/modules/authentication/authentication.service` → `@/modules/authentication/service`. Không đổi gì khác trong các file này.

### Task 7 — Cập nhật rule layer 3 (local-only, không commit)

**Files:** `server/.claude/rules/modules.md`, `server/.claude/skills/module-struct/SKILL.md`

- [ ] `modules.md`: cập nhật cây "Cấu trúc chuẩn" (thêm `repository/` + `impl/`, `service/` + `spec/`); viết lại rule 20–21 và 41–42; **xoá** rule 44 (`MongoDBRepository` không tồn tại trong codebase).
- [ ] `modules.md`: ghi rõ `repository/` **không** có barrel — ngoại lệ có chủ đích của quy tắc 1-file-vs-folder.
- [ ] `module-struct/SKILL.md`: sửa mục `repositories/` và `services/`, cập nhật cây cấu trúc đầy đủ, cập nhật `description` ở frontmatter nếu nội dung lệch.
- [ ] Viết như **chuẩn mới, đang migrate dần** — nêu rõ mới chỉ `authentication` theo chuẩn này, 18 module còn lại chưa.

### Task 8 — Cập nhật `CLAUDE.md` (app repo, có commit)

**Files:** `CLAUDE.md`

- [ ] Đoạn "Module anatomy" trong §Architecture → Server: thêm mô tả layout `repository/` + `impl/` và `service/` + `spec/`, ghi rõ hiện mới áp dụng cho `authentication`.

### Task 9 — Verify

- [ ] `cd server && pnpm type-check` — pass.
- [ ] `cd server && pnpm test` — 302 test pass, số suite 44 → 46.
- [ ] `cd server && pnpm lint` — không lỗi mới.
- [ ] `git grep -n "authentication.service\|authentication.repository"` — không còn tham chiếu tới path cũ (trừ docs lịch sử).

### Task 10 — Review gate + commit

- [ ] Trình diff cho user duyệt.
- [ ] Một commit: `refactor(authentication): split repository contract from impl and service into per-method files`.
- [ ] Không đụng README (`## Features` không đổi — zero user-facing change).
