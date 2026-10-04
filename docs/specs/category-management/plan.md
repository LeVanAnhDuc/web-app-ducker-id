# Plan — Category Management

> Design: `design.md` · Mock: `docs/ui-designs/category-management/category-management.html` · Branch: `feat/category-management`

Mỗi bước kết thúc xanh: server `pnpm type-check && pnpm lint && pnpm test`, client `pnpm exec tsc --noEmit && pnpm lint`.
User cho phép làm thẳng tới merge (04.10.2026) — không dừng ở review gate từng commit.

## Môi trường E2E của worktree

Checkout chính đang chiếm `:3000` / `:5000` và DB `ducker-id`. Worktree chạy riêng để migration không đụng dữ liệu chung:

- `server/.env` = bản sao `.env` chính, `PORT=5100`, `DB_NAME=ducker-id-category-management`, `CLIENT_URL=http://localhost:3100`.
- `client/.env.local`: `API_SERVER_URL=http://localhost:5100`; chạy `pnpm dev -p 3100`.
- `.worktree-state.json` (gốc repo chính) thêm khoá `category-management` → `clientPort: 3100` để Playwright tự lấy base URL.
- DB riêng: `pnpm seed` (shape mới) — và một lượt **seed bằng code `main` + migration** để kiểm tra migration trên dữ liệu thật.

## BE

1. **Model + types**
   - `models/web-app-category.ts`: `slug`, `name: { en, vi }` (sub-schema `_id: false`), `sortOrder`; bỏ `displayName`, `icon`;
     index `slug` unique, `name.en` unique collation `{ locale: "en", strength: 2 }`, `sortOrder`.
   - `models/web-app.ts`: `categoryIds: [ObjectId]` (ref, validator 1–5 + không trùng), virtual `categories`
     (`justOne: false`); index `{ categoryIds: 1, sortOrder: 1 }`.
     Virtual populate **không** giữ thứ tự `localField` → DTO sắp lại theo `categoryIds` (sửa câu tương ứng trong design §3.1).
   - `WebAppCategoryDocument` + `WEB_APP_CATEGORY_CONFIG` chuyển sang `modules/category/{types,constants}`;
     `WEB_APP_CATEGORY_CONFIG` được model dùng → giữ ở module, model import từ `@/modules/category/constants` (như web-app).
2. **Module `category/`** (layout chuẩn, `services/deps.ts` = `{ categoryRepo, webAppRepo }`)
   - `repository/category.repository.ts` (interface) + `impl/mongo-category.repository.ts`:
     `findAllWithAppCount` (aggregate `$lookup` đếm `web_apps.categoryIds`), `findById`, `findBySlug`,
     `existsByNameEn(nameEn, excludeId?)` (collation), `slugsStartingWith(base, excludeId?)`, `maxSortOrder`,
     `create`, `updateById`, `findNeighbor(sortOrder, direction)`, `setSortOrder(id, n, session)`, `deleteById(id, session)`,
     `countExisting(ids)`.
   - `web-app` repository thêm: `countByCategory(id)`, `findOrphansOf(id)` (`$size:1, $all:[id]`),
     `reassignOrphans(pairs, categoryId, session)`, `pullCategory(id, session)`.
   - `services/`: `list.ts`, `list-public.ts`, `create.ts`, `update.ts`, `move.ts`, `delete-impact.ts`, `remove.ts`,
     `shared/generate-slug.ts` (helper thuần `slugify` (đ→d, cắt 90) + vòng thử hậu tố, retry E11000 slug ≤ 3 — DR-13/16).
     Helper thuần `normalizeName` (DR-11) dùng trong Joi `custom`. `move` chuẩn hoá lại toàn bộ `sortOrder` (DR-15). `move` / `remove` dùng
     `mongoose.startSession()` + `withTransaction` như `signup/services/complete-signup.ts`.
   - `remove`: đọc lại tập mồ côi trong transaction → so với `reassignments` (thừa/thiếu → 409
     `CATEGORY_IMPACT_CHANGED`); `categoryId` = chính nó / không tồn tại hoặc `appId` trùng → 400 `CATEGORY_REASSIGN_INVALID`;
     thiếu khi có mồ côi → 400 `CATEGORY_REASSIGN_REQUIRED`.
   - `dtos/`: `admin-category.dto.ts` (`_id, slug, name, sortOrder, appCount`), `public-category.dto.ts`
     (`_id, slug, name`), `delete-impact.dto.ts`.
   - Controller + routes: admin router `/admin/categories` (`authGuard, adminGuard`, `rl.categoryMutationByIpAndUser` trên mutation (120/60s — DR-21));
     user router `/apps/categories` (giữ `categoriesByIp`, `optionalAuthGuard`, `Cache-Control: public, max-age=60` — DR-19).
   - Swagger `category/swagger/{paths,schemas,index}.ts` + đăng ký `openapi.ts` (schemas, paths, tag).
3. **Validators** `validators/schemas/category.ts`: create, update (`min(1)` key), move (`direction` valid up/down),
   id param, delete body (`reassignments` mảng `{appId, categoryId}` ObjectId, `unique("appId")`, `max(500)`, default `[]`).
   Trim tên; chuỗi chỉ khoảng trắng → rỗng → lỗi required.
4. **web-app**
   - Bỏ `list-categories.ts`, `list-user-categories.ts`, `admin-category.dto.ts`, `user-category.dto.ts`, route
     `/admin/apps/categories`, `repositories/web-app-category.repository.ts` + impl. Chỉ còn một repository →
     đổi `repositories/` → `repository/` (cập nhật import ở favorite, oauth, recent-app).
   - `categoryIds` ở types, create/update (kiểm tra mọi id tồn tại → 400 `WEB_APP_CATEGORY_NOT_FOUND`),
     `buildWebAppFilter` (`categoryIds: x`), Joi (`array().items(objectId).min(1).max(5).unique()`), DTO
     (`AdminAppDto.categoryIds`, `UserAppDto.categories`), populate `categories` (`select: "slug name"`), swagger.
   - `favorite`, `recent-app` DTO → `categories`.
5. **Hằng số / i18n / rate limit**: `ERROR_CODES` khối Category (`CATEGORY_NOT_FOUND`, `CATEGORY_NAME_TAKEN`,
   `CATEGORY_REASSIGN_REQUIRED`, `CATEGORY_REASSIGN_INVALID`, `CATEGORY_IMPACT_CHANGED`); i18n `category.json` en + vi,
   đăng ký `i18n/config.ts` + `locales/*/index.ts`; `RATE_LIMIT.CATEGORIES.MUTATION_PER_IP_AND_USER` + `categoryMutationByIpAndUser`.
6. **Wire** `modules.loader.ts`: `createCategoryModule(rateLimiter)` trước web-app; trả `categoryRepo` cho web-app.
7. **Migration** `database/migrations/category-management.ts` + script `migrate:category-management`
   (theo mẫu `drop-temp-password-fields.ts`: native `collection`, idempotent, log số lượng, pre-check trùng khác hoa thường — DR-22) — gồm drop index cũ
   `categoryId_1_sortOrder_1` và `name_1` của category, rồi `syncIndexes()`. Cập nhật `server/.claude/rules/database.md`
   (local-only) về `migrations/`.
8. **Seed**: `data/web-app-categories.ts` (`slug`, `name.en/vi`), `data/web-apps.ts` giữ `categoryName` → seeder map
   thành `categoryIds`; không đổi tên app.
9. **Unit test** `modules/category/services/spec/*.spec.ts` + cập nhật `web-app.spec.ts`, `user-app.dto.spec.ts`,
   `admin-app.dto.spec.ts`, `favorite.spec.ts`, `helpers/index.spec.ts`; spec cho `slugify` + migration transform thuần.

## FE

1. **Hằng số / types / requests**: `ROUTES.ADMIN_CATEGORIES`; `END_POINTS.ADMIN_CATEGORIES`, `ADMIN_CATEGORY_BY_ID`,
   `ADMIN_CATEGORY_MOVE`, `ADMIN_CATEGORY_DELETE_IMPACT`; `QUERY_KEYS.ADMIN_CATEGORIES`, `ADMIN_CATEGORY_DELETE_IMPACT`;
   `constants/category.ts` (`MOVE_DIRECTION`, `CATEGORY_LIMITS`); bỏ `ADMIN_APP_CATEGORIES`.
   Types `types/AdminCategories`, sửa `types/Apps` (`UserCategory`, `UserApp.categories`), `types/AdminApps` (`categoryIds`).
   `requests/adminCategories.ts`; `requests/apps.ts`, `requests/server/apps.ts` theo shape mới.
2. **Utils**: `pickLocalized(name, locale)`, `slugify` (bản preview khớp server). Xoá `resolveCategoryLabel`,
   `dataSources/Categories`, khối `common.categories`, `components/CategoryChip` (không ai dùng).
3. **`components/CategoryChips`** — container query (`@container`), đủ chỗ thì wrap tối đa 2 dòng, hẹp thì chip đầu +
   `+N` (`CustomButton` mở Popover khi hover/focus/tap). Thay chip đơn ở `AppCard`, `QuickAccessCard`,
   `RecommendedAppCard`, `HeaderSearch/ResultRow`, `RecentAppRow`, cột Category `AdminAppsTable`; props `category` →
   `categories`.
4. **Bộ lọc** `/apps`, `/favorites`, `/admin/apps`: option dựng bằng `pickLocalized`.
5. **View `AdminCategories`** + route `admin/categories/page.tsx` + nav `dataSources/AdminSidebar` (`Tags`, sau Apps) +
   locale `admin.json` `sidebar.nav.categories`; namespace mới `adminCategories` (en + vi, `types/libs.d.ts`).
   - `mains/`: `AdminCategoriesBoard` (PageShell/PageHeader/PageContent), `CategoryFormSheet`, `DeleteCategoryDialog`.
   - `components/`: bảng (`dataSources/AdminCategories` columns), `CategoryCardList` (mobile), `MoveButtons`,
     `NameEnField`, `NameViField`, `SlugPreview`, `ReassignPanel`, `ReassignRow`, `DeleteImpactSkeleton`,
     `DeleteImpactError`, `LastCategoryBlocked`, `AdminCategoriesEmpty`.
   - `hooks/`: `useAdminCategories`, `useCreateCategory`, `useUpdateCategory`, `useMoveCategory` (không optimistic; `setQueryData` từ response; khoá mọi nút khi pending — DR-15),
     `useDeleteImpact`, `useDeleteCategory`, `useReassignState` (`useReducer { bulk, overrides }`).
   - `forms/AdminCategory/` (`data.ts`, `validations.ts`, `index.ts`) + `fieldNames/AdminCategory.ts`.
6. **Form app**: `CategoryMultiSelect` (Popover + Command theo `AdminEntitlements/components/UserMultiSelect`), giới hạn 5,
   chip đầu "Primary", tìm không phân biệt dấu, "+ Create category" → `QuickCreateCategoryDialog`
   (dùng lại `forms/AdminCategory`). `forms/AdminApp` `categoryIds: []`, zod `min(1).max(5)`; `FormResetEffect`,
   `AdminAppsFormSheet` map `categoryIds`.
7. **Cache**: `requests/server/apps.ts` `revalidate: 60`; `AppsBoard` dùng danh mục SSR làm `initialData` (`staleTime: 0`) (DR-19).
8. **Invalidate**: mutation danh mục invalidate `ADMIN_CATEGORIES`, `APP_CATEGORIES`, `ADMIN_APPS`, `APPS`,
   `FAVORITES`, `RECENT_APPS`.

## E2E (`client/e2e/admin-categories/` — project `admin`; thêm vào regex `testIgnore`/`testMatch`)

Helper `e2e/helpers/categories.ts`: `adminApi()` (login 1 lần / file), `listCategories`, `createCategory`,
`deleteCategory(id, reassignments)`, `setAppCategories(appName, ids)`, `snapshotAppCategories()` /
`restoreAppCategories(snapshot)`, `restoreOrder(snapshotIds)`.

| File | Matrix rows |
| --- | --- |
| `categories-list.e2e.ts` | 1 (list), 5 (empty stub), 8 (slug mono, số app), 9 (en/vi dòng chính-phụ), 12 (aria-label) |
| `categories-crud.e2e.ts` | 1 (tạo/sửa/slug đổi theo/xoá rỗng), 4-UI (EP/BVA/DT form), 10 (POST 500), 11 (double-submit, 404 khi đã bị xoá) |
| `categories-move.e2e.ts` | 1 (move), 6 (BVA vị trí), 10 (move 500 rollback), 12 (focus giữ ở nút) |
| `categories-delete.e2e.ts` | 5 (impact 0 / chỉ gỡ), 6 (mồ côi 0/1/N), 10 (skeleton, impact lỗi), 11 (DT xoá, ST override/chung, 409 impact đổi, 3d stub) |
| `categories-api.e2e.ts` | 4-API (tampered, 400/404), 6 (`?page` bị bỏ qua, 6 categoryIds → 400) |
| `app-categories.e2e.ts` | 1 (gán 2 danh mục, tạo nhanh), 6 (0/1/5), 7 (lọc chính/phụ/không, URL giữ), 8 (thứ tự chip, Primary, +N 375px, header search), 9 (tên vi không có trong locale) |
| `admin-authz/admin-authz.e2e.ts` (sửa) | 2, 3 |

Reconcile: `web-app-user-list/categories-public-ssr` (shape), `favorite-apps/*`, `recently-used`, `header-search`, `home`,
`admin-apps/edit-apps`, `admin-apps/frontend-cleanup/copy-secret` (payload `categoryIds`).

**Hoãn (có lý do):** danh sách mồ côi > 6 dòng cuộn — seed chỉ có 6 app, không có API xoá app; mượn cả 6 sẽ phá
spec khác chạy cùng DB. Ghi follow-up trong `e2e.md`.

Gate B (walk MCP) bỏ qua mutation của hàng `A only`, chỉ kiểm tra đọc/hiển thị.

## Docs

`design.md` (sửa câu populate), `e2e.md`, `docs/erd.md`, `docs/project-goals.md` (MVP-4), `docs/unfinished-features.md`,
README `## Features` + số test, `CLAUDE.md` (module `category`, bỏ `/admin/apps/categories`, số suite/test, migration).

## Hoàn tất

PR → merge → xoá worktree + branch local/remote, gỡ khoá `category-management` khỏi `.worktree-state.json`,
drop DB `ducker-id-category-management`, dừng dev server của worktree.
