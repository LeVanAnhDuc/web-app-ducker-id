# Design — Web-App Registry: Seed + GET API + FE Integration

> **Feature**: `web-app-list`
> **Status**: Design approved (brainstorming) — input for `superpowers:writing-plans`
> **Date**: 2026-06-07
> **Type**: Cross-stack (BE + FE + DB seed)

---

## 1. Scope & Goal

End-to-end **read** slice for the admin apps list:

- Seed `web_app_categories` + `web_apps` directly into MongoDB (mirror FE mock).
- Build **read-only** BE endpoints: `GET /admin/apps` (list + filter) and `GET /admin/apps/categories`.
- Wire `views/AdminApps` read calls to the real API; Create/Update/Delete stay on mock this round.

**Out of scope**: Create/Update/Delete API, entitlements, user-facing `GET /apps`, `views/Apps/` cleanup (stale template mock), pagination.

---

## 2. Components

### 2.1 BE — flesh out `server/src/modules/web-app/`

Currently only `constants/` + `types/` exist. Add the 4 core files + repos/dtos:

```
web-app.module.ts         # factory: repos → service → controller → routes; register in modules.loader.ts
web-app.controller.ts     # listApps, listCategories handlers (OkSuccess.send)
web-app.routes.ts         # createAdminWebAppRoutes(controller) → router.use(authGuard, adminGuard)
web-app.service.ts        # business logic, returns DTOs
repositories/             # 2 repos → folder + barrel
  web-app.repository.ts
  web-app-category.repository.ts
  index.ts
dtos/
  admin-app.dto.ts        # interface AdminAppDto + toAdminAppDto()
  admin-category.dto.ts   # interface AdminCategoryDto + toAdminCategoryDto()
  index.ts                # barrel
```

- Validators: `queryPipe(adminListAppsQuerySchema)` in `src/validators/schemas/`.
- Endpoints mounted under `/admin/apps` (admin-guarded), following the existing admin-list pattern (e.g. `contact-admin`).
- Routes order: `authGuard → adminGuard` (router-level) → `queryPipe` → `asyncHandler(controller.method)`.

### 2.2 Seeder — `server/src/database/seeders/`

```
data/web-app-categories.ts   # 4 categories
data/web-apps.ts             # 6 apps (reference category by name, not _id)
web-app.seeder.ts            # seedWebApps() + clearWebApps()
index.ts                     # register seedWebApps / clearWebApps (run after users)
```

- `seedWebApps()`: seed categories first → build `name → _id` map → seed apps resolving `categoryId` at runtime.
- Idempotent: skip-if-exists by unique key (`name` for categories, `clientId`/`name` for apps), matching `user.seeder.ts`.
- Confidential clients: plaintext secret in data file → `hashValue()` (bcrypt) in the seeder, exactly like the password hashing in `user.seeder.ts`.

### 2.3 FE — `client/src/`

```
requests/adminApps.ts        # getAdminApps(params), getAdminAppCategories — axiosInstance, SAME return shape as mock
constants/endpoints.ts       # + ADMIN_APPS, ADMIN_APPS_CATEGORIES
```

- Swap the two **read** imports in `AdminAppsTable`, `AdminAppsToolbar`, `AdminAppsFormSheet` from `@/mocks/AdminApps` → `@/requests/adminApps`.
- **Write** functions (`createAdminApp`, `updateAdminApp`, `deleteAdminApp`) keep importing from `@/mocks/AdminApps`.
- Request functions return the exact mock shape so React Query consumers need no further change:
  - `getAdminApps(params)` → `{ items: WebApp[] }`
  - `getAdminAppCategories()` → `WebAppCategory[]`

---

## 3. API Contract & Drift Mapping (cross-stack)

BE returns the standard `ResponsePattern<T>`. The **DTO mapper** reshapes the BE model into the exact FE `WebApp` / `WebAppCategory` type and **excludes** `clientSecretHash` and other OAuth internals (security — never leak secrets).

| FE field | BE source | Transform |
|---|---|---|
| `WebApp.status` | `status` | `ACTIVE` → `active` (lowercase) |
| `WebApp.categoryId` | `categoryId` | ObjectId → string |
| `WebApp.requiredRoles` | `requiredRoles` | passthrough (`user` / `admin` already match) |
| `WebApp.createdAt/updatedAt` | dates | ISO string |
| `WebAppCategory.name` | `displayName` | display label |
| `WebAppCategory.slug` | `name` | lowercase unique name |
| *(omitted)* | `clientSecretHash`, `grantTypes`, `responseTypes`, `scopes`, `tokenEndpointAuthMethod`, `postLogoutRedirectUris`, `backchannelLogoutUri`, `sortOrder` | not exposed |

- Query `status=active` (FE lowercase) → mapped to `ACTIVE` before the DB filter.
- Filters supported: `search` (free text over name/displayName/description), `status`, `categoryId`.
- List is **non-paginated** (returns full filtered set), matching the mock's `{ items: WebApp[] }`.

**FE↔BE enum casing**: `status` is the only value drift (`ACTIVE`/`INACTIVE` ↔ `active`/`inactive`) — handled entirely in the DTO mapper + query mapping. Roles already match (`user`/`admin`).

---

## 4. Seed Dataset (mirror FE mock, realistic OAuth)

**4 categories**: Content, Internal Tools, Identity, Productivity.

**6 apps** — realistic public/confidential mix:

| App (`name`) | Category | status | requiredRoles | client type |
|---|---|---|---|---|
| `blog` | Content | active | user | confidential (hashed secret) |
| `analytics-dashboard` | Internal Tools | active | admin | confidential |
| `idms-portal` | Identity | active | user, admin | public (PKCE, no secret) |
| `team-calendar` | Productivity | inactive | user | public |
| `notes` | Productivity | active | user | public |
| `ops-console` | Internal Tools | active | admin | confidential |

Per app:

- `clientId`, `homeUrl`, `redirectUris`, `displayName`, `description` from `client/src/mocks/AdminApps.ts`.
- Confidential: `tokenEndpointAuthMethod=client_secret_basic`, `clientSecretHash = hashValue(plaintextSecret)`.
- Public: `tokenEndpointAuthMethod=none`, `clientSecretHash=null`.
- All: `scopes=[openid, profile, email]`, `responseTypes=[code]`, `grantTypes=[authorization_code, refresh_token]`, `status` stored as BE enum (`ACTIVE`/`INACTIVE`).

---

## 5. Error Handling & Testing

- Throw domain errors via `@/common/exceptions` + `ERROR_CODES` (reuse generic codes; no new codes expected for the read path).
- **BE quality gate**: `yarn format && yarn lint && yarn tsc`.
- **FE quality gate**: `yarn format && yarn lint && yarn tsc`.
- Manual verify: run `yarn seed` → hit `GET /admin/apps` (admin token) → confirm `/admin/apps` page renders real data with search / status / category filters working.

---

## 6. Conventions to follow (references)

- BE module structure: `server/.claude/rules/modules.md` + `module-struct` skill; mirror the `contact-admin` admin-list module.
- BE models already exist: `server/src/models/web-app.ts`, `web-app-category.ts` (no schema change needed).
- Seeder pattern: `server/src/database/seeders/user.seeder.ts` (skip-if-exists, bcrypt hashing, clear helper).
- FE request pattern: `client/src/requests/changePassword.ts` (axiosInstance + `CONSTANTS.END_POINTS`).
- Endpoint/route constants via `CONSTANTS.END_POINTS` — never hardcode paths.
