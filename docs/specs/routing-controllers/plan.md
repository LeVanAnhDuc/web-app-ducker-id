# Annotated controllers — routing-controllers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Declare every `/api/v1` route (63, OAuth excluded) on its controller method — verb, path, guards, rate limits, input DTOs, status and message — and delete the hand-assembled `*.routes.ts`, with no change any client can observe.

**Architecture:** Our decorators only **record** route metadata. One function, `mountControllers()`, reads it and registers each action with routing-controllers: it applies `HttpCode` / `OnUndefined`, and one `UseBefore(...)` whose middleware list is built by `orderMiddlewares()` in a fixed order. Decorator position therefore never decides order. A global interceptor builds the success envelope; `error.filter.ts` keeps answering errors; controllers stay hand-built and are handed over through `useContainer`.

**Tech Stack:** Express 5.2, routing-controllers 0.11.3 (pinned, already a dependency since the spike), class-validator 0.15 + the #43 DTOs, express-rate-limit via the `RATE_LIMITS` table (#44), Jest + `fetch` against a real HTTP server, Playwright API suite in `automation-test/`.

**Spec:** `docs/specs/routing-controllers/design.md`

Paths are relative to the worktree root `.worktrees/routing-controllers/`; `@/` is `server/src/`.

## Global Constraints

- **Middleware order is computed, never written by hand:**
  `IP/email-keyed limiters > guards (class first, then method) > user-keyed limiters > params pipe > query pipe > body pipe`.
  It reproduces all 63 current chains exactly (Appendix A, generated from the `*.routes.ts` on `main` at `a9726083`). This **replaces** the design's "guards on the class, limits on the method": `PATCH /users/me`, `POST /contact/submit` and `GET /apps/categories` run an IP limiter **before** the guard, so a bad or missing token is still counted.
- A limiter is user-keyed when its `RATE_LIMITS` key generator is `byIpAndAuth` or `byUser`. That is decided in one place, `isUserKeyed(name)`.
- Modules never import `UseBefore`, `UseAfter`, `Authorized`, `Body`, `QueryParam(s)`, `Params`, `HttpCode` or `OnUndefined` from `routing-controllers`. They use only `@/common/routing`, plus the verb, `JsonController`, `Req` and `Res` decorators. A spec enforces this.
- Within a class, methods are declared in the same order as the routes in today's `*.routes.ts`, because routing-controllers registers actions in declaration order. `GET /users/me` must precede `GET /users/:id`.
- `createModules()` returns controllers in the same order as today's `apiRouters`.
- Statuses, messages, paths and error bodies are copied from Appendix A; nothing is renamed.
- OAuth routes, `/health`, Bull Board and Swagger stay as they are. `bodyPipe` / `paramsPipe` / `queryPipe` stay exported for OAuth.
- Dependencies pinned exactly (`pnpm add -E`). `server/.claude/rules/*.md` are local-only and never committed.
- **User review gate before every commit.** Conventional Commits, scope `routing`, English subject.

## Review Focus

1. **Trailing slash and the class root.** `@Get("/")` under `@JsonController("/users/me/favorites")` must answer both `/users/me/favorites` and `/users/me/favorites/`, as Express does today. Test in Task 1 (fixture) and Task 2 (favorites).
2. **Static segment before a parameter.** `GET /users/me` must not be swallowed by `GET /users/:id`. Test in Task 4 (user), and the declaration-order constraint above.
3. **A 2xx route whose action returns nothing.** `POST /favorites/:appId` (201) and every `OK` route returning `undefined` must still send the envelope with `data` omitted, not a 204 or a 404. Only `NO_CONTENT` routes send an empty body. Test in Task 1.
4. **Errors from every stage reach `error.filter.ts`:** a guard's 401, a limiter's 429 (its own handler), a pipe's 400 `VALIDATION_ERROR`, a service `AppError`, an unknown throw (logged 500), and an unknown path under `/api/v1` (404 `NOT_FOUND` envelope). Test in Task 1.
5. **Controllers that write the response themselves** (`@Res()`: refresh cookie, redirect). The interceptor must not wrap or double-send. Test in Task 1 (fixture), Task 5 (login cookie).

---

### Task 1: Routing core

**Files:**
- Create: `server/src/common/routing/metadata.ts`: our metadata store (`WeakMap<Function, …>`, no global registry beyond routing-controllers' own).
- Create: `server/src/common/routing/decorators.ts`
- Create: `server/src/common/routing/order.ts`
- Create: `server/src/common/routing/envelope.interceptor.ts`
- Create: `server/src/common/routing/mount.ts`
- Create: `server/src/common/routing/index.ts` (barrel)
- Create: `server/src/common/routing/spec/{order,mount}.spec.ts`
- Modify: `server/src/middlewares/pipes/validation.pipe.ts`: extract the body of `validationPipe` into an exported `validateRequest(req, source, Dto): Promise<void>` (throws `ValidationError`, writes back with `Object.defineProperty`); `bodyPipe` / `paramsPipe` / `queryPipe` keep their signatures and call it.
- Modify: `server/src/middlewares/common/rate-limiter.middleware.ts`: export `isUserKeyed(name: RateLimitName): boolean`.

**Interfaces:**
- Produces, from `@/common/routing`:
  - Guards (class or method): `Auth()`, `Admin()`, `OptionalAuth()`, `PasswordChangeAuth()`. They resolve to `authGuard`, `adminGuard`, `optionalAuthGuard`, `passwordChangeAuthGuard`; `Admin` implies nothing, so write `@Auth() @Admin()`.
  - `RateLimit(...names: RateLimitName[])`: method only.
  - `ValidParams(Dto)`, `ValidQuery(Dto)`, `ValidBody(Dto)`: parameter decorators. They record the DTO for the pipe stage, and inject `req.params` / `req.query` / `req.body` (already validated by then) through `createParamDecorator`.
  - `Respond(options?: { status?: number; message?: I18n.Key })`: mirrors today's `handle(…, options)`. The default status is 200.
  - `type RouteChainLabel = string`, e.g. `"rl:loginByIp"`, `"auth"`, `"body:LoginBodyDto"`.
  - `orderMiddlewares(route: RouteMeta, rl: RateLimiters): { handlers: RequestHandler[]; labels: RouteChainLabel[] }`.
  - `mountControllers(app: Express, controllers: object[], rl: RateLimiters): void`. It runs `useContainer`, applies each action's `UseBefore(...handlers)`, `HttpCode`, and `OnUndefined(204)` for `NO_CONTENT`, then `useExpressServer(app, { routePrefix: "/api/v1", controllers: classes, defaultErrorHandler: false, validation: false, classTransformer: false, interceptors: [EnvelopeInterceptor] })`.
  - `describeRoutes(controllers: object[], rl: RateLimiters): Array<{ method: string; path: string; chain: string; status: string; message: string; action: string }>`, used by the manifest spec from Task 2 on.
- `EnvelopeInterceptor.intercept(action, content)`:
  - returns `content` untouched when it is `action.response`, or when the route's status is 204;
  - otherwise returns `{ timestamp, path: req.originalUrl, message: key ? req.t(key) : "", data: content }`.
  - The route's `{ status, message }` reaches it through `res.locals.respond`, set by the first handler `orderMiddlewares` emits.

- [ ] **Step 1: Write failing tests**
  - `order.spec.ts`, pure, with fake handlers. It asserts `labels` for:
    - `rl:updateProfileByIp > auth > body:X` (IP limiter before guard);
    - `auth > admin > rl:categoryMutationByIpAndUser > params:P > body:B` (class guards, user limiter, params before body);
    - `rl:categoriesByIp > optionalAuth`;
    - `passwordChangeAuth > rl:changePasswordByIpAndUser > body:B`;
    - and that decorator order on the method does not change the result.
  - `mount.spec.ts` is the spike's harness, with fixture controllers on a real Express 5 server, `error.filter.ts` and `handleNotFound` mounted after. Tests:
    - `"answers the class root with and without a trailing slash"`;
    - `"sends the envelope with data omitted when a 201 action returns undefined"`;
    - `"sends 204 with an empty body for a NO_CONTENT route"`;
    - `"translates @Respond message per request"` (an `accept-language: vi` header gives the vi text);
    - `"leaves a response written through @Res untouched"`;
    - `"answers a failed ValidBody with 400 VALIDATION_ERROR and errors[] as bodyPipe does"`;
    - `"answers an unknown /api/v1 path with the 404 envelope"`;
    - `"logs and answers an unknown throw as 500"`;
    - `"refuses at mount a user-keyed limiter on a route without a guard"`;
    - `"refuses at mount a module importing UseBefore or Authorized from routing-controllers"`, which scans `src/modules/**/*.controller.ts` for those imports.
- [ ] **Step 2:** `pnpm test src/common/routing`: FAIL (modules missing).
- [ ] **Step 3:** Implement the files above. Delete `spike.spec.ts`; `mount.spec.ts` supersedes it.
- [ ] **Step 4:** `pnpm test src/common/routing` PASS, and `pnpm type-check`, `pnpm lint` clean.
- [ ] **Step 5:** Review gate, then commit `feat(routing): metadata decorators, computed middleware order, envelope interceptor`.

### Task 2: Mount beside the routers, and pilot `favorite`

**Files:**
- Modify: `server/src/loaders/modules.ts`: `ModuleRouters` gains `controllers: object[]`, in `apiRouters` order. Both coexist until Task 6.
- Modify: `server/src/loaders/http.ts`: call `mountControllers(app, parts.controllers, parts.rateLimiters)` right after `app.use("/api/v1", v1Router)` and before `/health`; `handleNotFound` and `handleError` stay last. `rateLimiters` becomes part of `ModuleRouters`.
- Modify: `server/src/modules/favorite/favorite.controller.ts`: `@JsonController("/users/me/favorites") @Auth()`; methods `list(@ValidQuery(ListFavoritesQueryDto) q)`, `add(@ValidParams(FavoriteAppIdParamsDto) p)`, `remove(...)`, each with the `@Respond` from Appendix A.
- Modify: `server/src/modules/favorite/favorite.module.ts`: return `favoriteController` instead of `favoriteUserRouter`.
- Delete: `server/src/modules/favorite/favorite.routes.ts`
- Create: `server/src/common/routing/spec/route-manifest.spec.ts`: builds `describeRoutes` from the real module factories with fake Redis and repositories, and matches **Appendix A rows for migrated modules only**. The expected rows are an inline array copied from Appendix A, grown in each later task.

- [ ] **Step 1:** Add favorite's 3 rows to `route-manifest.spec.ts` and run it: FAIL.
- [ ] **Step 2:** Implement. `pnpm test` PASS, type-check and lint clean.
- [ ] **Step 3:** Run the API suite for favorites against the dedicated e2e stack (`automation-test/src/docs/test-plan.md`; `DB_NAME=ducker-id-e2e`, API `:5600`, production client `:3600`, `E2E_BASE_URL` set): `cd automation-test && pnpm test src/tests/api/favorites`. All green, including the no-trailing-slash list call.
- [ ] **Step 4:** Review gate, then commit `refactor(routing): mount annotated controllers, migrate favorite`.

### Task 3: Read-only user modules: `recent-app`, `notification`, `login-history`

One controller class per base path. `login-history` splits into `LoginHistoryController` (`/login-history`) and `LoginHistoryAdminController` (`/admin/login-history`, `@Auth() @Admin()`), in `login-history.controller.ts` and `login-history-admin.controller.ts`.

- [ ] **Step 1:** Add their 14 Appendix A rows to the manifest spec: FAIL.
- [ ] **Step 2:** Migrate. Arrow-field methods become methods; method order follows each deleted `*.routes.ts`. Delete the three `*.routes.ts`.
- [ ] **Step 3:** `pnpm test`, type-check, lint; API suite for `recent-apps`, `notifications`, `login-history`. Green.
- [ ] **Step 4:** Review gate, then commit `refactor(routing): migrate recent-app, notification, login-history`.

### Task 4: Admin and profile modules: `category`, `entitlement`, `web-app`, `user`, `contact-admin`

Splits, each class in its own `<name>[-<surface>].controller.ts`:

| Module | Classes and base paths |
| --- | --- |
| category | `CategoryAdminController` `/admin/categories` (`@Auth() @Admin()`); `CategoryController` `/apps/categories` |
| web-app | `WebAppAdminController` `/admin/apps` (`@Auth() @Admin()`); `WebAppController` `/apps` |
| user | `UserController` `/users` (guards per method: `/me` routes `@Auth()`, `/:id` none); `UserAdminController` `/admin/users` (`@Auth() @Admin()`) |
| contact-admin | `ContactController` `/contact`; `AdminContactsController` `/admin/contacts` (`@Auth() @Admin()`); `MyContactsController` `/contacts` (`@Auth()`) |
| entitlement | `EntitlementAdminController` `/admin/entitlements` (`@Auth() @Admin()`) |

- [ ] **Step 1:** Add their 26 Appendix A rows to the manifest spec, plus `"GET /users/me is registered before GET /users/:id"`: FAIL.
- [ ] **Step 2:** Migrate and delete the five `*.routes.ts`. `createModules()` keeps the old router order for the new controllers: contact → admin contacts → my contacts → web-app admin → web-app user → category admin → category user → entitlement.
- [ ] **Step 3:** `pnpm test`, type-check, lint; API suite for `admin-*`, `categories`, `apps`, `users`, `contacts`, `entitlements`. Green.
- [ ] **Step 4:** Review gate, then commit `refactor(routing): migrate admin and profile modules`.

### Task 5: Auth flows: `signup`, `login`, `forgot-password`, `change-password`, `unlock-account`, `logout`, `token`

Five of these controllers (`login`, `signup`, `change-password`, `unlock-account`, `logout`) write the response: they set or clear the refresh cookie. They take `@Res() res` and `@Req() req` where the old arrow function read them, and keep returning their data. The interceptor still wraps it, because `content !== action.response`. Only a method that ends the response itself returns `res`.

- [ ] **Step 1:** Add their 20 Appendix A rows to the manifest spec: FAIL.
- [ ] **Step 2:** Migrate and delete the seven `*.routes.ts`. Rewrite `login.controller.spec.ts` and `signup.controller.spec.ts` to call the methods with the new parameters (DTO instance, fake `req`/`res`); their assertions (cookie set, `refreshToken` kept out of the body) stay word for word.
- [ ] **Step 3:** `pnpm test`, type-check, lint; API suite for `auth`, `signup`, `login`, `password`, `unlock`, `logout`, `token`, then the **full** API layer `pnpm test:api`. Green.
- [ ] **Step 4:** Review gate, then commit `refactor(routing): migrate auth flows`.

### Task 6: Remove the old path

**Files:**
- Modify: `server/src/loaders/modules.ts`, `server/src/loaders/http.ts`: drop `apiRouters` and the `/api/v1` `v1Router`; only `oauthRouter` stays a router.
- Modify: `server/src/common/responses/index.ts`: delete `handle` and `HandleOptions`; `sendSuccess` stays for `/health`.
- Modify: `server/src/common/routing/spec/route-manifest.spec.ts`: it must now hold all 63 rows, and assert `describeRoutes` returns exactly 63.
- Modify: `CLAUDE.md`:
  - "Responses" row: `@Respond` + `EnvelopeInterceptor` instead of `handle`;
  - "Rate limiting" row: `@RateLimit` + the computed order;
  - the module-anatomy and "adding an endpoint touches three places" paragraph: the controller replaces `*.routes.ts`;
  - the test count.
- Modify: `server/.claude/rules/` in the **main checkout** only, if a rule describes `*.routes.ts`. Never committed.

- [ ] **Step 1:** Implement; `grep -rn "\.routes\"" server/src/modules` returns only `oauth`.
- [ ] **Step 2:** `pnpm test`, type-check, lint; full `pnpm test` in `automation-test` (e2e + API) on the production client, and `pnpm coverage:check`. Green.
- [ ] **Step 3:** Review gate, then commit `refactor(routing): drop hand-assembled routers and handle()`. Open the PR.

---

## Appendix A: the 63 routes as they are today

Generated from `server/src/modules/*/*.routes.ts` on `main` at `a9726083` (OAuth excluded). The chain is the exact middleware order; `orderMiddlewares` reproduces every row. Status `OK` is 200, and `—` means no message (empty string).

| Module | Route | Chain | Status | Message | Old action |
| --- | --- | --- | --- | --- | --- |
| category | `GET /api/v1/admin/categories` | `auth > admin` | OK | `category:success.list` | `list` |
| category | `POST /api/v1/admin/categories` | `auth > admin > rl:categoryMutationByIpAndUser > body:CreateCategoryBodyDto` | CREATED | `category:success.create` | `create` |
| category | `PATCH /api/v1/admin/categories/:id` | `auth > admin > rl:categoryMutationByIpAndUser > params:CategoryIdParamsDto > body:UpdateCategoryBodyDto` | OK | `category:success.update` | `update` |
| category | `POST /api/v1/admin/categories/:id/move` | `auth > admin > rl:categoryMutationByIpAndUser > params:CategoryIdParamsDto > body:MoveCategoryBodyDto` | OK | `category:success.move` | `move` |
| category | `GET /api/v1/admin/categories/:id/delete-impact` | `auth > admin > params:CategoryIdParamsDto` | OK | `category:success.deleteImpact` | `deleteImpact` |
| category | `DELETE /api/v1/admin/categories/:id` | `auth > admin > rl:categoryMutationByIpAndUser > params:CategoryIdParamsDto > body:DeleteCategoryBodyDto` | NO_CONTENT | — | `remove` |
| category | `GET /api/v1/apps/categories` | `rl:categoriesByIp > optionalAuth` | OK | `category:success.list` | `listPublic` |
| change-password | `PATCH /api/v1/auth/change-password` | `passwordChangeAuth > rl:changePasswordByIpAndUser > body:ChangePasswordBodyDto` | OK | `changePassword:success.passwordChanged` | `changePassword` |
| contact-admin | `POST /api/v1/contact/submit` | `rl:contactByIp > optionalAuth > body:SubmitContactBodyDto` | CREATED | `contactAdmin:success.submitted` | `submit` |
| contact-admin | `GET /api/v1/admin/contacts` | `auth > admin > query:AdminContactsQueryDto` | OK | `contactAdmin:success.getContactList` | `getContactList` |
| contact-admin | `GET /api/v1/admin/contacts/:id` | `auth > admin > params:ContactIdParamsDto` | OK | `contactAdmin:success.getContactDetail` | `getContactDetail` |
| contact-admin | `PATCH /api/v1/admin/contacts/:id/status` | `auth > admin > params:ContactIdParamsDto > body:UpdateContactStatusBodyDto` | OK | `contactAdmin:success.updateContactStatus` | `updateContactStatus` |
| contact-admin | `GET /api/v1/contacts` | `auth > query:MyContactsQueryDto` | OK | `contactAdmin:success.getMyContacts` | `getMyContacts` |
| contact-admin | `GET /api/v1/contacts/:id` | `auth > params:ContactIdParamsDto` | OK | `contactAdmin:success.getMyContactDetail` | `getMyContactDetail` |
| entitlement | `GET /api/v1/admin/entitlements` | `auth > admin > query:EntitlementMatrixQueryDto` | OK | `entitlement:success.get` | `getMatrix` |
| entitlement | `PATCH /api/v1/admin/entitlements` | `auth > admin > rl:entitlementMutationByIpAndUser > body:UpdateEntitlementsBodyDto` | OK | `entitlement:success.update` | `updateMatrix` |
| favorite | `GET /api/v1/users/me/favorites` | `auth > query:ListFavoritesQueryDto` | OK | `favorite:success.list` | `list` |
| favorite | `POST /api/v1/users/me/favorites/:appId` | `auth > params:FavoriteAppIdParamsDto` | CREATED | `favorite:success.add` | `add` |
| favorite | `DELETE /api/v1/users/me/favorites/:appId` | `auth > params:FavoriteAppIdParamsDto` | NO_CONTENT | — | `remove` |
| forgot-password | `POST /api/v1/auth/forgot-password/otp/send` | `rl:forgotPasswordOtpByIp > rl:forgotPasswordOtpByEmail > body:OtpSendBodyDto` | OK | `forgotPassword:success.otpSent` | `sendOtp` |
| forgot-password | `POST /api/v1/auth/forgot-password/otp/verify` | `rl:forgotPasswordOtpByIp > body:OtpVerifyBodyDto` | OK | `forgotPassword:success.otpVerified` | `verifyOtp` |
| forgot-password | `POST /api/v1/auth/forgot-password/magic-link/send` | `rl:forgotPasswordMagicLinkByIp > rl:forgotPasswordMagicLinkByEmail > body:MagicLinkSendBodyDto` | OK | `forgotPassword:success.magicLinkSent` | `sendMagicLink` |
| forgot-password | `POST /api/v1/auth/forgot-password/magic-link/verify` | `rl:forgotPasswordMagicLinkByIp > body:MagicLinkVerifyBodyDto` | OK | `forgotPassword:success.magicLinkVerified` | `verifyMagicLink` |
| forgot-password | `POST /api/v1/auth/forgot-password/reset` | `rl:forgotPasswordResetByIp > body:ResetPasswordBodyDto` | OK | `forgotPassword:success.passwordReset` | `resetPassword` |
| login-history | `GET /api/v1/login-history/stats` | `auth > query:LoginHistoryStatsQueryDto` | OK | `loginHistory:success.getMyStats` | `getMyStats` |
| login-history | `GET /api/v1/login-history` | `auth > query:LoginHistoryQueryDto` | OK | `loginHistory:success.getMyHistory` | `getMyHistory` |
| login-history | `GET /api/v1/admin/login-history` | `auth > admin > query:LoginHistoryAdminQueryDto` | OK | `loginHistory:success.getAllHistory` | `getAllHistory` |
| login-history | `GET /api/v1/admin/login-history/:id` | `auth > admin > params:LoginHistoryIdParamsDto` | OK | `loginHistory:success.getHistoryDetail` | `getHistoryDetail` |
| login | `POST /api/v1/auth/login` | `rl:loginByIp > body:LoginBodyDto` | OK | `login:success.loginSuccessful` | `login` |
| login | `POST /api/v1/auth/login/otp/send` | `rl:loginOtpByIp > rl:loginOtpByEmail > body:OtpSendBodyDto` | OK | `login:success.otpSent` | `sendOtp` |
| login | `POST /api/v1/auth/login/otp/verify` | `rl:loginByIp > body:OtpVerifyBodyDto` | OK | `login:success.loginSuccessful` | `verifyOtp` |
| login | `POST /api/v1/auth/login/magic-link/send` | `rl:magicLinkByIp > rl:magicLinkByEmail > body:MagicLinkSendBodyDto` | OK | `login:success.magicLinkSent` | `sendMagicLink` |
| login | `POST /api/v1/auth/login/magic-link/verify` | `rl:loginByIp > body:MagicLinkVerifyBodyDto` | OK | `login:success.loginSuccessful` | `verifyMagicLink` |
| logout | `POST /api/v1/auth/logout` | `passwordChangeAuth` | NO_CONTENT | — | `logout` |
| notification | `GET /api/v1/notifications/unread-count` | `auth` | OK | `notification:success.unreadCount` | `unreadCount` |
| notification | `PATCH /api/v1/notifications/read-all` | `auth` | OK | `notification:success.markAllRead` | `markAllRead` |
| notification | `GET /api/v1/notifications` | `auth > query:NotificationListQueryDto` | OK | `notification:success.list` | `list` |
| notification | `PATCH /api/v1/notifications/:id/read` | `auth > params:NotificationIdParamsDto` | OK | `notification:success.markRead` | `markRead` |
| recent-app | `GET /api/v1/users/me/recent-apps` | `auth > query:ListRecentAppsQueryDto` | OK | `recentApp:success.list` | `list` |
| recent-app | `GET /api/v1/users/me/recent-apps/stats` | `auth > query:RecentAppsStatsQueryDto` | OK | `recentApp:success.stats` | `stats` |
| recent-app | `DELETE /api/v1/users/me/recent-apps` | `auth` | NO_CONTENT | — | `clear` |
| recent-app | `POST /api/v1/users/me/recent-apps/:appId` | `auth > rl:recordRecentAppByUser > params:RecentAppIdParamsDto` | NO_CONTENT | — | `record` |
| recent-app | `DELETE /api/v1/users/me/recent-apps/:appId` | `auth > params:RecentAppIdParamsDto` | NO_CONTENT | — | `hide` |
| recent-app | `POST /api/v1/users/me/recent-apps/:appId/restore` | `auth > params:RecentAppIdParamsDto` | NO_CONTENT | — | `restore` |
| signup | `POST /api/v1/auth/signup/send-otp` | `rl:signupOtpByIp > rl:signupOtpByEmail > body:SendOtpBodyDto` | OK | `signup:success.otpSent` | `sendOtp` |
| signup | `POST /api/v1/auth/signup/verify-otp` | `body:VerifyOtpBodyDto` | OK | `signup:success.otpVerified` | `verifyOtp` |
| signup | `POST /api/v1/auth/signup/resend-otp` | `rl:signupOtpByIp > rl:signupOtpByEmail > body:ResendOtpBodyDto` | OK | `signup:success.otpResent` | `resendOtp` |
| signup | `POST /api/v1/auth/signup/complete` | `body:CompleteSignupBodyDto` | CREATED | `signup:success.signupCompleted` | `completeSignup` |
| signup | `GET /api/v1/auth/signup/check-email/:email` | `rl:checkEmailByIp > params:CheckEmailParamsDto` | OK | — | `checkEmail` |
| token | `POST /api/v1/auth/token/refresh` | — | OK | `login:success.tokenRefreshed` | `refreshToken` |
| unlock-account | `POST /api/v1/auth/unlock/request` | `body:UnlockRequestBodyDto` | OK | `unlockAccount:success.unlockEmailSent` | `unlockRequest` |
| unlock-account | `POST /api/v1/auth/unlock/verify` | `rl:loginByIp > body:UnlockVerifyBodyDto` | OK | `unlockAccount:success.accountUnlocked` | `unlockVerify` |
| user | `GET /api/v1/users/me` | `auth` | OK | `user:success.getProfile` | `getMyProfile` |
| user | `PATCH /api/v1/users/me` | `rl:updateProfileByIp > auth > body:UpdateProfileBodyDto` | OK | `user:success.updateProfile` | `updateMyProfile` |
| user | `GET /api/v1/users/:id` | `params:PublicProfileParamsDto` | OK | `user:success.getPublicProfile` | `getPublicProfile` |
| user | `GET /api/v1/admin/users` | `auth > admin > query:AdminUsersQueryDto` | OK | `user:success.getAdminUsers` | `getAdminUsers` |
| user | `PATCH /api/v1/admin/users/:id/lock` | `auth > admin > rl:adminUserMutationByIpAndUser > params:AdminUserIdParamsDto` | OK | `user:success.lockUser` | `lockUser` |
| user | `PATCH /api/v1/admin/users/:id/unlock` | `auth > admin > rl:adminUserMutationByIpAndUser > params:AdminUserIdParamsDto` | OK | `user:success.unlockUser` | `unlockUser` |
| user | `POST /api/v1/admin/users/:id/reset-password` | `auth > admin > rl:adminUserMutationByIpAndUser > params:AdminUserIdParamsDto` | OK | `user:success.resetPassword` | `resetUserPassword` |
| web-app | `GET /api/v1/admin/apps` | `auth > admin > query:AdminAppsQueryDto` | OK | `webApp:success.listApps` | `listApps` |
| web-app | `POST /api/v1/admin/apps` | `auth > admin > body:CreateAppBodyDto` | CREATED | `webApp:success.createApp` | `createApp` |
| web-app | `PATCH /api/v1/admin/apps/:id` | `auth > admin > params:AppIdParamsDto > body:UpdateAppBodyDto` | OK | `webApp:success.updateApp` | `updateApp` |
| web-app | `GET /api/v1/apps` | `auth > query:UserAppsQueryDto` | OK | `webApp:success.listApps` | `listUserApps` |
