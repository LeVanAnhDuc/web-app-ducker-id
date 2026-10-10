# Plan — Chuyển temp password của unlock-account sang Redis

> Design: `docs/specs/unlock-token-to-redis/design.md`. Branch `refactor/unlock-token-to-redis`, worktree `.worktrees/unlock-token-to-redis`.
> Chạm `server/src/**` → theo `server/.claude/CLAUDE.md` + `rules/`.

**Goal:** Mật khẩu tạm của luồng self-unlock sống ở Redis với TTL 15 phút và consume một lần atomic; 3 field `tempPassword*` biến mất khỏi schema `auths` và khỏi dữ liệu đang có.

**Constraint chung:** BE-only, không đổi API contract, không đụng FE. Throw qua `@/common/exceptions`, code từ `ERROR_CODES`, i18n qua thunk. Hằng số qua `constants/` (không hardcode magic number). Review gate trước mỗi commit (mặc định ON).

---

### Task 1 — Constants của module

**Files:** thêm `server/src/modules/unlock-account/constants/index.ts`

- [ ] Tạo `UNLOCK_ACCOUNT_CONFIG` gồm `TEMP_PASSWORD_EXPIRY_MINUTES: 15`, `COOLDOWN_SECONDS: 60`, `RATE_LIMIT_WINDOW_SECONDS: 3600`, `MAX_REQUESTS_PER_HOUR: 3`.
- [ ] Gỡ hằng inline tương ứng khỏi `unlock-account.repository.ts` và `unlock-account.service.ts`, import từ `./constants`.

### Task 2 — Repository: store + consume trên Redis

**Files:** sửa `server/src/modules/unlock-account/unlock-account.repository.ts`

**Interface mới:**
- `storeTempPassword(email: string, tempPassword: string): Promise<void>`
- `consumeTempPassword(email: string, tempPassword: string): Promise<boolean>`

- [ ] `TEMP_PASSWORD_EXPIRY_SECONDS` = `TEMP_PASSWORD_EXPIRY_MINUTES * SECONDS_PER_MINUTE` (import `@/constants/time`), expose readonly như `RedisResetTokenRepository`.
- [ ] `storeTempPassword`: `hashValue(tempPassword)` → `client.setEx(unlockTokenKey(email), TTL, hash)`.
- [ ] `consumeTempPassword`: `GET` → null ⇒ `false`; `isValidHashedValue` sai ⇒ `false` **không** `del`; đúng ⇒ `const deleted = await client.del(key)` ⇒ trả `deleted === 1`.
- [ ] Comment ngắn giải thích vì sao `GET` + `DEL` chứ không `GETDEL` (đoán sai không được đốt mã của nạn nhân).

### Task 3 — Guard chỉ còn 1 nhánh

**Files:** sửa `server/src/modules/unlock-account/guards/temp-password-valid.guard.ts`

- [ ] Nhận `UnlockAccountRepository` qua constructor; `assert(email, tempPassword)` bỏ tham số `auth`.
- [ ] Một nhánh fail duy nhất → `UnauthorizedError` + `UNLOCK_INVALID_TEMP_PASSWORD` + `unlockAccount:errors.invalidTempPassword`.
- [ ] Doc comment nói rõ `assert` có side effect consume key.
- [ ] Bỏ import `AuthenticationDocument` và `isValidHashedValue`.

### Task 4 — Service + module factory

**Files:** sửa `server/src/modules/unlock-account/unlock-account.service.ts`, `unlock-account.module.ts`

- [ ] `unlockRequest`: `generateTempPassword()` → `unlockAccountRepo.storeTempPassword(email, tempPassword)`; xoá `hashValue` + tính `tempPasswordExpAt` + gọi `authService.storeTempPassword`. Log giữ `expiresInSeconds` thay cho `expiresAt`.
- [ ] `unlockVerify`: `tempPasswordValidGuard.assert(email, tempPassword)`; `authService.markTempPasswordUsed` → `authService.requirePasswordChange`.
- [ ] `unlock-account.module.ts`: `new TempPasswordValidGuard(unlockAccountRepo)`.

### Task 5 — Authentication module: bỏ 2 method, thêm `requirePasswordChange`

**Files:** sửa `server/src/modules/authentication/{authentication.repository.ts, authentication.service.ts, types/index.ts}`

- [ ] Repository: xoá `storeTempPassword` + `markTempPasswordUsed` khỏi type và class; thêm `requirePasswordChange(authId)` → `findByIdAndUpdate(authId, { mustChangePassword: true })`.
- [ ] Service: mirror (xoá 2, thêm 1) — giữ `validateObjectId` + try/catch + Logger theo đúng style các method khác.
- [ ] `AuthenticationDocument`: xoá 3 field `tempPassword*`.

### Task 6 — Model + factory test

**Files:** sửa `server/src/models/authentication.ts`, `server/test/factories/user-with-auth.factory.ts`

- [ ] Xoá 3 field khỏi `AuthenticationSchema`.
- [ ] Xoá 3 dòng tương ứng trong `buildAuth()`.

### Task 7 — Error code + i18n housekeeping

**Files:** sửa `server/src/constants/error-code.ts`, `server/src/i18n/locales/{en,vi}/unlockAccount.json`

- [ ] Xoá `UNLOCK_TEMP_PASSWORD_EXPIRED`.
- [ ] Xoá key `errors.tempPasswordExpired` ở cả `en` và `vi`.
- [ ] Grep lại toàn repo xác nhận không còn tham chiếu.

### Task 8 — Script dọn DB

**Files:** thêm `server/src/database/migrations/drop-temp-password-fields.ts`; sửa `server/package.json`

- [ ] Script: connect → `AuthenticationModel.collection.updateMany({ $or: [...3 $exists...] }, { $unset: {...} })` → log `matched` / `modified` → `disconnect()` → `process.exit(0)`; lỗi thì log + `exit(1)` (pattern `seeders/index.ts`).
- [ ] Dùng `.collection` (native driver), **không** đi qua Mongoose model — strict mode sẽ bỏ qua `$unset` của field không còn trong schema.
- [ ] Thêm script `migrate:drop-temp-password` vào `package.json`.
- [ ] Chạy thật trên MongoDB local, ghi lại số doc đã sửa.

### Task 9 — Test

**Files:** thêm `server/src/modules/unlock-account/unlock-account.repository.spec.ts`, `server/src/modules/unlock-account/guards/temp-password-valid.guard.spec.ts`

- [ ] Repo spec: 5 case theo design §4 (no key / sai / đúng / `del` trả 0 / `storeTempPassword` setEx đúng key + TTL 900).
- [ ] Guard spec: 2 case (pass / throw `UnauthorizedError` đúng code).
- [ ] `pnpm test` xanh toàn bộ (hiện 44 suites / 302 tests → +2 suites).

### Task 10 — Quality gate + docs

- [ ] `cd server && pnpm format && pnpm lint:fix && pnpm lint && pnpm type-check` — sạch cả 4.
- [ ] `pnpm test` xanh.
- [ ] `docs/project-goals.md`: thêm dòng changelog 2026-10-04.
- [ ] `README.md`: **không đổi** — không có thay đổi hành vi user-facing (`## Features` không mô tả chỗ lưu mã tạm); commit dùng prefix `refactor:` chứ không phải `feat:`.
- [ ] Review gate với user → commit.
