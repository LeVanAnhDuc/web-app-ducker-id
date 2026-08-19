# Admin Reset Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Chạm `server/src/**` → đọc `server/.claude/CLAUDE.md` + skills BE; chạm `client/src/**` → đọc `client/.claude/CLAUDE.md` + skills FE.

**Goal:** Admin bấm "Reset password" ở `/admin/users` → user nhận mật khẩu tạm qua email + bị buộc đổi mật khẩu ở lần đăng nhập kế tiếp (force-change).

**Architecture:** BE endpoint admin sinh temp pw ghi đè mật khẩu thật (bump tokenVersion revoke session cũ, set `mustChangePassword=true`), email temp pw. Cờ `mustChangePassword` phơi qua idToken claim; FE `AuthGuardLayout` chặn app + redirect tới route `/change-password` (shell auth tối giản). Đổi pw xong → token mới cờ=false → auto vào HOME.

**Tech Stack:** BE Express + Mongoose + BullMQ email + jsonwebtoken. FE Next.js 15 + React Query + RHF/Zod + next-intl.

## Global Constraints

- BE: throw `@/common/exceptions`, code từ `ERROR_CODES`, i18n qua thunk; response qua `OkSuccess`. Module struct chuẩn. Không đọc `process.env` trực tiếp (qua `@/constants/env`).
- FE: file `src/**` ≤200 dòng; `useEffect`/`useMutation`/`useQuery` → ghosts/hooks; type props inline; string qua i18n (en+vi); path/endpoint/key qua `CONSTANTS`; dynamic endpoint `:param` + `generatePath`; `Custom*` wrappers; navigation từ `@/i18n/navigation`; `useAnnounce` cho state động.
- Không đổi Mongoose schema (mọi field đã tồn tại). Không env mới.
- Commit review: OFF (user opt-out autonomous) → commit per-task.

---

## PHẦN A — BACKEND (`server/`, worktree `server/.worktrees/admin-reset-password`)

### Task A1: Error code + i18n

**Files:**
- Modify: `server/src/constants/error-code.ts` (thêm `ADMIN_CANNOT_RESET_SELF`)
- Modify: `server/src/i18n/locales/en/user.json`, `.../vi/user.json` (errors.cannotResetSelf, success.resetPassword)

- [ ] Thêm `ADMIN_CANNOT_RESET_SELF: "ADMIN_CANNOT_RESET_SELF"` vào nhóm phù hợp (cạnh `ADMIN_CANNOT_LOCK_SELF`).
- [ ] i18n `user.errors.cannotResetSelf` = EN "You cannot reset your own password here." / VI "Bạn không thể tự đặt lại mật khẩu của mình ở đây.".
- [ ] i18n `user.success.resetPassword` = EN "Password reset. A temporary password was emailed to the user." / VI "Đã đặt lại mật khẩu. Mật khẩu tạm đã gửi tới email người dùng.".
- [ ] Commit: `feat(user): error code + i18n for admin reset-password`.

### Task A2: Repository — `adminResetPassword` + sửa `updatePassword` + email trong lookup

**Files:**
- Modify: `server/src/modules/authentication/authentication.repository.ts`
- Modify: `server/src/modules/user/user.repository.ts` (findAuthIdById trả thêm email — nếu chưa)
- Test: `server/src/modules/authentication/authentication.repository.spec.ts` (nếu có pattern)

**Interfaces:**
- Produces: `AuthenticationRepository.adminResetPassword(authId: string, hashedPassword: string): Promise<void>`
- Produces: `UserRepository.findAuthIdById(userId): Promise<{ authId: string; email: string } | null>` (mở rộng email)

- [ ] Thêm vào type `AuthenticationRepository` + class `MongoAuthenticationRepository`:
```ts
async adminResetPassword(authId: string, hashedPassword: string): Promise<void> {
  await asyncDatabaseHandler("adminResetPassword", () =>
    AuthenticationModel.findByIdAndUpdate(authId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: true,
      $inc: { tokenVersion: 1 }
    }).exec()
  );
}
```
- [ ] Trong `updatePassword`, thêm `mustChangePassword: false` vào object `$set`/update (đặt mật khẩu mới ⇒ hết phải đổi).
- [ ] `user.repository.findAuthIdById`: đảm bảo projection lấy cả `email` từ user doc; cập nhật return type + type ở `user/types`.
- [ ] Chạy `yarn type-check`; commit: `feat(auth): adminResetPassword repo + clear mustChangePassword on updatePassword`.

### Task A3: Auth service passthrough

**Files:** Modify `server/src/modules/authentication/authentication.service.ts`

**Interfaces:** Produces `AuthenticationService.adminResetPassword(authId, hashedPassword): Promise<void>`

- [ ] Thêm method mỏng gọi `this.authRepo.adminResetPassword(...)` (validate `authId` qua `validateRequiredString`/`validateObjectId` như các method khác).
- [ ] Commit: `feat(auth): service adminResetPassword passthrough`.

### Task A4: idToken claim `mustChangePassword`

**Files:**
- Modify: `server/src/modules/token/helpers/index.ts` (generateIdToken payload) + `token/types` (`IdTokenPayload`)
- Modify: `server/src/modules/authentication/helpers/index.ts` (`generateAuthTokensResponse` thêm param)
- Modify call-sites: `login/services/login-completion.service.ts`, `change-password/change-password.service.ts`, `unlock-account/unlock-account.service.ts`, forgot-password reset, token refresh service.

**Interfaces:** `generateAuthTokensResponse({ ..., mustChangePassword: boolean })`; `IdTokenPayload.mustChangePassword?: boolean`.

- [ ] `IdTokenPayload` (token/types) thêm `mustChangePassword?: boolean`.
- [ ] `generateAuthTokensResponse` thêm param `mustChangePassword: boolean` → truyền vào `generateIdToken({ sub, name, email, picture, mustChangePassword })`.
- [ ] Mỗi call-site truyền `mustChangePassword: auth.mustChangePassword ?? false`. (change-password: sau khi updatePassword đã set false, đọc lại hoặc truyền `false` tường minh.)
- [ ] `yarn type-check` + `yarn test` (sửa spec nếu snapshot payload). Commit: `feat(token): expose mustChangePassword as idToken claim`.

### Task A5: Email template `ADMIN_RESET_PASSWORD`

**Files:**
- Modify: `server/src/types/services/email` (`EmailType.ADMIN_RESET_PASSWORD`)
- Create: template React Email `server/src/services/email/templates/AdminResetPassword.tsx` (theo mẫu Unlock temp password)
- Modify: email dispatcher/registry map EmailType→template + subject i18n (theo pattern hiện có)

- [ ] Thêm enum `ADMIN_RESET_PASSWORD`. Data shape `{ tempPassword: string; loginUrl: string }`.
- [ ] Template copy EN + VI: "An administrator reset your password. Temporary password: {tempPassword}. You'll be asked to set a new password after you sign in." + nút login `loginUrl`.
- [ ] Wire vào nơi map template (giống `UNLOCK_TEMP_PASSWORD`).
- [ ] Commit: `feat(email): admin reset-password temp password template`.

### Task A6: Service `adminResetPassword` + controller + route + swagger

**Files:**
- Modify: `server/src/modules/user/user.service.ts`, `user.controller.ts`, `user.routes.ts`, `user/types`, `user/swagger/{paths,schemas}.ts`, postman
- Inject `EmailDispatcher` vào `UserService` (qua `user.module.ts`) — hiện chưa có; thêm dependency.

**Interfaces:**
- `UserService.adminResetPassword(id: string): Promise<{ _id: string; email: string }>`
- Route: `POST /admin/users/:id/reset-password`

- [ ] `user.module.ts`: truyền `emailDispatcher` vào `new UserService(...)` (module loader cấp EmailDispatcher — kiểm tra loader).
- [ ] Service:
```ts
async adminResetPassword(id: string): Promise<{ _id: string; email: string }> {
  validateObjectId(id, "id");
  const target = await this.userRepo.findAuthIdById(id); // { authId, email }
  if (!target) throw new NotFoundError({ i18nMessage: (t) => t("user:errors.notFound"), code: ERROR_CODES.USER_NOT_FOUND });
  if (target.authId === RequestContext.requireAuthId())
    throw new ForbiddenError({ i18nMessage: (t) => t("user:errors.cannotResetSelf"), code: ERROR_CODES.ADMIN_CANNOT_RESET_SELF });
  const tempPassword = generateTempPassword();
  const hashed = await hashValue(tempPassword);
  await this.authService.adminResetPassword(target.authId, hashed);
  this.emailDispatcher.send(EmailType.ADMIN_RESET_PASSWORD, {
    email: target.email,
    data: { tempPassword, loginUrl: ENV.CLIENT_URL || "http://localhost:3000/login" }
  });
  return { _id: id, email: target.email };
}
```
  (import `generateTempPassword` từ `@/modules/unlock-account/helpers`; nếu cross-module bị cấm → chuyển helper lên shared/util hoặc copy pure helper vào user module — theo module-struct.)
- [ ] Controller `resetUserPassword` → `OkSuccess({ data, message: "user:success.resetPassword" })`.
- [ ] Route trong `createUserAdminRoutes`: `adminUsers.post("/:id/reset-password", paramsPipe(adminUserIdParamsSchema), asyncHandler(controller.resetUserPassword))`.
- [ ] Swagger path + schema `{ _id, email }`; Postman.
- [ ] `yarn lint && yarn type-check && yarn test`. Commit: `feat(user): admin reset-password endpoint`.

### Task A7: BE tests

**Files:** `server/src/modules/user/user.service.spec.ts` (+ integration nếu có harness)

- [ ] Unit `adminResetPassword`: (a) sinh temp + gọi `authService.adminResetPassword` + `emailDispatcher.send` + trả `{_id,email}`; (b) self → 403 `ADMIN_CANNOT_RESET_SELF`; (c) not-found → 404. Mock repo/authService/emailDispatcher.
- [ ] Commit: `test(user): admin reset-password service`.

---

## PHẦN B — FRONTEND (`client/`, worktree `client/.worktrees/admin-reset-password`)

### Task B1: Constants (endpoints + routes)

**Files:** Modify `client/src/constants/endpoints.ts`, `client/src/constants/routes.ts`

- [ ] `endpoints.ts`: `ADMIN_USER_RESET_PASSWORD: "/admin/users/:id/reset-password"`.
- [ ] `routes.ts`: `FORCE_CHANGE_PASSWORD: "/change-password"` (+ route key nếu cần cho nav guard).
- [ ] Commit: `feat(client): constants for admin reset-password + force-change route`.

### Task B2: Request + wire hook + remove mock

**Files:** Modify `client/src/requests/adminUsers.ts`, `views/AdminUsers/hooks/useResetAdminUserPassword.ts`, `mocks/AdminUsers.ts`, `types/AdminUsers`

**Interfaces:** `resetAdminUserPassword(id: string): Promise<{ _id: string; email: string }>`

- [ ] `requests/adminUsers.ts`:
```ts
export const resetAdminUserPassword = async (id: string): Promise<{ _id: string; email: string }> => {
  const { data } = await axiosInstance.post<ResponsePattern<{ _id: string; email: string }>>(
    generatePath(END_POINTS.ADMIN_USER_RESET_PASSWORD, { id })
  );
  return data.data;
};
```
- [ ] Hook `useResetAdminUserPassword`: đổi import `@/mocks/AdminUsers` → `@/requests/adminUsers`. Giữ toast `resetSuccess` + announce (dialog đã lo announce).
- [ ] `mocks/AdminUsers.ts`: xóa `resetAdminUserPassword`.
- [ ] `yarn lint && npx tsc --noEmit`. Commit: `feat(admin-users): wire reset-password to real API`.

### Task B3: Expose `mustChangePassword` claim

**Files:** Modify `client/src/hooks/useUserInfo.ts`, `client/src/types/User/index.ts`

- [ ] `DecodedIdToken` thêm `mustChangePassword?: boolean`.
- [ ] `useUserInfo` return thêm `mustChangePassword: idPayload.mustChangePassword ?? false`.
- [ ] Commit: `feat(auth): expose mustChangePassword from idToken`.

### Task B4: Force-change gate trong AuthGuardLayout

**Files:**
- Create: `client/src/layouts/AuthGuardLayout/ghosts/MustChangePasswordGate/index.tsx`
- Modify: `client/src/layouts/AuthGuardLayout/index.tsx` (render ghost)

**Behavior:**
- [ ] Ghost đọc `useUserInfo()?.mustChangePassword` + `usePathname()`; nếu `true` và pathname ≠ `FORCE_CHANGE_PASSWORD` → `router.replace(FORCE_CHANGE_PASSWORD)` + announce. `useEffect` trong ghost.
- [ ] AuthGuardLayout render `<MustChangePasswordGate />` (chỉ khi có token, trong nhánh authenticated).
- [ ] Commit: `feat(auth-guard): force-change-password redirect gate`.

### Task B5: Route + layout + view force-change

**Files:**
- Create: `client/src/app/[locale]/(private)/(force-password)/layout.tsx` (shell auth tối giản — card giữa màn, no sidebar)
- Create: `client/src/app/[locale]/(private)/(force-password)/change-password/page.tsx`
- Create: `client/src/views/ForceChangePassword/{index.tsx, mains/ForceChangePasswordForm/index.tsx, ghosts/ForceChangeGuard/index.tsx}`
- Reuse: `@/forms/ChangePassword` (schema + fields), `@/schemas` passwordSchema

- [ ] `layout.tsx`: centered card container (theo design system `.claude/uiux` token; tham chiếu authen layout hiện có cho spacing/logo). Không sidebar.
- [ ] `page.tsx` render `<ForceChangePassword />`.
- [ ] View: form current(temp)+new+confirm dùng `useChangePassword` (nếu hook ở Profile/hooks — nâng lên `src/hooks/` để dùng chung, HOẶC tạo hook view-local tương tự). On success → `router.replace(HOME)` + announce.
- [ ] Ghost `ForceChangeGuard`: nếu `mustChangePassword=false` → `router.replace(HOME)` (không cần thì không cho ở lại).
- [ ] `yarn lint && npx tsc --noEmit && yarn build`. Commit: `feat(force-change): dedicated change-password route + form`.

### Task B6: i18n `forceChangePassword`

**Files:** Modify `client/src/locales/en/*.json`, `client/src/locales/vi/*.json`

- [ ] Namespace `forceChangePassword`: title, description, form labels (current/new/confirm), submit, validation (reuse pattern), announce (redirected, changed, saving).
- [ ] Commit: `feat(i18n): forceChangePassword en+vi`.

---

## PHẦN C — E2E (`client/`)

### Task C1: E2E suite `admin-users-reset` (expand matrix)

**Files:**
- Create: `client/e2e/admin-users-reset/reset-action.e2e.ts` (S1, project admin)
- Create: `client/e2e/admin-users-reset/force-change.e2e.ts` (S2, context user thường + temp pw)
- Create: `docs/specs/admin-reset-password/e2e.md`
- Reuse: helpers `client/e2e/helpers/`, auth setup

- [ ] Expand từng row Applicable trong Scenario Matrix (design.md) thành test. Row `A only` = gate A own mutation. Defer `test.fixme` cho non-admin authz (ghi lý do).
- [ ] Seed: user thường dành riêng reset (revert mật khẩu ở `afterAll` idempotent).
- [ ] Chạy completeness-critic (1 subagent) trước khi chốt (feature auth-sensitive).
- [ ] `e2e.md`: liệt kê scenario final + follow-up gaps.
- [ ] Commit (docs + client): `test(e2e): admin reset-password + force-change scenarios`.

---

## Self-Review (đã chạy)

- **Spec coverage**: §3 BE → A1–A7; §4 FE → B1–B6; E2E matrix → C1. ✅
- **Type consistency**: `adminResetPassword(authId,hash)` (repo/service) khớp; `resetAdminUserPassword(id)→{_id,email}` FE khớp API contract §5; `mustChangePassword` claim nhất quán BE↔FE. ✅
- **Placeholder**: helper cross-module `generateTempPassword` — flagged phương án (import/relocate) ở A6, không để mơ hồ. Rate-limit reset: defer có ghi ở design §7. ✅
- **Gaps**: enforce clear-cờ ở change-password qua `updatePassword` (A2) — đã cover. Token refresh call-site (A4) — đã liệt kê.
