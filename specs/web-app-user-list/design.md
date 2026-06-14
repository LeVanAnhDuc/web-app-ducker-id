# Design — `web-app-user-list`: user-facing `GET /apps` + `/vi/apps` integration

> **Feature**: `web-app-user-list`
> **Status**: Design (brainstorming) — input for `superpowers:writing-plans`
> **Date**: 2026-06-07
> **Type**: Cross-stack (BE + FE + docs)
> **Branch**: `feat/web-app-user-list` (worktree per-repo: docs / server / client)

---

## 1. Scope & Goal

End-to-end **read** slice for the user app launcher at `http://localhost:3000/vi/apps`:

- **BE**: new user-facing `GET /apps` (auth-guarded, any logged-in user) returning **all `status=ACTIVE` apps** — a **catalog**, _not_ entitlement-filtered — with server-side **search + pagination**.
- **FE**: replace `MANAGED_APPS_MOCK` in `views/Apps` with the real API via React Query; reshape the card into a launcher card (icon + name + category + description + **Open** → `homeUrl`).
- **docs**: update `project-goals.md` (G5 + App Registry row) so the catalog semantics match — per-user entitlement launch-gating is reframed as a separate/deferred concern, not the `/apps` list filter.

**Decisions locked (brainstorming):**

- App scope = **full active catalog** (Option 2), not entitlement-filtered. → update `project-goals.md`.
- Card = **icon + name + category + description + Open** (no status badge / views / date / ⋮ menu — those fields do not exist on `web_app`).
- **Open** → navigate to `app.homeUrl` in a new tab.
- Search / pagination = **server-side** (query params).
- Auth = **`authGuard`** (any logged-in user).
- Isolation = **worktree** (per-repo), branch `feat/web-app-user-list`.

**Out of scope**: entitlement filtering & seeding, favorites / recently-used, category filter dropdown (the existing non-functional "Filter" button stays inert — flagged follow-up), Create / Update / Delete, app icon upload.

---

## 2. Components

### 2.1 BE — extend `server/src/modules/web-app/`

Add a **user route group** alongside the existing admin one (reuse the module; do not create a new module).

```
web-app.routes.ts        # + createUserWebAppRoutes(controller): router.use("/apps", userApps)
                         #   userApps.use(authGuard); GET "/" → queryPipe(listAppsQuerySchema) → controller.listUserApps
web-app.module.ts        # + build & export webAppUserRouter (reuse same service/repos/controller instance)
web-app.controller.ts    # + listUserApps → OkSuccess({ data, message: "webApp:success.listApps" })
web-app.service.ts       # + listUserApps(query): force status=ACTIVE, search, paginate → { items, pagination }
repositories/web-app.repository.ts
                         # + findActivePaginated(filter, { skip, limit }) (populate category virtual)
                         # + countActive(filter)
dtos/user-app.dto.ts     # + interface UserAppDto + toUserAppDto(); add to dtos/index.ts barrel
types/index.ts           # + UserAppsQuery, UserAppsQueryRequest, PaginatedResult<T> (or reuse shared)
```

- `modules.loader.ts`: register `webAppUserRouter` and mount on `v1Router` (next to `webAppAdmin`).
- Validators: add `listAppsQuerySchema` to `src/validators/schemas/web-app.ts` (`page`, `limit`, `search`) — mirror `adminListContactsQuerySchema` (`stripUnknown`, i18n message keys, `LIMIT_MAX`).
- Route order: `authGuard` (router-level) → `queryPipe(listAppsQuerySchema)` → `asyncHandler(controller.listUserApps)`.
- Pagination defaults: `DEFAULT_PAGE = 1`, `DEFAULT_LIMIT = 12`, `MAX_LIMIT = 100` (12 = 3-col grid friendly; FE default page size 12).
- Reuse `buildWebAppFilter({ search, status: "active" })` from `./helpers` for the Mongo filter (status forced server-side — query never accepts a status param).

**Repository note (N+1 / populate)**: `findActivePaginated` uses `.populate({ path: "category", select: "displayName" })` on the existing `category` virtual; returns lean docs. Count via a separate `countDocuments(filter)`.

### 2.2 FE — `client/src/`

```
constants/endpoints.ts        # + APPS: "/apps"
requests/apps.ts              # getApps(params) → GET END_POINTS.APPS → { items: UserApp[], pagination }
types/Apps/index.ts           # UserApp, UserAppsQueryParams, PaginatedUserAppsResponse (mirror types/LoginHistory)
views/Apps/hooks/useApps.ts   # React Query: APPS_QUERY_KEY, params { page, search }, placeholderData keepPreviousData
views/Apps/mains/AppsBoard/index.tsx        # drive server params; replace client filtering/slice with API data
views/Apps/components/AppManagedCard/index.tsx  # reshape → launcher card (rename → AppCard)
views/Apps/components/AppCardSkeleton/index.tsx # loading skeleton (new)
locales/en/apps.json + vi/apps.json         # drop status.*; add empty/error + open label; keep search/pagination/announce
```

- `AppsBoard` (Client Component):
  - `search` state (debounced) + `page` state → passed to `useApps({ page, search })`.
  - Changing search resets `page` to 1.
  - Replace `useMemo` client filter + `.slice()` with `data.items`.
  - Pagination driven by `data.pagination.totalPages` via `CustomPagination` (reuse existing component) instead of the hand-rolled button row.
  - Keep grid/list toggle + `useAnnounce` (search count, page change, view mode, loading/data-arrived per a11y rule).
  - Loading state → skeleton grid; empty state → friendly message; error → message.
- `AppCard` (renamed from `AppManagedCard`): props `displayName`, `category`, `description`, `iconUrl`, `homeUrl`, `openLabel`. Renders `iconUrl` `<img>` with a first-initial fallback block; **Open** is a `CustomButton` that opens `homeUrl` in a new tab (`window.open(homeUrl, "_blank", "noopener,noreferrer")` or an external `<a target="_blank" rel="noopener noreferrer">` styled as button). Drop status badge / views / date / ⋮ menu.
- `useApps.ts` lives in `views/Apps/hooks/` per the view-local hooks rule (view has a `useQuery`).
- View-local hooks import path relative; `APPS_QUERY_KEY` defined once in `useApps.ts`.
- Delete `mocks/Apps/` after wiring (template leftover) — confirm no other importer first.

### 2.3 docs — `project-goals.md`

- **G5 — Per-user entitlement**: clarify that the `/apps` **list** returns the active-app **catalog**; entitlement governs **launch permission** (deferred), not list visibility (this round).
- **App Registry row** (table near line 150): change `GET /apps` (user — chỉ app trong entitlement) → `GET /apps` (user — catalog tất cả app `ACTIVE`, auth-guarded); entitlement-gated launch = follow-up.
- Exact diff shown to owner (user) for review **before** committing.

---

## 3. API Contract & Drift Mapping (cross-stack)

BE returns standard `ResponsePattern<T>` where:

```
data = {
  items: UserAppDto[],
  pagination: { page, pageSize, totalItems, totalPages }
}
```

Pagination is **embedded in `data`** (mirrors `login-history` user-facing pattern: `PaginatedResult<T>`), _not_ top-level `meta`.

| FE `UserApp` | BE source | Transform |
|---|---|---|
| `_id` | `_id` | ObjectId → string |
| `displayName` | `displayName` | passthrough (card title) |
| `description` | `description` | nullable passthrough |
| `iconUrl` | `iconUrl` | nullable → FE renders initial fallback |
| `homeUrl` | `homeUrl` | passthrough (Open target) |
| `category` | populated `category.displayName` | category label (card subtitle) |
| *(omitted)* | `clientSecretHash`, `clientId`, `redirectUris`, `grantTypes`, `responseTypes`, `scopes`, `tokenEndpointAuthMethod`, `postLogoutRedirectUris`, `backchannelLogoutUri`, `requiredRoles`, `status`, `sortOrder` | **never exposed** (security: no OAuth internals / secrets to the user catalog) |

- Query params: `?page=&limit=&search=`. `status` is **not** a query param — server forces `ACTIVE`.
- `search` is free-text over `name` / `displayName` / `description` (reuse `buildWebAppFilter`).
- FE↔BE enum casing: none exposed (`status` omitted from the user DTO entirely), so no casing drift on this path.

---

## 4. Error Handling & Testing

- BE throws via `@/common/exceptions` + `ERROR_CODES` (reuse generic codes; the read path needs no new codes). Validation errors via `queryPipe` → global error handler.
- **BE tests**: `web-app.service.spec.ts` (+ cases): active-only filter, search filter, pagination math (skip/limit, totalPages); `user-app.dto` spec: secret/OAuth-field exclusion.
- **BE quality gate**: `yarn format && yarn lint && yarn tsc` (+ `yarn test`).
- **FE quality gate**: `yarn format && yarn lint && yarn tsc`.
- **E2E (FE)**: per CLAUDE.md §4.3 — after implement + TDD, before code-review. **Scenario coverage chuẩn ở §6 `## E2E Scenario Matrix`** (12 nhóm rubric, hợp nhất cả category-filter + EN-locale từ `apps-api-integration`). Scenario doc in `docs/specs/web-app-user-list/e2e.md` (cần reconcile — xem §6), test in `client/e2e/web-app-user-list/`. Verify `/vi/apps` renders seeded active apps, search + pagination hit the API, Open launches `homeUrl`.
- **Manual verify**: `yarn seed` (existing web-app seeder already seeds active apps) → log in → `/vi/apps` shows seeded apps; search + paginate; Open opens `homeUrl`.

---

## 5. Conventions to follow (references)

- **BE module**: `server/.claude/rules/modules.md` + `module-struct` skill; mirror admin route-group factory already in `web-app.routes.ts`; pagination mirror `login-history` (`PaginatedResult<T>` in `data`) and `contact-admin` (query schema + limit clamp).
- **BE models** already exist: `server/src/models/web-app.ts` (+ `category` virtual), `web-app-category.ts` — no schema change.
- **FE request**: `client/src/requests/loginHistory.ts` (paginated, axiosInstance + `END_POINTS`).
- **FE view-local hooks**: `client/.claude/rules/views.md` ("View-local Hooks Folder").
- **FE pagination component**: `client/src/components/CustomPagination`.
- **FE a11y**: `client/.claude/rules/accessibility.md` (`useAnnounce` for loading / data-arrived / pagination / search / view-mode).
- **Endpoints/paths** via `CONSTANTS.END_POINTS` — never hardcode.
- **docs ERD/goals**: `docs/.claude/CLAUDE.md` — goals change is owner-reviewed (user approves the diff here).

---

## 6. E2E Scenario Matrix

> **Phạm vi**: catalog `/apps` (user-facing). Áp dụng vì feature thêm behavior user quan sát/tương tác được (grid app thật, search server-side, Open → `homeUrl`, category pills, render đa locale).
>
> **Lưu ý hợp nhất (cross-feature)**: feature `apps-api-integration` (xem `docs/specs/apps-api-integration/design.md §6`) đã bổ sung 2 vùng vào CHÍNH trang `/apps` này: **category-filter** (panel pills `GET /apps/categories` + query `categoryId`) và **i18n EN-locale render**. 2 vùng đó được hợp nhất vào matrix dưới đây (rows 7, 9, 12) để `web-app-user-list` giữ 1 matrix duy nhất, đầy đủ cho catalog `/apps`. Test hiện có ở `client/e2e/web-app-user-list/apps-list.e2e.ts` đã cover: render role-scoped active apps, search server-side + clear, Open launches `homeUrl` tab mới, **category pills filter**, **EN-locale render**.
>
> **Legend**: ✅ = scenario bắt buộc · N/A = không áp dụng (kèm lý do). Cột `Gate`: `A+B` = chạy cả gate A (`yarn e2e`) lẫn gate B (MCP walk); `A only` = chỉ gate A (thường API/contract hoặc mutation-heavy); `B` = thiên về gate B (visual/UX/console). Technique tag inline theo skill `e2e-scenario-coverage`: `[EP]` equivalence-partition · `[BVA]` boundary-value · `[DT]` decision-table.

| # | Category | Status | Scenario + Expected + [technique] + values | Gate |
|---|----------|--------|---------------------------------------------|------|
| 1 | Happy path | ✅ (exists) | User đã đăng nhập mở `/vi/apps` → `GET /api/v1/apps` 200 → grid render các app `ACTIVE` user được phép thấy: **Blog**, **Notes**, **IDMS Portal** (h3) + nút **Open** mỗi card. Card có icon/displayName/category/description. | A+B |
| 2 | AuthN | ✅ (NEW) | **UI**: clear cookies + `storageState: undefined` → vào `/vi/apps` → AuthGuard redirect `/login` (cả gate A và gate B). **API**: `GET /api/v1/apps/categories` không gửi `Bearer` → **401**. `[EP]` no-token vs valid-token. (API leg gate A only.) | A+B (UI) / A only (API) |
| 3 | AuthZ | ✅ (exists) | User role thường: app admin-only **Analytics Dashboard**, **Operations Console** → `toHaveCount(0)` (không heading, không nút Open). BE ép `requiredRoles` chứa `USER`. Role-scoped (KHÔNG per-entitlement). _Deferred_: entitlement-launch gating (xem follow-ups). | A+B |
| 4 | Validation / expected-error | ✅ (NEW) | API contract: `[EP]` `?page=abc` → **400**; `?limit=0` → **400**; `?limit=101` → **400** (vượt `MAX_LIMIT`); `?status=DISABLED` bị `stripUnknown` → response chỉ chứa app `ACTIVE` (status không phải param hợp lệ, server ép). FE không tạo input sai (pill chỉ gửi `_id` hợp lệ) → kiểm ở tầng API. | A only |
| 5 | Empty / null states | ✅ (NEW) | Search `"zzzqqq"` (không match) → `apps.empty` ("No apps found." / "Không tìm thấy ứng dụng nào.") visible, grid rỗng. App có `iconUrl=null` → render fallback chữ cái đầu (no broken `<img>`); `description=null` → ô mô tả trống không vỡ layout (`min-h-10`). | A+B |
| 6 | Boundary / pagination | ✅ (NEW) | `[BVA]` `page=1` (đầu), `page=last`, `page=999` (vượt range → grid rỗng, không crash); `limit` biên `1` / `100` (hợp lệ) / `101` (→ 400). `CustomPagination` CHỈ render khi `totalPages > 1`. **Seed-gated**: cần > 12 app user-visible mới có ≥ 2 trang; nếu seed không đủ → ghi follow-up, assert summary "Showing {n} of {total}" + pager ẩn ở 1 trang. | A+B (seed-gated) |
| 7 | Filter / search | ✅ (NEW — partial exists) | `[DT]` kết hợp **search + category** (giao của 2 điều kiện): chọn pill category + nhập search → grid = intersection; combo không match → empty. Pill "All"/"Tất cả" → bỏ lọc, `aria-pressed=true` ở pill All. **URL persistence**: by design state in-memory (KHÔNG dùng `useSearchParams`) → assert reload `/vi/apps` reset về "All" + search rỗng (không deep-link filter). (Category pill cơ bản đã có test.) | A+B |
| 8 | Data rendering | ✅ (exists) | `displayName` render là `<h3>` (KHÔNG phải slug/id). `category` render là subtitle `displayName` (không phải id). Nút **Open** → `window.open(homeUrl, "_blank", "noopener,noreferrer")` — bắt được URL đúng (vd Blog → `https://blog.example.com`). (Null-icon overlap row 5.) | A+B |
| 9 | i18n (en + vi) | ✅ (NEW — vi exists, en thin) | VI đã cover. **ADD EN depth**: vào `/apps` (EN, no prefix) → search placeholder **"Search apps..."**, empty **"No apps found."**, pagination summary **"Showing {n} of {total} apps"**, nút **"Open {App}"**, group **"Filter by category"**. Bắt missing-message key cả 2 locale. Tên category thực từ API `displayName` KHÔNG dịch. | A+B |
| 10 | Error / loading | ✅ (NEW) | `page.route` `GET /apps` → **500** (chú ý React Query retry 2 lần cho 5xx → chờ đủ retry) → `role="alert"` hiện `apps.error`. `GET /apps/categories` → **500** → pills ẩn nhưng grid "All" vẫn chạy. Loading → `AppCardSkeleton` × 12 (grid skeleton). | A+B (loading thiên B) |
| 11 | Mutation safety | N/A | Feature **read-only**: chỉ `GET` (`/apps`, `/apps/categories`); **Open** = `window.open` (không ghi server, không mutate state bền vững). Không có write → không cần revert/idempotent. | — |
| 12 | Accessibility | ✅ (NEW — partial) | Pills `role="group"` + `aria-pressed` (đã có). **ADD**: keyboard nav card + pills (Tab focus, Enter kích hoạt **Open**); focus ring hiển thị; live-region `#announcer` phát `apps.announce.*` khi search (loaded count) / page change / category change / loading. Card icon `aria-hidden` (decorative), tên app là text. | B |

### Artifact reconcile (BẮT BUỘC ở implementation)

`docs/specs/web-app-user-list/e2e.md` hiện **stale** (chỉ 3 scenario: render / search / Open) — thiếu **category-pills** + **EN-locale** vốn ĐÃ tồn tại trong `client/e2e/web-app-user-list/apps-list.e2e.ts`. Khi implement phải **reconcile cả 3 artifact** (matrix ↔ `e2e.md` ↔ test file) theo CLAUDE.md §4.3:

- **ADD** vào `e2e.md`: scenario category-pills filter (row 7) + EN-locale render (row 9) cho khớp test file đang có.
- **ADD** (chưa có test): rows 2 (AuthN), 4 (Validation API), 5 (Empty/null), 6 (Boundary/pagination — seed-gated), 10 (Error/loading), 12 (Accessibility keyboard/announcer).
- Giữ matrix (file này) ↔ `e2e.md` ↔ `*.e2e.ts` đồng bộ; không update 1 cái mà bỏ 2 cái còn lại.

---

## 7. Open follow-ups (explicitly deferred)

- Per-user **entitlement** launch-gating + entitlement seeder (currently empty collection).
- ~~Category **filter** dropdown (the inert "Filter" button).~~ → Đã giao cho feature `apps-api-integration` (panel pills + `categoryId` filter); hợp nhất vào matrix §6 row 7.
- Favorites / Recently-used wiring on this page.
