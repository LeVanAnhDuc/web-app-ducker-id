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

### Quyết định bổ sung sau rà soát E2E (04.10.2026)

| # | Quyết định | Lý do |
| --- | --- | --- |
| DR-11 | **Chuẩn hoá tên** trước mọi kiểm tra: bỏ ký tự zero-width (`U+200B–U+200D`, `U+2060`, `U+FEFF`), NBSP → space, gộp khoảng trắng, trim. Rỗng sau chuẩn hoá → 400 required | Không để `Content` + zero-width lọt qua unique index thành bản sao nhìn y hệt. |
| DR-12 | **`name.en` phải sinh ra slug không rỗng** (có ít nhất một chữ/số Latin sau khi bỏ dấu) → nếu không, 400 `noSlug`. `đ/Đ` → `d` | Tên chỉ toàn emoji/ký hiệu không có slug hợp lệ; NFD không tách `đ`. |
| DR-13 | **Slug tối đa 100**: phần gốc cắt còn 90 ký tự trước khi thêm hậu tố `-n` | Hai tên 100 ký tự cùng slug không làm vượt giới hạn. |
| DR-14 | **Chỉ `name.en` unique.** `name.vi` được trùng | Slug và định danh dựa trên en; hai danh mục trùng tên vi là lựa chọn của admin, không phá dữ liệu. |
| DR-15 | **Move không optimistic, chuẩn hoá lại toàn bộ thứ tự.** Server đọc danh sách theo `(sortOrder, _id)`, đổi chỗ, ghi lại `sortOrder = index` cho mọi bản ghi trong transaction và trả danh sách mới; client hiển thị đúng danh sách đó. Mọi nút ↑/↓ disabled khi đang có move chờ | Hai lần tạo đồng thời có thể sinh `sortOrder` trùng; chuẩn hoá khiến move luôn xác định. Không optimistic thì tab cũ cũng hiện đúng kết quả server. `withTransaction` tự retry WriteConflict. |
| DR-16 | **Tạo trùng đồng thời:** E11000 trên `name.en` → 409; trên `slug` → sinh slug lại, thử tối đa 3 lần | Không bao giờ trả 500 vì đua index. |
| DR-17 | **Tuỳ chọn tạo nhanh trong multi-select:** ô tìm rỗng → "+ Tạo danh mục mới"; có chữ và **không** khớp chính xác (không phân biệt hoa thường / dấu) tên en hoặc vi nào → "+ Tạo danh mục "<q>""; khớp chính xác → không hiện. Đủ 5 → disabled | Thống nhất mock 4a/4b/4c; tránh tạo bản trùng. |
| DR-18 | **Dialog xoá:** select từng dòng cũng loại trừ danh mục đang xoá. Chọn riêng một giá trị **bằng** giá trị chung vẫn tính là "Đặt riêng" (lựa chọn chủ động). State reset theo `categoryId` (dialog có `key`). Nút xác nhận disabled khi đang gửi. 400 `CATEGORY_REASSIGN_INVALID` (đích vừa bị xoá ở tab khác) → refetch danh mục + impact, bỏ các lựa chọn trỏ tới id không còn, toast | Ngăn rò state giữa hai lần mở; xử lý đích biến mất. |
| DR-19 | **Cache danh mục public giảm còn 60s** (`Cache-Control: max-age=60`, SSR `revalidate: 60`); `AppsBoard` dùng danh mục SSR làm `initialData` của React Query (`staleTime: 0`) để client làm mới ngay khi mount. Lọc theo id danh mục đã xoá → empty state, không lỗi | Sau khi xoá/đổi tên, bộ lọc `/apps` không hiện dữ liệu cũ quá 60s; dữ liệu cũ nếu còn thì vẫn an toàn. |
| DR-20 | **`+N` chặn lan sự kiện** (`stopPropagation` trên click/pointer/keydown) — bấm `+N` trong card hay kết quả header search không mở app, không ghi recently-used, không chọn kết quả | Card cả khối là vùng bấm mở app. |
| DR-21 | **Rate limit mutation danh mục: 120 / 60s theo IP + user** (`categoryMutationByIpAndUser`) | Đủ rộng cho thao tác admin và cho E2E `workers: 1`; vẫn chặn spam. |
| DR-22 | **Migration kiểm tra trước** các `displayName` trùng khác hoa thường → dừng với thông báo rõ, không tạo index nửa vời | Unique collation index sẽ fail giữa chừng. |
| DR-23 | **`appCount` đếm mọi app** (kể cả inactive); dialog xoá cũng tính app inactive | Xoá danh mục phải xử lý mọi app tham chiếu, không chỉ app đang hiện. |

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
- Virtual `category` → `categories` (`justOne: false`). Virtual populate **không** giữ thứ tự `categoryIds`, nên DTO
  sắp lại `categories` theo thứ tự `categoryIds`.
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
- Cột: **Thứ tự** (↑ ↓, disable ở biên và khi đang có move chờ, `aria-label`; không optimistic — DR-15) · **Tên** (tên theo locale hiện tại + tên ngôn ngữ còn
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
    - `delete-impact` lỗi → nội dung dialog thay bằng thông báo lỗi + nút "Thử lại"; nút xoá disabled.
  - Nếu đây là danh mục cuối cùng mà còn app mồ côi → không có đích; dialog báo phải tạo danh mục khác trước.

### 4.2 Form app — `CategoryMultiSelect`

Thay `views/AdminApps/components/CategorySelect` bằng `CategoryMultiSelect` (Popover + Command, giống picker ở
`admin-entitlements-user-options`):

- Trigger hiển thị chip theo thứ tự chọn, chip đầu có nhãn "Chính", mỗi chip có nút ✕.
- Danh sách có checkbox; đủ 5 thì các mục chưa chọn bị disabled + dòng gợi ý "Tối đa 5 danh mục".
- Cuối danh sách: tuỳ chọn tạo nhanh theo DR-17 (chuỗi đang gõ làm `name.en` mặc định) mở `Dialog` nhỏ với 2 ô
  tên; 409 hiện trong dialog. Thành công thì invalidate danh sách danh mục và tự thêm vào lựa chọn. Huỷ thì giữ
  nguyên chuỗi tìm và form app.
- Bỏ chip chính → chip kế tiếp thành "Primary". Bỏ chọn rồi chọn lại → danh mục xuống cuối.
- 400 `webApp:validation.categoryIds.notFound` (danh mục vừa bị xoá ở tab khác) → lỗi hiện dưới field, refetch danh mục.
- Form value `categoryIds: string[]`; zod `.min(1).max(5)`.

### 4.3 `CategoryChips` (component dùng chung)

`src/components/CategoryChips/` (mới). `src/components/CategoryChip/` hiện **không được import ở đâu** (pill lọc bị
bỏ sót) → xoá. Chip trên card hiện được render ngay trong từng card qua prop `category: string | null`; prop đổi
thành `categories: UserCategory[]` và card dùng `CategoryChips`:

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

### E2E Scenario Matrix

Sinh bằng skill `e2e-scenario-coverage` (bổ sung ở bước plan). Gate: `A+B` = cả `pnpm e2e` lẫn walk MCP;
`A only` = mutation, gate B chỉ kiểm tra phần đọc/hiển thị.

**Dữ liệu seed dùng làm mốc** (`server/src/database/seeders/data/`): 4 danh mục `content` (Blog),
`tools` (Analytics Dashboard, Operations Console), `identity` (IDMS Portal), `productivity` (Team Calendar, Notes).
Sau migration mỗi app có `categoryIds` một phần tử.

**Chiến lược dọn dữ liệu.** Không có API xoá app, nên test app mồ côi **mượn app seed**: ghi lại `categoryIds`
gốc → chuyển sang danh mục tạm qua `PATCH /admin/apps/:id` → thao tác → `afterAll` khôi phục đúng `categoryIds`
gốc. Danh mục tạm đặt tên `E2E <spec> <timestamp>` và bị xoá trong `afterAll` (kèm `reassignments` nếu cần).
Thứ tự danh mục seed được khôi phục bằng `move`. **Không đổi tên app** — `favorites-page` dựa vào vị trí
alphabet của "IDMS Portal". Helper mới: `client/e2e/helpers/categories.ts`.

| # | Category | Scenarios (kỹ thuật + giá trị) | Gate |
| --- | --- | --- | --- |
| 1 | Happy path | Admin mở `/admin/categories` → 4 danh mục seed đúng thứ tự, số app `1/2/1/2`. Tạo `Finance` / `Tài chính` → xuất hiện cuối bảng, slug `finance`. Sửa `name.en` → slug đổi theo. ↓ rồi ↑ một dòng → thứ tự đổi rồi về như cũ. Xoá danh mục rỗng. Form app: gán 2 danh mục cho Blog → card `/apps` hiện 2 chip đúng thứ tự. Tạo nhanh từ form app → danh mục mới tự được chọn. | A only (mutation) · B: đọc list |
| 2 | AuthN | Anon vào `/admin/categories` → về trang login. Anon gọi `GET/POST/PATCH/DELETE /api/v1/admin/categories*` → 401 `AUTH_MISSING_TOKEN`. | A+B |
| 3 | AuthZ | **[DT]** role (user) × method (GET list, POST, PATCH, POST move, GET delete-impact, DELETE) → mọi ô 403 `AUTH_ADMIN_ONLY`. User vào `/admin/categories` → trạng thái từ chối ổn định (bảng rỗng), không lộ dữ liệu. `GET /apps/categories` vẫn 200 cho anon/user/admin. Đặt trong `admin-authz/` (project `chromium`). | A+B |
| 4 | Validation | **[EP]** `name.en`: hợp lệ · rỗng · chỉ khoảng trắng · trùng khác hoa thường (`CONTENT`) · có dấu `Phân Tích` → slug `phan-tich` · ký tự đặc biệt `R&D / Ops` → `r-d-ops` · emoji `Apps 🚀` → `apps`. `name.vi`: rỗng → lỗi. **[BVA]** độ dài tên `100` (nhận) / `101` (client chặn; gọi API trực tiếp → 400). **[DT]** form tạo: `enRỗng × viRỗng` → cả hai ô báo lỗi, không gọi API; `enTrùng × viHợpLệ` → 409 gắn vào ô English; `enTrùng × viRỗng` → lỗi client ở ô vi, chưa gọi API. Tampered (API): `slug`/`sortOrder` trong body bị bỏ qua · `direction: "sideways"` → 400 · `:id` không phải ObjectId → 400 · id không tồn tại → 404 · `reassignments` có `categoryId` = chính nó → 400 · `appId` trùng → 400. | 4-UI: A only · 4-API: A+B |
| 5 | Empty / null | `GET /admin/categories` trả `[]` (stub `page.route`) → empty state + nút tạo. Dialog xoá: `total = 0` → chỉ xác nhận; `orphaned = 0` → danh sách app "chỉ gỡ". Lọc `/apps` theo danh mục mới chưa có app → empty state của list. Ô tìm trong multi-select không khớp → "Tạo danh mục "<q>"". | A+B |
| 6 | Boundary | **[BVA]** vị trí: dòng đầu ↑ disabled · dòng cuối ↓ disabled · dòng thứ 2 ↑ → thành đầu. **[BVA]** số danh mục mỗi app: `0` → lỗi "chọn ít nhất 1" · `1` · `5` → mục còn lại disabled + gợi ý tối đa · gọi API với `6` → 400. **[BVA]** app mồ côi khi xoá: `0` / `1` / `N` (3 app seed mượn). Phân trang: N/A (DR-10, không phân trang) — chỉ kiểm tra API bỏ qua `?page=`. Danh sách mồ côi > 6 dòng (cuộn): **hoãn** — seed chỉ có 6 app, mượn hết sẽ phá các spec khác. | A+B (6-UI move: A only) |
| 7 | Filter / search | **[EP]** lọc `/apps?categoryId=X`: app có X ở vị trí chính · app có X ở vị trí phụ · app không có X → chỉ 2 loại đầu hiện. Reload giữ `categoryId` trên URL. Lọc `/admin/apps` và `/favorites` theo danh mục đã gán phụ. Tìm trong multi-select: khớp một phần (`prod` → Productivity), không phân biệt dấu ở vi (`nang suat` → Năng suất). | A+B |
| 8 | Data rendering | Chip hiện tên theo locale, không phải slug. Thứ tự chip = thứ tự chọn. Chip đầu trong multi-select có nhãn "Primary"/"Chính". Màn 375px: card chỉ hiện chip đầu + `+N`; bấm `+N` → popover liệt kê đủ. Header search và bảng `/admin/apps` hiện chip đầu + `+N`. Bảng danh mục: slug font mono, số app đúng sau khi gán thêm. | A+B |
| 9 | i18n | `/vi/admin/categories`: tên vi là dòng chính, en là dòng phụ; `/admin/categories` ngược lại. Danh mục tạo trong test với tên vi **không có trong file locale** hiện đúng ở `/vi/apps` (chứng minh đã bỏ map cứng). Lỗi 409 / required, dialog xoá, bộ đếm `k/N` dịch đủ ở cả en và vi. | A+B |
| 10 | Error / loading | Mở dialog xoá với `delete-impact` bị trễ (stub) → skeleton. `POST` trả 500 → toast lỗi, sheet giữ giá trị đã nhập. `move` trả 500 → thứ tự không đổi + toast (không optimistic — DR-15). `delete-impact` lỗi → dialog báo lỗi kèm nút thử lại, nút xoá disabled. Fallback SSR danh mục khi server lỗi: giữ test hiện có trong `categories-public-ssr` (cập nhật shape). | A+B |
| 11 | Mutation / state | **[DT]** xoá: (mồ côi 0, khác 0) → xoá ngay · (0, >0) → app chỉ bị gỡ · (>0, chọn chung) → mọi app về đích chung · (>0, chỉ chọn riêng) → mỗi app về đích riêng · (>0, chung + 1 đặt riêng) → đặt riêng giữ nguyên, phần còn lại theo chung · (>0, thiếu 1 app) → nút xoá disabled. Kiểm tra kết quả qua API `GET /admin/apps`. **[ST]** dialog: đặt riêng → đổi ô chung → dòng đặt riêng **không** đổi; chọn lại "(chung)" → dòng theo ô chung. **[ST] chuyển trạng thái không hợp lệ:** mở dialog → test gán thêm một app chỉ vào danh mục đó qua API → bấm xoá → 409 → dialog tải lại, có thêm app mới, lựa chọn cũ còn giữ, nút xoá disabled tới khi chọn cho app mới. Danh mục bị xoá ở tab khác → sửa nó → 404 + bảng làm mới. Double-click "Tạo" → chỉ 1 danh mục được tạo. Danh mục cuối cùng còn app (3d): stub `delete-impact` + list → hiển thị thông báo chặn. Dọn dẹp trong `afterAll`. | A only |
| 12 | Accessibility | Nút ↑/↓/sửa/xoá có `aria-label` chứa tên danh mục; sau khi move, focus vẫn ở nút vừa bấm. Sheet: focus vào ô English khi mở, Esc đóng, focus trả về nút đã mở. AlertDialog: focus vào nút Huỷ. Multi-select: `role="combobox"`, chọn bằng Enter, nút bỏ chip có nhãn. `+N` mở bằng bàn phím (Enter/Space), Esc đóng. Bộ đếm `k/N đã có đích` nằm trong vùng `aria-live`. | A+B |

**Bổ sung từ completeness critic** (cùng rubric, gắn vào file ở `plan.md`):

| Row | Scenario | Gate |
| --- | --- | --- |
| 4 | **[EP]** chuẩn hoá: `"  Content  "` → 409; `Content` + zero-width → 409; chỉ NBSP/zero-width → 400 required (DR-11). `🚀` / `!!!` → 400 `noSlug`; `Đa dạng` → `da-dang` (preview client khớp server) (DR-12). **[BVA]** hai tên 100 ký tự cùng slug → cái sau 201, slug ≤ 100 có hậu tố (DR-13). Đổi tên thành `Tools!` → slug `tools-2`, bảng hiện slug server; đổi lại → slug cũ không hậu tố; đổi thành `tools` (khác hoa thường) → 409. Sửa chỉ `name.vi` → không có mũi tên `cũ → mới`. PATCH `{}` / `{ name: {} }` / `{ name: { vi: "   " } }` → 400. DELETE: `appId` của app **không mồ côi** (có 2 danh mục) → 409 và `categoryIds` của app đó không đổi; `appId` không thuộc danh mục / không tồn tại → 409; `categoryId` không phải ObjectId → 400; 501 phần tử → 400; không body khi có mồ côi → 400 `CATEGORY_REASSIGN_REQUIRED`. | A+B (API) / A only (UI) |
| 3 | `GET /apps/categories` và `UserAppDto.categories[]` chỉ có `{ _id, slug, name }` — không lộ `appCount`/`sortOrder`. | A+B |
| 6 | Tạo nhanh khi đã đủ 5 → tuỳ chọn disabled. Tìm `content` (khớp chính xác) → không có tuỳ chọn tạo, chỉ có mục sẵn có. Huỷ tạo nhanh → giữ chuỗi tìm và form. | A+B |
| 7 | `/apps?categoryId=<id đã xoá>` → empty state, không trang lỗi (cả `/favorites`, `/admin/apps`). | A+B |
| 8 | `+N` trong card với `hasTouch`: tap mở popover, **không** mở app, không tạo bản ghi recently-used; tap ngoài đóng (DR-20). `+N` trong header search không chọn kết quả. Tên 100 ký tự: chip/bảng/select cắt ngắn có `title`, trang 375px không cuộn ngang. 5 danh mục ở màn rộng ≤ 2 dòng; thu hẹp viewport → chuyển sang chip + `+N`. | A+B |
| 11 | Bỏ chip chính → chip kế thành Primary, lưu, mở lại vẫn đúng thứ tự. Sửa field khác của app có `[B, A]` → thứ tự giữ `[B, A]`. Bỏ chọn rồi chọn lại → xuống cuối. Double-click xác nhận xoá → 1 DELETE. Hai lần ↑ liên tiếp → nút disabled khi chờ, thứ tự cuối xác định (DR-15); hai move đồng thời qua API → không 500, `sortOrder` không trùng. Hai POST cùng tên đồng thời → một 201 một 409; cùng slug khác tên → cả hai 201, một có `-2` (DR-16). Đích bị xoá ở tab khác → 400 → dialog bỏ đích đó + toast (DR-18). App form giữ chip của danh mục vừa bị xoá → lỗi trên field. Move ở biên khi tab khác đã đổi → UI hiện danh sách server. Mở xoá A (có override) → đóng → mở xoá B → state sạch. | A only |
| Cache | Tạo/đổi tên/xoá ở `/admin/categories` rồi điều hướng client-side (không reload) sang `/admin/apps`, `/apps`, `/favorites`, `/recently-used` → bộ lọc và chip đã cập nhật. Sau khi mồ côi được chuyển: chip ở favorites/recently-used hiện danh mục mới, lọc theo danh mục mới có app đó. | A only |
| 10 | 429 từ rate limit mutation → toast dịch, sheet giữ giá trị (stub `page.route`). | A+B |
| 9 | Ở `/vi`, slug preview lấy từ ô English; nhãn "(chung)"/"(shared)", lỗi `REASSIGN_INVALID`, 429 dịch đủ hai locale. | A+B |

**N/A có lý do:** Back trình duyệt khi dialog mở — dialog/sheet không gắn vào history, Back rời trang như mọi trang
admin khác, không có state cần giữ. Phiên hết hạn giữa chừng — luồng refresh token dùng chung `libs/axios.ts`, đã có
test riêng, feature này không thêm gì. Hiệu ứng migration (tên vi của 4 slug cũ, idempotent, pre-check trùng) — DB E2E
seed theo shape mới; chỉ kiểm bằng Jest + chạy tay trên bản seed `main` (xem `plan.md`).

**Mốc seed cần biết:** Team Calendar là app **inactive** — có trong `appCount` (`productivity = 2`) và trong
dialog xoá, nhưng không hiện ở `/apps` → ưu tiên mượn nó làm app mồ côi. Kiểm tra số đếm `1/2/1/2` **trước** mọi
mutation trong file. Dọn dẹp dùng `try/finally` từng bước, retry khi 429/5xx.

**Spec hiện có cần reconcile:**
- `web-app-user-list/categories-public-ssr` — shape mới `{ _id, slug, name: { en, vi } }`.
- `favorite-apps/favorites-page`, `recently-used`, `header-search`, `home` — chip đọc từ `categories[]`.
- `admin-apps/edit-apps`, `admin-apps/frontend-cleanup/copy-secret` — form gửi `categoryIds`.
- `admin-authz` — thêm `/admin/categories` vào danh sách route và API bị chặn.

## 7. Tài liệu

- `docs/project-goals.md`: đánh dấu xong "Loại bỏ Categories hardcoded" (MVP-4).
- `docs/unfinished-features.md`: cập nhật mục Apps / Admin apps.
- `docs/erd.md`: `WEB_APP_CATEGORY` (slug, name.en/vi), `WEB_APP.categoryIds`.
- README `## Features`: một bullet về quản lý danh mục.

## 8. Ngoài phạm vi

Icon danh mục · kéo thả · danh mục lồng nhau · nhập slug tay · soft delete · trang public duyệt theo danh mục.
