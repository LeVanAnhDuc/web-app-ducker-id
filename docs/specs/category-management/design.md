# Design — Category Management

> Feature: `category-management` · Branch: `feat/category-management` · Worktree: `.worktrees/category-management`
> Status: design duyệt 04.10.2026 (cập nhật DR-5b cùng ngày) · mock UI: `docs/ui-designs/category-management/` (chờ duyệt).

## 1. Bối cảnh & vấn đề

`docs/project-goals.md` (MVP-4) ghi "Loại bỏ Categories hardcoded — admin tự định nghĩa". Hiện tại:

- Collection `web_app_categories` (`name` = slug, `displayName`, `icon`, `sortOrder`) đã có, nhưng **chỉ có
  API đọc** (`GET /admin/apps/categories`, `GET /apps/categories`). 4 danh mục sinh bởi seed
  (`server/src/database/seeders/data/web-app-categories.ts`); muốn thêm danh mục phải sửa seed.
- Client dịch tên qua map cứng `dataSources/Categories/index.ts` (slug → key `common.categories.*` trong
  `locales/{en,vi}/common.json`). Danh mục không có trong map chỉ hiện `displayName` một ngôn ngữ.
- Mỗi app thuộc **đúng 1** danh mục (`WebApp.categoryId`), card hiển thị 1 chip.
- `icon` của danh mục luôn `null`, không nơi nào dùng.

**Mục tiêu:** admin tạo / sửa / sắp xếp / xoá danh mục song ngữ từ UI; mỗi app gắn 1–5 danh mục;
bỏ mọi phần hard-code ở client.

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
| --- | --- | --- |
| DR-1 | **Trang riêng `/admin/categories` + tạo nhanh trong form app** | Trang riêng cho sửa / xoá / sắp xếp; tạo nhanh để không phải rời form khi thiếu danh mục. (User chọn) |
| DR-2 | **Tên song ngữ `name: { en, vi }`, cả hai bắt buộc** | Bỏ được map i18n cứng ở client. (User chọn) |
| DR-3 | **Server trả cả `en` và `vi`, client tự chọn theo `useLocale()`** — không dịch theo request | Client không gửi `Accept-Language` cho API, và SSR `/apps` cache danh mục 300s không theo locale → dịch phía server sẽ trộn ngôn ngữ trong cache. |
| DR-4 | **Nhiều danh mục: `categoryIds: ObjectId[]`, 1–5, không trùng, có thứ tự**; phần tử đầu là danh mục chính | (User chọn nhiều + giới hạn 1–5.) Thứ tự cho biết chip nào hiện khi card bị thu gọn. |
| DR-5 | **Xoá kèm chuyển app mồ côi**: app còn danh mục khác thì chỉ `$pull`; app chỉ thuộc danh mục bị xoá thì **mỗi app phải có một danh mục đích**. Thực hiện trong **một transaction** | (User chọn.) Không để app nào rỗng danh mục, không mất dữ liệu ngầm. Server đã dùng transaction ở `signup/services/complete-signup.ts`. |
| DR-5b | **Dialog xoá cho chọn chung + chọn riêng**: ô "Chuyển tất cả sang" điền cho mọi app chưa đặt riêng; mỗi app có select riêng để ghi đè. API nhận danh sách `{ appId, categoryId }` đầy đủ — gom chung/riêng là việc của client | (User yêu cầu 04.10.2026.) Nhiều app mồ côi thường về cùng một chỗ, nhưng vẫn có app cần đi chỗ khác. Server chỉ thấy kết quả cuối, không cần biết khái niệm "chung". |
| DR-6 | **Sắp xếp bằng nút ↑ / ↓**, không kéo thả | Dùng được bằng bàn phím, không thêm thư viện dnd. (User chọn) |
| DR-7 | **Slug luôn sinh từ `name.en`** — đổi `name.en` thì slug sinh lại khi lưu; admin không nhập slug trực tiếp | (User đổi ý 04.10.2026: không để slug cứng.) An toàn vì sau feature này không gì tham chiếu slug lâu dài: filter URL dùng `_id`, map i18n theo slug bị xoá. Slug chỉ còn là định danh đọc được, và nó luôn khớp với tên. |
| DR-8 | **Xoá hẳn field `icon`** khỏi DB, type, DTO, seed, Swagger | Không nơi nào dùng. (User chọn) |
| DR-9 | **Chip co giãn**: màn rộng hiện đủ và wrap; màn hẹp hiện chip đầu + `+N`, `+N` mở Popover khi hover / focus / tap | (User chọn.) Popover thay tooltip vì màn cảm ứng không có hover. |
| DR-10 | **`GET /admin/categories` không phân trang** | Sắp xếp ↑ / ↓ giữa các trang không có nghĩa; số danh mục nhỏ. |

## 3. Backend

### 3.1 Model

**`WebAppCategory`** (`server/src/models/web-app-category.ts`, collection `web_app_categories`)

| Field | Type | Ghi chú |
| --- | --- | --- |
| `slug` | String | đổi tên từ `name`; required, unique, lowercase, ≤ 100; luôn suy ra từ `name.en` (DR-7) |
| `name.en` | String | required, trim, ≤ 100; unique không phân biệt hoa thường (collation index) |
| `name.vi` | String | required, trim, ≤ 100 |
| `sortOrder` | Number | default 0; tạo mới = `max + 1` |
| ~~`displayName`~~, ~~`icon`~~ | — | xoá |

Index: `{ slug: 1 }` unique · `{ "name.en": 1 }` unique, collation `{ locale: "en", strength: 2 }` · `{ sortOrder: 1 }`.

**`WebApp`** (`server/src/models/web-app.ts`)

- `categoryId` → `categoryIds: [ObjectId → WEB_APP_CATEGORY]`, validator 1–5 phần tử không trùng.
- Virtual `category` → `categories` (populate giữ thứ tự theo `categoryIds`; Mongoose populate mảng giữ đúng thứ tự).
- Index `{ categoryId: 1, sortOrder: 1 }` → `{ categoryIds: 1, sortOrder: 1 }` (multikey).

### 3.2 Migration

Không có framework migration → script idempotent `server/src/database/migrations/category-management.ts`,
chạy bằng `pnpm migrate:category-management`:

1. `web_app_categories`: `name` → `slug`; `displayName` → `name.en`; `name.vi` lấy từ bản dịch cứng hiện tại
   của 4 slug cũ (`content` → "Nội dung", `tools` → "Công cụ nội bộ", `identity` → "Định danh",
   `productivity` → "Năng suất"), slug khác thì bằng `name.en`; `$unset` `displayName`, `icon`.
2. `web_apps`: `categoryIds = [categoryId]`; `$unset categoryId`.
3. Drop index cũ, `syncIndexes()`.

Chỉ đụng document chưa có shape mới, nên chạy lại không hỏng dữ liệu. Seed (`web-app-categories.ts`,
`web-apps.ts`, `web-app.seeder.ts`) đổi sang shape mới.

### 3.3 Module `server/src/modules/category/`

Tách khỏi `web-app` vì giờ có vòng đời CRUD riêng. Layout chuẩn (`server/.claude/rules/modules.md`):
`category.module.ts`, `category.routes.ts`, `category.controller.ts`, `dtos/`, `types/`, `constants/`,
`swagger/`, `repository/` (interface + `impl/mongo-category.repository.ts`), `services/` (một method một file,
`deps.ts` vì cần cả `categoryRepo` lẫn `webAppRepo`). Wire trong `modules.loader.ts` **trước** `web-app`;
`web-app` nhận `categoryRepo` để kiểm tra `categoryIds` tồn tại.

`WEB_APP_CATEGORY_CONFIG` và `WebAppCategoryDocument` chuyển sang module mới.

### 3.4 Endpoint

Admin — `authGuard` + `adminGuard`; mutation có rate limit (`rl.categoryMutationByIp`):

| Method | Path | Body / query | Kết quả |
| --- | --- | --- | --- |
| GET | `/admin/categories` | — | `AdminCategoryDto[]` sắp theo `sortOrder` |
| POST | `/admin/categories` | `{ name: { en, vi } }` | 201 `AdminCategoryDto`; trùng `name.en` → 409 `CATEGORY_NAME_TAKEN` |
| PATCH | `/admin/categories/:id` | `{ name: { en?, vi? } }` (≥ 1 field) | 200; 404; 409. Đổi `name.en` → sinh lại slug (kiểm tra trùng bỏ qua chính bản ghi này, nên đổi hoa thường không thêm hậu tố) |
| POST | `/admin/categories/:id/move` | `{ direction: "up" \| "down" }` | 200 danh sách mới; ở biên → 200 không đổi |
| GET | `/admin/categories/:id/delete-impact` | — | `{ total, orphaned: [{ _id, displayName }] }` |
| DELETE | `/admin/categories/:id` | body `{ reassignments: [{ appId, categoryId }] }` (mặc định `[]`) | 204; thiếu app mồ côi nào → 400 `CATEGORY_REASSIGN_REQUIRED`; `categoryId` = chính nó / không tồn tại, hoặc `appId` trùng → 400 `CATEGORY_REASSIGN_INVALID`; tập app mồ côi lúc xoá khác tập `appId` gửi lên (có app được gán/bỏ danh mục kể từ lúc mở dialog) → 409 `CATEGORY_IMPACT_CHANGED` |

```ts
interface AdminCategoryDto {
  _id: string;
  slug: string;
  name: { en: string; vi: string };
  sortOrder: number;
  appCount: number; // $lookup/aggregate đếm web_apps có categoryIds chứa _id
}
```

Slug: `slugify(name.en)` (lowercase, bỏ dấu, ký tự khác `[a-z0-9]` → `-`, gộp `-`), trùng thì thêm `-2`, `-3`…; dùng chung cho create và update (`services/shared/generate-slug.ts`).

**Move:** tìm danh mục kề bên theo `sortOrder`, đổi `sortOrder` hai bản ghi trong transaction.

**Delete:** trong transaction —
1. Đọc lại tập app mồ côi `{ categoryIds: { $size: 1, $all: [id] } }`; so với tập `appId` trong `reassignments` — khác nhau thì 409 (thừa hoặc thiếu đều tính).
2. `bulkWrite` mỗi phần tử `reassignments` một `updateOne({ _id: appId, categoryIds: { $size: 1, $all: [id] } }, { $set: { categoryIds: [categoryId] } })`.
3. `updateMany({ categoryIds: id }, { $pull: { categoryIds: id } })`.
4. `deleteOne({ _id: id })`.

Joi: `reassignments` là mảng `{ appId: objectId, categoryId: objectId }`, `unique('appId')`, tối đa 500 phần tử. Body trên `DELETE` đi qua rewrite `/api/v1` của Next bình thường; axios gửi bằng `data`.

Public: `GET /apps/categories` → `UserCategoryDto[] = { _id, slug, name: { en, vi } }`.

Bỏ: `GET /admin/apps/categories` (và `listCategories` / `listUserCategories` trong `web-app`).

### 3.5 Thay đổi ở `web-app`, `favorite`, `recent-app`

- `UserAppDto` (dùng cho `/apps`, favorites, recent, header search): `category`, `categorySlug` →
  `categories: UserCategoryDto[]` theo đúng thứ tự `categoryIds`.
- `AdminAppDto`: `categoryId` → `categoryIds: string[]`.
- Joi (`server/src/validators/schemas/web-app.ts`): `categoryIds: Joi.array().items(objectId).min(1).max(5).unique()`
  — required khi tạo, optional khi sửa. Service kiểm tra mọi id tồn tại → 400 `webApp:validation.categoryIds.notFound`.
- Filter `?categoryId=` giữ nguyên tên và kiểu; repository đổi `categoryId: x` → `categoryIds: x`.
- Swagger: thêm `category/swagger` vào `openapi.ts`; cập nhật schema app.
- i18n server: key lỗi mới ở `src/i18n/locales/{en,vi}/category.json`.

## 4. Frontend

### 4.1 Trang `/admin/categories`

- Route `src/app/[locale]/(private)/(admin)/admin/categories/page.tsx` → view `src/views/AdminCategories/`.
- `ROUTES.ADMIN_CATEGORIES`, `END_POINTS.ADMIN_CATEGORIES*`, `QUERY_KEYS.ADMIN_CATEGORIES`; mục nav admin
  (icon Lucide `Tags`) đặt ngay sau "Apps".
- App shell: `PageShell → PageHeader` (tiêu đề + nút "Tạo danh mục") `→ PageContent` với `CustomTable`.
  Không có toolbar / search / pagination (DR-10).
- Cột: **Thứ tự** (↑ ↓, disable ở biên, `aria-label`) · **Tên** (tên theo locale hiện tại + tên ngôn ngữ còn
  lại làm dòng phụ muted) · **Slug** (mono) · **Số app** · **Hành động** (sửa, xoá).
- Empty state: "Chưa có danh mục nào" + nút tạo.
- Tạo / sửa: `Sheet` với form `name.en`, `name.vi` (zod: required, ≤ 100); slug là preview read-only cập nhật
  khi gõ `name.en` (cùng hàm slugify phía client, chỉ để xem — server mới là nguồn). Khi sửa mà slug mới khác
  slug cũ thì hiện `cũ → mới`. Hậu tố `-2` do trùng chỉ biết sau khi lưu. Lỗi 409 gắn vào ô `name.en`.
- Xoá: `AlertDialog` (max 500px). Mở dialog là gọi `delete-impact` (skeleton trong lúc chờ):
  - `total = 0` → chỉ xác nhận.
  - `orphaned = 0` → "N app sẽ được gỡ danh mục này" + danh sách app.
  - `orphaned > 0` → khối **chọn danh mục mới** (mock 3c):
    - **"Chuyển tất cả sang"** — `Select` chung (loại trừ chính danh mục đang xoá).
    - **"Hoặc chọn riêng từng ứng dụng"** — mỗi app mồ côi một dòng: icon + tên + `Select`. Option đầu của
      select là lựa chọn chung (`"<tên> (chung)"`, hoặc "Chọn danh mục…" khi chưa chọn chung). Chọn một danh mục
      khác → dòng thành **Đặt riêng** (chip + keyline brass bên trái) và không bị ô chung ghi đè; chọn lại option
      đầu → bỏ đặt riêng.
    - Đích của một app = `override[appId] ?? bulk`. Bộ đếm `k/N đã có đích` (`aria-live`) + dòng nhắc
      "Còn N ứng dụng chưa có danh mục mới". Nút xoá disabled tới khi đủ N.
    - Danh sách cuộn trong dialog khi quá ~6 dòng; màn < 640px thì select xuống dưới tên app.
    - State là local của dialog (`useReducer`: `{ bulk, overrides }`), reset khi đóng.
    - 409 `CATEGORY_IMPACT_CHANGED` → refetch `delete-impact`, giữ `bulk` và các override của app vẫn còn mồ côi,
      toast báo danh sách đã thay đổi.
  - Nếu đây là danh mục cuối cùng mà còn app mồ côi → không có đích; dialog báo phải tạo danh mục khác trước.

### 4.2 Form app — `CategoryMultiSelect`

Thay `views/AdminApps/components/CategorySelect` bằng `CategoryMultiSelect` (Popover + Command, giống picker ở
`admin-entitlements-user-options`):

- Trigger hiển thị chip theo thứ tự chọn, chip đầu có nhãn "Chính", mỗi chip có nút ✕.
- Danh sách có checkbox; đủ 5 thì các mục chưa chọn bị disabled + dòng gợi ý "Tối đa 5 danh mục".
- Cuối danh sách: **"+ Tạo danh mục mới"** (dùng chuỗi đang gõ trong ô tìm làm `name.en` mặc định) mở
  `Dialog` nhỏ với 2 ô tên; thành công thì invalidate `ADMIN_CATEGORIES` và tự thêm danh mục vào lựa chọn
  (nếu chưa đủ 5).
- Form value `categoryIds: string[]`; zod `.min(1).max(5)`.

### 4.3 `CategoryChips` (component dùng chung)

`src/components/CategoryChips/` thay `CategoryChip`:

- Props: `categories: { _id, name }[]`.
- Đo bằng container query (`@container`): đủ chỗ thì hiện hết và wrap tối đa 2 dòng; hẹp thì chip đầu + nút
  `+N`. `+N` là `button` mở `Popover` khi hover, focus hoặc tap, liệt kê đủ danh mục.
- Dùng ở: `AppCard`, `QuickAccessCard`, `RecommendedAppCard`, `HeaderSearch/ResultRow`, `RecentAppRow`, cột
  danh mục của `AdminAppsTable`.

### 4.4 Gỡ hard-code

- Xoá `src/dataSources/Categories/`, `resolveCategoryLabel` (`src/utils/index.ts`), khối `common.categories` ở
  `locales/{en,vi}/common.json`.
- Thêm `pickLocalized(name: { en; vi }, locale)` ở `src/utils/`.
- Filter `/apps`, `/favorites`, `/admin/apps` dựng option bằng `pickLocalized`.
- Type: `UserCategory`, `WebAppCategory` (AdminApps) đổi theo DTO mới; `AdminApp.categoryId` → `categoryIds`.

## 5. Bảo mật

- Mọi endpoint `/admin/categories*` sau `authGuard` + `adminGuard`; user thường → 403 (thêm vào `e2e/admin-authz/`).
- Joi `stripUnknown` chặn ghi `slug` / `sortOrder` qua body.
- Tên danh mục render như text (React escape), không `dangerouslySetInnerHTML`.
- Rate limit cho POST / PATCH / move / DELETE.

## 6. Kiểm thử

**Jest (server):**
- create: sinh slug, slug trùng → hậu tố, `name.en` trùng (khác hoa thường) → 409, `sortOrder = max + 1`.
- update: 404, 409; đổi `name.en` → slug sinh lại; chỉ đổi `name.vi` → slug giữ nguyên; đổi hoa thường
  `name.en` của chính nó → slug không thêm hậu tố; slug mới trùng danh mục khác → hậu tố.
- move: lên / xuống, ở biên không đổi.
- delete-impact: đếm đúng `total` / `orphaned`.
- delete: không app; chỉ app không mồ côi; mồ côi về cùng một đích; mồ côi về các đích khác nhau;
  thiếu một app mồ côi (400); `categoryId` = chính nó / không tồn tại (400); `appId` trùng (400);
  gửi app không còn mồ côi hoặc thiếu app vừa thành mồ côi (409).
- web-app: validator `categoryIds` (0, 6, trùng, id không tồn tại); DTO giữ thứ tự `categories`.
- migration: chạy hai lần cho cùng kết quả.

**E2E:** kịch bản chi tiết sinh bằng skill `e2e-scenario-coverage` ở bước plan, ghi vào `e2e.md`. Spec hiện
có phải sửa: `web-app-user-list/categories-public-ssr`, `favorite-apps/favorites-page`, `admin-apps/edit-apps`,
`header-search`, `recently-used`, `home`.

## 7. Tài liệu

- `docs/project-goals.md`: đánh dấu xong "Loại bỏ Categories hardcoded" (MVP-4).
- `docs/unfinished-features.md`: cập nhật mục Apps / Admin apps.
- `docs/erd.md`: `WEB_APP_CATEGORY` (slug, name.en/vi), `WEB_APP.categoryIds`.
- README `## Features`: một bullet về quản lý danh mục.

## 8. Ngoài phạm vi

Icon danh mục · kéo thả · danh mục lồng nhau · nhập slug tay · soft delete · trang public duyệt theo danh mục.
