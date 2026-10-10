# Access Control Implementation Plan

> **For agentic workers:** thực thi inline (`superpowers:executing-plans`) trong worktree
> `.worktrees/access-control` — user đã uỷ quyền chạy tới merge. TDD cho mọi đơn vị server: viết spec,
> chạy đỏ, viết code, chạy xanh. Steps dùng checkbox.

**Goal:** per-user entitlement thật — admin override quyền vào app cho từng user, và override đó có hiệu
lực ở launcher, favorite, recent, home stats và `/oauth/authorize`.

**Architecture:** collection `entitlements` chỉ lưu override (`allow`/`deny`). `AccessPolicy`
(module `entitlement`) resolve `AccessScope` của user mỗi request; helper thuần `canAccessApp` /
`buildAccessFilter` là nguồn quy tắc duy nhất cho mọi điểm áp. Admin API GET/PATCH ma trận, client nối
hook thật thay mock.

**Tech Stack:** Express 4 + Mongoose 8 + Joi + Jest · Next.js 15 + TanStack Query + RHF + next-intl ·
Playwright.

**Spec:** `docs/specs/access-control/design.md`

## Global Constraints

- `effective = override ? effect === "allow" : roleAllows(role, requiredRoles)`; `roleAllows` = `requiredRoles` rỗng **hoặc** role `admin` **hoặc** `requiredRoles` chứa `role ?? "user"`.
- `GET /admin/entitlements?userIds=` 1–50 id, không trùng. `PATCH /admin/entitlements` `changes` 1–200, không trùng cặp; validate hết rồi mới ghi.
- Override chỉ tồn tại khi khác mặc định (server chuẩn hoá khi PATCH).
- Mọi chuỗi user-facing qua i18n en + vi; mã lỗi qua `ERROR_CODES`.
- Không đụng `client/src/components/ui/*`; icon Lucide; chấm override dùng `bg-keyline` (brass; `bg-accent` là hover surface của shadcn).
- Convention server: `services/` một method một file, `repository/` không barrel, chỉ module factory import `impl/`.
- Seed override chỉ trên `user2@test.com` (DR-9).

## Review Focus

1. **Search + quyền cùng lúc ở `/apps`** — `buildWebAppFilter` đặt `$or` cho search; access filter có `$or` riêng. Ghép sai sẽ ghi đè một trong hai → test `list-user-apps` với search + scope phải thấy cả hai điều kiện trong `$and`.
2. **Override `deny` của admin** — admin bị deny một app phải mất app đó ở launcher và authorize, dù role admin "thấy hết". Test ở helper (DT) và authorize.
3. **PATCH có một cặp hỏng giữa batch** — app/user không tồn tại ở phần tử cuối → 404 và `bulkWrite` không được gọi.
4. **Tick về đúng mặc định** — phải xoá override, không để lại `allow` cho user vốn đủ role. Test `update-matrix` + E2E #11.
5. **`userIds` có id trùng / sai format** — Joi trả 400, không 500 từ aggregate.

---

## Server

### Task 1: Quy tắc thuần + model + types

**Files:**
- Modify: `server/src/models/entitlement.ts`, `server/src/modules/entitlement/{types,constants}/index.ts`
- Create: `server/src/modules/entitlement/entitlement.helper.ts`, `entitlement.helper.spec.ts`

**Produces:**
```ts
// constants
export const ENTITLEMENT_EFFECTS = { ALLOW: "allow", DENY: "deny" } as const;
export const ENTITLEMENT_LIMITS = { MAX_USERS_PER_QUERY: 50, MAX_CHANGES: 200 } as const;
// types
export type EntitlementEffect = (typeof ENTITLEMENT_EFFECTS)[keyof typeof ENTITLEMENT_EFFECTS];
export interface EntitlementDocument { _id; userId; webAppId; effect: EntitlementEffect; updatedBy; createdAt; updatedAt }
export interface AccessScope { role?: string; allowIds: string[]; denyIds: string[] }
export interface AppAccessRule { _id: { toString(): string }; requiredRoles: string[] }
// helper
roleAllows(role: string | undefined, requiredRoles: readonly string[]): boolean
canAccessApp(app: Pick<AppAccessRule, "_id" | "requiredRoles">, scope: AccessScope): boolean
buildAccessFilter(scope: AccessScope): FilterQuery<WebAppDocument>[]   // các mảnh để push vào $and
```

- [ ] Spec helper — bảng quyết định `role ∈ {user, admin, undefined} × requiredRoles ∈ {[], [user], [admin]} × override ∈ {none, allow, deny}` cho `canAccessApp`; `buildAccessFilter`: admin không deny → `[]`; admin deny → `[{_id:{$nin}}]`; user → `$or` gồm `$size:0`, `requiredRoles: "user"`, `_id $in allow` + `$nin deny`.
- [ ] Chạy `pnpm test src/modules/entitlement` → FAIL.
- [ ] Viết model mới (§4 spec), constants, types, helper.
- [ ] Chạy lại → PASS.

### Task 2: Repository + AccessPolicy

**Files:** `modules/entitlement/repository/entitlement.repository.ts`, `repository/impl/mongo-entitlement.repository.ts`, `services/access-policy/index.ts`, `services/access-policy/spec/resolve-scope.spec.ts`

```ts
export interface EntitlementRepository {
  findByUser(userId: string): Promise<{ webAppId: string; effect: EntitlementEffect }[]>;
  findByUsers(userIds: string[]): Promise<{ userId: string; webAppId: string; effect: EntitlementEffect }[]>;
  applyChanges(input: { upserts: { userId; webAppId; effect; updatedBy }[]; deletes: { userId; webAppId }[] }): Promise<void>;
}
export class AccessPolicy { constructor(repo: EntitlementRepository); resolveScope(userId: string | undefined, role?: string): Promise<AccessScope> }
```
- [ ] Spec: không userId → scope rỗng, không gọi repo; chia allow/deny đúng.
- [ ] Implement (`applyChanges` = một `bulkWrite` `ordered: false`, bỏ qua khi rỗng).

### Task 3: Admin service + API

**Files:** `modules/entitlement/services/entitlement-admin/{index,deps,get-matrix,update-matrix}.ts`, `shared/build-matrix.ts`, `spec/`; `dtos/index.ts`; controller; routes; module; `validators/schemas/entitlement.ts`; `constants/error-code.ts`; `i18n/locales/{en,vi}/entitlement.json` + index + `i18n/config.ts`; rate limiter `entitlementMutationByIpAndUser` + `RATE_LIMIT_CONFIG.ENTITLEMENTS`; swagger + `openapi.ts`; `UserRepository.findRolesByIds`; `WebAppRepository.findAccessRules`.

```ts
interface EntitlementAdminServiceDeps { entitlementRepo; userRepo: UserRepository; webAppRepo: WebAppRepository }
getMatrix(deps, userIds: string[]): Promise<EntitlementMatrixDto>      // { users: UserAccessDto[] }
updateMatrix(deps, changes: EntitlementChange[], actorId: string): Promise<EntitlementMatrixDto>
```
- [ ] Spec `get-matrix`: thứ tự theo input; granted tính theo helper; override đúng; id thiếu → `NotFoundError`.
- [ ] Spec `update-matrix`: đủ role + bỏ tick → upsert deny; thiếu role + tick → upsert allow; về mặc định → delete; user/app thiếu ở phần tử cuối → 404 và `applyChanges` không gọi; response chỉ user bị ảnh hưởng.
- [ ] Implement + routes (`authGuard, adminGuard`, `queryPipe`/`bodyPipe`, rate limit trên PATCH), wire `modules.loader.ts`.

### Task 4: Áp quyền ở launcher, favorite, recent, authorize

**Files:** `web-app/{helpers/index.ts, services/list-user-apps.ts, services/deps.ts, web-app.module.ts, repository/*}`, `favorite/{guards/app-favoritable.guard.ts, services/list.ts, services/deps.ts, favorite.module.ts}`, `recent-app/{services/list.ts, stats.ts, record-launch.ts, deps.ts, recent-app.module.ts}`, `oauth/{services/authorize.ts, services/deps.ts, oauth.module.ts}`, `loaders/modules.loader.ts`, các spec liên quan.

- `isAppVisibleTo(app, scope: AccessScope)` = `app !== null && active && canAccessApp(app, scope)`.
- `findActiveByIds(ids, { access: AccessScope; search?; categoryId? })`: `$and` các mảnh từ `buildAccessFilter`.
- `listUserApps`: `filter.$and = buildAccessFilter(scope)` khi mảng không rỗng.
- `assertEntitled` async, dùng `canAccessApp(client, scope)`.
- [ ] Cập nhật spec hiện có (truyền scope thay role) + thêm: list search + scope (Review Focus 1); authorize: admin vào app `[user]` OK, deny override → `access_denied`, allow override cho user → OK.
- [ ] Implement, `pnpm test` toàn bộ xanh.

### Task 5: Seeder + docs server

- [ ] `database/seeders/entitlement.seeder.ts` (+ `data/entitlements.ts` theo email/app name), đăng ký trong `seeders/index.ts`.
- [ ] `pnpm format && pnpm lint:fix && pnpm lint && pnpm type-check && pnpm test`.
- [ ] Commit `feat(access-control): enforce per-user app overrides on the server`.

## Client

### Task 6: Nối API thật cho ma trận

**Files:** `constants/endpoints` (thêm `ADMIN_ENTITLEMENTS`), `requests/adminEntitlements.ts`, `types/AdminEntitlements`, `views/AdminEntitlements/{hooks,components/EntitlementCell,components/EntitlementUserRow,components/EntitlementMatrixTable,mains/AdminEntitlementsMatrix,ghosts/MatrixFormSyncEffect}`, `utils/index.ts` (`buildEntitlementDefaults`, bỏ `isAppEligibleForUser`), xoá `mocks/AdminEntitlements.ts`, locales en/vi `adminEntitlements`.

- `useUserGrants(userIds)` → `Record<string, UserAccess>`.
- Cell nhận `roleDefault: boolean`, `isOverridden: boolean` (non-edit) và tính `value !== roleDefault` khi edit; render chấm `span.size-1.5.rounded-full.bg-keyline` bọc trong `CustomTooltip` với nhãn `cell.overrideGranted` / `cell.overrideRevoked`.
- Check-all áp lên mọi app.
- [ ] `pnpm format && pnpm lint:fix && pnpm lint && pnpm exec tsc --noEmit`.
- [ ] Commit `feat(access-control): wire the entitlement matrix to the real API`.

## E2E + docs

### Task 7: E2E

- [ ] Reconcile `e2e/admin-entitlements/matrix.e2e.ts` theo matrix §10 (bỏ assert "Role required" / ô disabled; mutation `serial` + revert `afterAll` qua API).
- [ ] Thêm `e2e/web-app-access/launcher.e2e.ts` (#7, #11b, #11c) dùng helper API admin.
- [ ] Chạy server `:5100` + client `:3100` worktree, `pnpm seed`, `E2E_BASE_URL=http://localhost:3100 pnpm e2e` toàn bộ → xanh. Gate B: walk các dòng `A+B` bằng browser.
- [ ] Viết `e2e.md`.

### Task 8: Docs + merge

- [ ] `docs/erd.md` (entitlements), `docs/project-goals.md` (G5, bảng App Registry), `docs/unfinished-features.md` (mục 1 xong; thêm follow-up notification nếu chưa tích hợp), `README.md` Features + số test, `CLAUDE.md` (entitlement đã wire; mock list; số module/test).
- [ ] Đợi `feat/notification-events` merge → merge `origin/main`, tích hợp §9 spec, chạy lại toàn bộ test.
- [ ] Push, PR, merge, xoá worktree + branch.
