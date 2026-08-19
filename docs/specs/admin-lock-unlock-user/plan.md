# Admin Lock/Unlock User — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the existing (mocked) admin lock/unlock user UI to a real backend that toggles `auth.isActive`.

**Architecture:** Two admin-only PATCH endpoints (`/admin/users/:id/lock|unlock`) call `UserService.setUserActive`, which resolves the target's `authId` and flips `auth.isActive` via `AuthenticationService.setActive`. Soft lock: blocks future login (`AccountActiveGuard`) + refresh (`AuthActiveGuard`); no per-request enforcement. FE hooks swap their `mutationFn` from `@/mocks/AdminUsers` to `@/requests/adminUsers`.

**Tech Stack:** Express + Mongoose (BE), Next.js 15 + React 19 + React Query + next-intl (FE), Playwright (E2E), Jest (BE tests).

## Global Constraints

- BE module conventions: `server/.claude/skills/module-struct` (barrel pattern, i18n thunk `(t) => t(...)`, `ERROR_CODES`). Read `server/.claude/CLAUDE.md` before touching `server/src/**`.
- FE conventions: read `client/.claude/CLAUDE.md`; every new user-facing string goes through next-intl (`.claude/uiux/ux-copy.md`); icons via `.claude/uiux/icon-map.md` (no new icons needed here).
- Lock flag = `auth.isActive` (collection `auths`); **do not** add a new field, **do not** touch the Redis failed-attempts lockout.
- Idempotent: lock already-locked / unlock already-active → 200, no error.
- Return contract: `{ _id: string; isActive: boolean }`.
- Admin CANNOT lock self (403 `ADMIN_CANNOT_LOCK_SELF`); locking other admins allowed.
- Commit after each task (worktree branch `feat/admin-lock-unlock-user`, per-repo).
- Jest-in-worktree: run with `npx jest --testMatch "**/?(*.)+(spec).ts" <path>` (rootDir glob breaks in `.worktrees/` — see project memory).

## File Structure

**server/** (worktree `server/.worktrees/admin-lock-unlock-user/`)
- Modify `src/constants/error-code.ts` — add `ADMIN_CANNOT_LOCK_SELF`.
- Modify `src/i18n/locales/{en,vi}/user.json` — success + error messages.
- Modify `src/modules/authentication/authentication.repository.ts` — add `setActive`.
- Modify `src/modules/authentication/authentication.service.ts` — add `setActive`.
- Modify `src/modules/user/user.repository.ts` — add `findAuthIdById`.
- Modify `src/modules/user/user.service.ts` — inject `AuthenticationService`, add `setUserActive`.
- Modify `src/modules/user/user.module.ts` + `src/loaders/modules.loader.ts` — pass `authService` into user module.
- Modify `src/modules/user/user.controller.ts` — `lockUser`, `unlockUser`.
- Modify `src/modules/user/user.routes.ts` — 2 PATCH routes + params pipe.
- Modify `src/modules/user/types/index.ts` — `SetUserActiveResult`, `LockUserRequest`.
- Modify `src/validators/schemas/user.ts` — reuse/add `adminUserIdParamsSchema`.
- Modify `src/modules/user/swagger/paths.ts` + `schemas.ts` + Postman collection.
- Test: `src/modules/user/user.service.spec.ts` (extend).

**client/** (worktree `client/.worktrees/admin-lock-unlock-user/`)
- Modify `src/constants/endpoints.ts` — `ADMIN_USER_LOCK`, `ADMIN_USER_UNLOCK`.
- Modify `src/requests/adminUsers.ts` — `lockAdminUser`, `unlockAdminUser`.
- Modify `src/types/AdminUsers/index.ts` — `SetAdminUserActiveResult`.
- Modify `src/views/AdminUsers/hooks/useLockAdminUser.ts` + `useUnlockAdminUser.ts` — swap import.
- Modify `src/mocks/AdminUsers.ts` — remove `lockAdminUser`/`unlockAdminUser`.
- Create `e2e/admin-users-lock/lock-unlock.e2e.ts`.
- Modify `e2e/admin-authz/admin-authz.e2e.ts` — add lock/unlock denial rows.
- Modify `playwright.config.ts` — route `admin-users-lock` to admin project + ignore in chromium.

**docs/** — `specs/admin-lock-unlock-user/e2e.md` (execution), `security-report.md`, `e2e-bugs.md` (if needed).

---

## Task BE-1: Error code + i18n messages

**Files:**
- Modify: `src/constants/error-code.ts`
- Modify: `src/i18n/locales/en/user.json`, `src/i18n/locales/vi/user.json`

**Interfaces:**
- Produces: `ERROR_CODES.ADMIN_CANNOT_LOCK_SELF`; i18n keys `user:success.lockUser`, `user:success.unlockUser`, `user:errors.cannotLockSelf`.

- [ ] **Step 1:** Add to `ERROR_CODES` (near other admin/user codes):
```ts
ADMIN_CANNOT_LOCK_SELF: "ADMIN_CANNOT_LOCK_SELF",
```
- [ ] **Step 2:** `en/user.json` — add under `success`: `"lockUser": "User locked successfully"`, `"unlockUser": "User unlocked successfully"`; under `errors`: `"cannotLockSelf": "You cannot lock your own account"`.
- [ ] **Step 3:** `vi/user.json` — mirror keys: `"lockUser": "Đã khóa người dùng"`, `"unlockUser": "Đã mở khóa người dùng"`, `"cannotLockSelf": "Bạn không thể tự khóa tài khoản của chính mình"`. (Match existing vi tone in the file.)
- [ ] **Step 4:** Verify JSON valid: `cd server/.worktrees/admin-lock-unlock-user && node -e "require('./src/i18n/locales/en/user.json');require('./src/i18n/locales/vi/user.json');console.log('ok')"`.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(user): add lock/unlock i18n messages + ADMIN_CANNOT_LOCK_SELF error code"`.

---

## Task BE-2: Auth + User repository methods

**Files:**
- Modify: `src/modules/authentication/authentication.repository.ts`
- Modify: `src/modules/authentication/authentication.service.ts`
- Modify: `src/modules/user/user.repository.ts`
- Test: `src/modules/authentication/authentication.service.spec.ts` (create if absent)

**Interfaces:**
- Produces:
  - `AuthenticationRepository.setActive(authId: string, isActive: boolean): Promise<void>`
  - `AuthenticationService.setActive(authId: string, isActive: boolean): Promise<void>`
  - `UserRepository.findAuthIdById(userId: string): Promise<{ authId: string } | null>`

- [ ] **Step 1:** In `authentication.repository.ts` add to the `AuthenticationRepository` type: `setActive(authId: string, isActive: boolean): Promise<void>;` and implement in `MongoAuthenticationRepository`:
```ts
async setActive(authId: string, isActive: boolean): Promise<void> {
  await asyncDatabaseHandler("setActive", () =>
    AuthenticationModel.findByIdAndUpdate(authId, { $set: { isActive } }).exec()
  );
}
```
- [ ] **Step 2:** In `authentication.service.ts` add:
```ts
async setActive(authId: string, isActive: boolean): Promise<void> {
  validateObjectId(authId, "authId");
  try {
    await this.authRepo.setActive(authId, isActive);
    Logger.info("Account active flag updated", { authId, isActive });
  } catch (error) {
    Logger.error("Failed to update account active flag", { authId, isActive, error });
    throw error;
  }
}
```
- [ ] **Step 3:** In `user.repository.ts` add to `UserRepository` type: `findAuthIdById(userId: string): Promise<{ authId: string } | null>;` and implement:
```ts
async findAuthIdById(userId: string): Promise<{ authId: string } | null> {
  return asyncDatabaseHandler("findAuthIdById", async () => {
    const doc = await UserModel.findById(userId).select("authId").lean<{ authId: { toString(): string } }>().exec();
    return doc ? { authId: doc.authId.toString() } : null;
  });
}
```
- [ ] **Step 4:** Write test `authentication.service.spec.ts` for `setActive`: mock repo, assert `validateObjectId` rejects bad id, assert repo called with `(authId, false)`.
- [ ] **Step 5:** Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/authentication` → PASS.
- [ ] **Step 6:** Commit: `git add -A && git commit -m "feat(user,auth): add setActive + findAuthIdById repository methods"`.

---

## Task BE-3: UserService.setUserActive + module wiring

**Files:**
- Modify: `src/modules/user/user.service.ts`
- Modify: `src/modules/user/user.module.ts`
- Modify: `src/loaders/modules.loader.ts`
- Modify: `src/modules/user/types/index.ts`
- Test: `src/modules/user/user.service.spec.ts`

**Interfaces:**
- Consumes: `AuthenticationService.setActive`, `UserRepository.findAuthIdById`, `RequestContext.requireAuthId()`, `validateObjectId`, `ForbiddenError`, `NotFoundError`, `ERROR_CODES`.
- Produces: `UserService.setUserActive(id: string, isActive: boolean): Promise<SetUserActiveResult>`; type `SetUserActiveResult { _id: string; isActive: boolean }`.

- [ ] **Step 1:** Add type to `user/types/index.ts`:
```ts
export interface SetUserActiveResult {
  _id: string;
  isActive: boolean;
}
```
- [ ] **Step 2:** Write failing tests in `user.service.spec.ts` (extend existing setup; inject a mock `AuthenticationService`):
  - lock success: `setUserActive(id, false)` → returns `{ _id: id, isActive: false }`, calls `authService.setActive(authId, false)`.
  - unlock success: returns `{ _id, isActive: true }`.
  - not found: `findAuthIdById` → null → throws `NotFoundError` (`USER_NOT_FOUND`), `authService.setActive` NOT called.
  - self-lock: target authId === `RequestContext.requireAuthId()` and `isActive=false` → throws `ForbiddenError` (`ADMIN_CANNOT_LOCK_SELF`); mock `RequestContext.requireAuthId` to return the target authId.
  - self **unlock** allowed: same authId but `isActive=true` → succeeds (no throw).
  - idempotent: repo returns authId regardless of current flag → `setActive` still called (no pre-read).
- [ ] **Step 3:** Run tests → FAIL (method undefined).
- [ ] **Step 4:** Modify `UserService` constructor to accept auth service and add method:
```ts
constructor(
  private readonly userRepo: UserRepository,
  private readonly authService: AuthenticationService
) {}

async setUserActive(id: string, isActive: boolean): Promise<SetUserActiveResult> {
  validateObjectId(id, "id");

  const target = await this.userRepo.findAuthIdById(id);
  if (!target) {
    throw new NotFoundError({
      i18nMessage: (t) => t("user:errors.notFound"),
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  if (!isActive && target.authId === RequestContext.requireAuthId()) {
    throw new ForbiddenError({
      i18nMessage: (t) => t("user:errors.cannotLockSelf"),
      code: ERROR_CODES.ADMIN_CANNOT_LOCK_SELF
    });
  }

  await this.authService.setActive(target.authId, isActive);
  return { _id: id, isActive };
}
```
  Add imports: `ForbiddenError` from `@/common/exceptions`, `AuthenticationService` type, `SetUserActiveResult`.
- [ ] **Step 5:** Wire `user.module.ts`:
```ts
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
export const createUserModule = (
  rateLimiter: RateLimiterMiddleware,
  authService: AuthenticationService
) => {
  const userRepo = new MongoUserRepository();
  const userService = new UserService(userRepo, authService);
  ...
};
```
- [ ] **Step 6:** In `modules.loader.ts` change the call to `createUserModule(rateLimiter, authService)` (authService already created above userModule).
- [ ] **Step 7:** Run: `npx jest --testMatch "**/?(*.)+(spec).ts" src/modules/user` → PASS.
- [ ] **Step 8:** Commit: `git add -A && git commit -m "feat(user): add setUserActive service with self-lock guard"`.

---

## Task BE-4: Controller + routes + validation

**Files:**
- Modify: `src/modules/user/user.controller.ts`
- Modify: `src/modules/user/user.routes.ts`
- Modify: `src/modules/user/types/index.ts`
- Modify: `src/validators/schemas/user.ts`

**Interfaces:**
- Consumes: `UserService.setUserActive`, `paramsPipe`, `adminUserIdParamsSchema`.
- Produces: routes `PATCH /admin/users/:id/lock`, `PATCH /admin/users/:id/unlock`.

- [ ] **Step 1:** Add request type to `user/types/index.ts`:
```ts
export interface LockUserRequest extends Omit<Request, "params"> {
  params: { id: string };
}
```
- [ ] **Step 2:** Add params schema to `validators/schemas/user.ts` (reuse the existing objectId pattern; export a clearly-named schema):
```ts
export const adminUserIdParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .required()
    .messages({
      "string.empty": "user:errors.invalidId",
      "string.pattern.base": "user:errors.invalidId",
      "any.required": "user:errors.invalidId"
    })
});
```
- [ ] **Step 3:** Add controller methods to `UserController`:
```ts
lockUser = async (req: LockUserRequest, res: Response): Promise<void> => {
  const data = await this.service.setUserActive(req.params.id, false);
  new OkSuccess({ data, message: "user:success.lockUser" }).send(req, res);
};

unlockUser = async (req: LockUserRequest, res: Response): Promise<void> => {
  const data = await this.service.setUserActive(req.params.id, true);
  new OkSuccess({ data, message: "user:success.unlockUser" }).send(req, res);
};
```
  Import `LockUserRequest` in the controller types block.
- [ ] **Step 4:** Add routes in `createUserAdminRoutes` (after the `GET "/"`), importing `adminUserIdParamsSchema`:
```ts
adminUsers.patch(
  "/:id/lock",
  paramsPipe(adminUserIdParamsSchema),
  asyncHandler(controller.lockUser)
);
adminUsers.patch(
  "/:id/unlock",
  paramsPipe(adminUserIdParamsSchema),
  asyncHandler(controller.unlockUser)
);
```
  (`authGuard + adminGuard` already applied via `adminUsers.use(...)`.)
- [ ] **Step 5:** Type-check: `cd server/.worktrees/admin-lock-unlock-user && yarn type-check`.
- [ ] **Step 6:** Manual/route smoke (optional, if app running): `curl -X PATCH .../api/v1/admin/users/<id>/lock` with admin bearer → 200 `{ _id, isActive:false }`.
- [ ] **Step 7:** Commit: `git add -A && git commit -m "feat(user): add lock/unlock admin routes + controller"`.

---

## Task BE-5: Swagger + Postman docs

**Files:**
- Modify: `src/modules/user/swagger/paths.ts`, `src/modules/user/swagger/schemas.ts`, `src/modules/user/swagger/user.postman_collection.json`

**Interfaces:** documentation only.

- [ ] **Step 1:** Add OpenAPI path entries for `PATCH /admin/users/{id}/lock` and `/unlock` (admin bearer; responses 200 `{ _id, isActive }`, 400 invalid id, 403 self-lock/not-admin, 404 not found). Follow the existing style in `paths.ts`.
- [ ] **Step 2:** Add a response schema `SetUserActiveResult` to `schemas.ts` (`{ _id: string, isActive: boolean }`).
- [ ] **Step 3:** Add two requests to the Postman collection mirroring existing admin-users entries.
- [ ] **Step 4:** Build to confirm swagger wiring compiles: `yarn build`.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "docs(user): swagger + postman for lock/unlock endpoints"`.

---

## Task FE-1: Endpoints + request functions

**Files:**
- Modify: `src/constants/endpoints.ts`
- Modify: `src/requests/adminUsers.ts`
- Modify: `src/types/AdminUsers/index.ts`

**Interfaces:**
- Produces: `END_POINTS.ADMIN_USER_LOCK`, `END_POINTS.ADMIN_USER_UNLOCK`; `lockAdminUser(id)`, `unlockAdminUser(id)`; type `SetAdminUserActiveResult`.

- [ ] **Step 1:** In `endpoints.ts` under `// Users (admin)`:
```ts
ADMIN_USER_LOCK: "/admin/users/:id/lock",
ADMIN_USER_UNLOCK: "/admin/users/:id/unlock",
```
- [ ] **Step 2:** In `types/AdminUsers/index.ts` add:
```ts
export interface SetAdminUserActiveResult {
  _id: string;
  isActive: boolean;
}
```
- [ ] **Step 3:** In `requests/adminUsers.ts` add (import `generatePath` from `@/utils`, `SetAdminUserActiveResult` type):
```ts
export const lockAdminUser = async (
  id: string
): Promise<SetAdminUserActiveResult> => {
  const response = await axiosInstance.patch<
    ResponsePattern<SetAdminUserActiveResult>
  >(generatePath(END_POINTS.ADMIN_USER_LOCK, { id }));
  return response.data.data;
};

export const unlockAdminUser = async (
  id: string
): Promise<SetAdminUserActiveResult> => {
  const response = await axiosInstance.patch<
    ResponsePattern<SetAdminUserActiveResult>
  >(generatePath(END_POINTS.ADMIN_USER_UNLOCK, { id }));
  return response.data.data;
};
```
- [ ] **Step 4:** Lint touched files: `cd client/.worktrees/admin-lock-unlock-user && npx eslint src/requests/adminUsers.ts src/constants/endpoints.ts src/types/AdminUsers/index.ts`.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "feat(admin-users): add lock/unlock request functions + endpoints"`.

---

## Task FE-2: Swap hooks mock → real API

**Files:**
- Modify: `src/views/AdminUsers/hooks/useLockAdminUser.ts`
- Modify: `src/views/AdminUsers/hooks/useUnlockAdminUser.ts`
- Modify: `src/mocks/AdminUsers.ts`

**Interfaces:**
- Consumes: `lockAdminUser`, `unlockAdminUser` from `@/requests/adminUsers`.

- [ ] **Step 1:** In `useLockAdminUser.ts` change import `from "@/mocks/AdminUsers"` → `from "@/requests/adminUsers"`. `mutationFn: lockAdminUser` unchanged (still `(id: string) => Promise<...>`). Keep invalidate + toast + (dialog handles announce).
- [ ] **Step 2:** Same swap in `useUnlockAdminUser.ts` (`unlockAdminUser`).
- [ ] **Step 3:** In `mocks/AdminUsers.ts` delete the `lockAdminUser` and `unlockAdminUser` exports (keep `getAdminUsers`, `getAdminUserById`, `resetAdminUserPassword`, `forceLogoutAdminUser`, `MOCK_ADMIN_USERS`, `updateUser` helper if still used by remaining fns — keep `updateUser` only if referenced; otherwise remove to avoid unused-var lint).
- [ ] **Step 4:** Verify no other importer of the removed mocks: `grep -rn "lockAdminUser\|unlockAdminUser" src | grep mocks` → only the request file / hooks now.
- [ ] **Step 5:** Lint + build: `npx eslint src/views/AdminUsers/hooks src/mocks/AdminUsers.ts && yarn build` (build type-checks).
- [ ] **Step 6:** Commit: `git add -A && git commit -m "feat(admin-users): wire lock/unlock hooks to real API"`.

---

## Task E2E-1: admin-users-lock suite (gate A)

**Files:**
- Create: `e2e/admin-users-lock/lock-unlock.e2e.ts`
- Modify: `playwright.config.ts`

**Interfaces:** consumes seeded users `admin@test.com` (actor), `user2@test.com` (lock target, revert), `inactive@test.com` (already locked → unlock target, re-lock in afterAll).

- [ ] **Step 1:** In `playwright.config.ts`: add `admin-users-lock` to the **admin** project `testMatch` alternation and to the **chromium** project `testIgnore` alternation (same list style as `admin-apps|admin-users-list|...`).
- [ ] **Step 2:** Create the suite. Structure (Playwright, admin storageState via project):
  - `test.describe("Admin lock/unlock user")`.
  - Helpers: navigate to `/admin/users`; find a user row by email text; open its `MoreHorizontal` row-action menu (aria-label from `adminUsers.table.rowMenuLabel`); click Lock/Unlock item; confirm in dialog (button text `adminUsers.actions.confirmLock|confirmUnlock`).
  - **Happy lock (row 1)**: on `user2@test.com` row → menu → Lock → confirm → assert success toast text; assert that row's status badge shows "Locked" after list refetch. Then **revert**: unlock it (leaves suite clean even before afterAll).
  - **Happy unlock (row 1)**: on `inactive@test.com` → menu shows "Unlock" (since isActive=false) → Unlock → confirm → badge "Active". (afterAll re-locks it.)
  - **Idempotent (row 11)**: lock `user2@test.com`, then via `page.request` with admin bearer token PATCH `/lock` again → 200; badge stays Locked.
  - **Data render (row 8)**: assert badge label is localized "Active"/"Locked" (not `true/false`); dropdown item label toggles Lock↔Unlock per current state.
  - **i18n (row 9)**: repeat the lock dialog open in `?...`/vi locale (navigate with `/vi/admin/users` or set locale cookie per existing i18n tests) → assert dialog title/desc + confirm button + toast render vi strings; and en.
  - **Error/loading (row 10)**: intercept the PATCH with `page.route(...)` → fulfill 500 → confirm → assert error toast + confirm button not stuck (re-enabled); badge did NOT flip (non-optimistic).
  - **Filter (row 7)**: lock `user2@test.com` → set status filter `locked` → row visible; set `active` → row hidden. Revert.
  - **Mutation safety double-submit (row 11)**: click confirm rapidly twice with the PATCH delayed via `page.route` → assert exactly one PATCH fired (count network requests).
  - **Login-after-lock (row 11 downstream, gate A only)**: create a fresh `playwrightRequest.newContext()`; lock `user2@test.com` (admin bearer); attempt `POST /api/v1/auth/login` as user2 → expect non-ok + body `code: "LOGIN_ACCOUNT_INACTIVE"`; unlock; login again → ok.
  - **a11y (row 12)**: open menu via keyboard (focus trigger, Enter); dialog focus trap; ESC closes dialog and fires 0 PATCH; Cancel closes with 0 PATCH; keyboard Enter on confirm fires exactly 1.
  - **Validation via API (row 4, admin session)**: with admin bearer via `page.request`: PATCH `/admin/users/zzz/lock` → 400; `/admin/users/<valid-but-missing-24hex>/lock` → 404; PATCH lock on the admin's OWN id → 403 `ADMIN_CANNOT_LOCK_SELF` (fetch own id from `/api/v1/users/me` then map to admin-users list `_id`).
  - `test.afterAll`: ensure `user2@test.com` unlocked and `inactive@test.com` locked (idempotent PATCH via admin request context) to restore seed state.
- [ ] **Step 3:** Note in `docs/specs/admin-lock-unlock-user/e2e.md`: rate-limit awareness — keep real logins minimal (login guard 30/15min); the login-after-lock case does ≤3 logins.
- [ ] **Step 4:** (App must be running — see §4.3 preflight.) Run the suite: `cd client && yarn playwright test admin-users-lock` → PASS.
- [ ] **Step 5:** Commit: `git add -A && git commit -m "test(admin-users-lock): e2e for lock/unlock (gate A)"`.

---

## Task E2E-2: AuthN + AuthZ denial

**Files:**
- Modify: `e2e/admin-authz/admin-authz.e2e.ts`

**Interfaces:** runs under chromium (non-admin storageState) + a token-less request context for AuthN.

- [ ] **Step 1:** Add a non-admin denial check for the lock endpoint: reuse the `apiContext` + `nonAdminToken` pattern already in the file. Add a test asserting `PATCH /api/v1/admin/users/<anyId>/lock` with the non-admin bearer → 403 `AUTH_ADMIN_ONLY` (guard order: adminGuard rejects before self-check). Do the same for `/unlock`.
- [ ] **Step 2:** Add an AuthN check: a fresh token-less `playwrightRequest.newContext()` → `PATCH /api/v1/admin/users/<anyId>/lock` → 401 `AUTH_MISSING_TOKEN`.
- [ ] **Step 3:** Run: `cd client && yarn playwright test admin-authz` → PASS.
- [ ] **Step 4:** Commit: `git add -A && git commit -m "test(admin-authz): lock/unlock authN + authZ denial"`.

---

## Task DOCS-1: Write e2e.md

**Files:**
- Create: `docs/specs/admin-lock-unlock-user/e2e.md`

- [ ] **Step 1:** Record the final scenario list (mirror design.md matrix rows with their gate tags), which seeded users each uses, and the two deferred cases (§design "Deferred / N/A"). Note gate-B (MCP walk) verifies render/i18n/a11y only, no mutation.
- [ ] **Step 2:** Commit (docs worktree): `git add -A && git commit -m "docs(admin-lock-unlock-user): e2e scenario execution notes"`.

---

## Self-Review

- **Spec coverage:** BE endpoints (BE-4), isActive toggle (BE-2/3), self-lock guard (BE-3), idempotency (BE-3 test + E2E-1), soft-lock semantics (unchanged authGuard; login/refresh guards already exist; verified via E2E-1 login-after-lock + design BE-contract notes), FE wiring (FE-1/2), remove mocks (FE-2), all 12 matrix rows (E2E-1/2 + BE-3), swagger (BE-5). ✅
- **Placeholder scan:** none — all steps carry concrete code/commands.
- **Type consistency:** `SetUserActiveResult` (BE) ↔ `SetAdminUserActiveResult` (FE) both `{ _id, isActive }`; `setUserActive(id, isActive)`, `setActive(authId, isActive)`, `findAuthIdById(userId)` consistent across BE-2/3/4. `lockAdminUser(id)`/`unlockAdminUser(id)` consistent FE-1/2.
