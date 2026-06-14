# Design — User Favorite Apps

> Feature: `favorite-apps` · Branch: `feat/favorite-apps` · Repos: `server/`, `client/`, `docs/`
> Status: brainstorming output (chờ user review → `writing-plans`)

## 1. Bối cảnh & vấn đề

Dự án (IDMS launcher portal) đã có data field `entitlement.isFavorite` + index trong model/ERD, nhưng **chưa có API favorite** (`POST/DELETE /users/me/favorites/:appId` — project-goals §6.1 status ❌). Hiện trạng:

- BE module `entitlement` là **stub** (chỉ `constants/` + `types/`), không có controller/routes/service.
- `/apps` (`listUserApps`) là **catalog lọc theo role**, KHÔNG gate theo entitlement → user thấy nhiều app **chưa có bản ghi entitlement** nào.
- FE: trang `Favorites` dùng **mock** (`@/mocks/Favorites` — có `rating`/`reviews`/`category` không tồn tại trong model thật), tim chỉ là local state. `Apps/AppCard` **chưa có nút tim** (chỉ "Open"). `Home` (QuickAccess + Recommended) dùng **API thật** (`useHomeApps` → `getApps`). `RecentlyUsed` dùng **mock** hoàn toàn (chưa có recent-apps API).

**Mục tiêu:** Cho user đánh dấu yêu thích app & hiển thị/đồng bộ trạng thái yêu thích trên mọi trang render app dành cho user (trừ trang admin).

## 2. Quyết định đã chốt (Decision Records)

| # | Quyết định | Lý do |
|---|---|---|
| DR-1 | **Tách collection `user_favorites` riêng** (KHÔNG dùng `entitlement.isFavorite`) | Catalog không gate entitlement → favorite app chưa-được-grant sẽ buộc tạo entitlement với `grantedBy` (nghĩa "admin cấp") sai ngữ nghĩa. Collection riêng cho ngữ nghĩa sạch, không đụng grant. **Lệch quyết định "1-collection" của ERD** → cập nhật ERD (mục 3.5). |
| DR-2 | **Mỗi list endpoint trả kèm `isFavorite`** (sửa `/apps` annotate, không fetch Set riêng) | User chọn. `/apps` annotate `isFavorite` per item; Home dùng chung `/apps` nên có sẵn. |
| DR-3 | **Favorites page giữ search + category filter + sort; bỏ rating/reviews** | `rating/reviews` không có trong model thật. Card đồng bộ kiểu `AppCard` (Open + tim). |
| DR-4 | **Phạm vi 3 trang: Apps catalog, Home, Favorites. Recently Used DEFER** | RecentlyUsed 100% mock, chưa có recent-apps API → gắn tim sẽ không persist. Defer tới khi có feature recent-apps riêng. |
| DR-5 | **Xóa dead code** sau khi wire API thật | `@/mocks/Favorites`, `FavoriteAppCard` cũ (rating/reviews), i18n key rating/reviews mồ côi. |
| DR-6 | **Extract `AppCard` ra `src/components/AppCard`** dùng chung cho Apps + Favorites | DRY: 1 card (icon + tên + category + description + Open + `FavoriteButton`) dùng cả 2 trang. Nâng từ `views/Apps/components/AppCard` lên `src/components/` (rule `views.md`: component dùng chung giữa views → `src/components/`). |
| DR-7 | **Dựng Pencil mock cho Favorites page TRƯỚC khi code** (step 1.5) | Sửa lớn UI Favorites (đổi card, bỏ rating/reviews). Trình screenshot duyệt visual (gate blocking) trước `writing-plans`. |

## 3. Kiến trúc & thay đổi theo side

### 3.1 Backend — model mới `user-favorite.ts`

`server/src/models/user-favorite.ts` (collection `user_favorites`):

| Field | Type | Constraint |
|---|---|---|
| `userId` | ObjectId → `MODEL_NAMES.USER` | required `[true, "User ID is required"]` |
| `webAppId` | ObjectId → `MODEL_NAMES.WEB_APP` | required `[true, "Web app ID is required"]` |
| `createdAt` | Date | `timestamps: { createdAt: true, updatedAt: false }` (append-only — unfavorite = hard delete, không update) |

- Index: `UserFavoriteSchema.index({ userId: 1, webAppId: 1 }, { unique: true })` (chống trùng — POST idempotent) + `UserFavoriteSchema.index({ userId: 1, createdAt: -1 })` (sort recent).
- Virtual `webApp` (ref WEB_APP, justOne) để populate khi list.
- Thêm `USER_FAVORITE: "UserFavorite"` vào `MODEL_NAMES`. Cập nhật `server/.claude/rules/models.md` nếu bảng naming đổi (R8 File Sync).
- `UserFavoriteDocument` khai báo trong `modules/favorite/types/` (R7 models — không khai báo trong file model).

### 3.2 Backend — module mới `server/src/modules/favorite/`

Theo `module-struct`: `favorite.module.ts` · `favorite.controller.ts` · `favorite.routes.ts` · `favorite.service.ts` · `favorite.repository.ts` · `dtos/` · `types/`. Mọi route **auth-guarded** (`apps.use(authGuard)` pattern). Mount group `/users/me/favorites` trong `modules.loader.ts`.

| Method | Endpoint | Hành vi | Response |
|---|---|---|---|
| `POST` | `/users/me/favorites/:appId` | Validate `appId` ObjectId (paramsPipe) → guard app **tồn tại + ACTIVE + visible theo role** (USER role thấy app có `requiredRoles` chứa USER); nếu không → `NotFoundError`. Upsert `{userId, webAppId}` (idempotent qua unique index — POST lại không lỗi, không tạo trùng). | `201 Created` (hoặc `200` nếu đã tồn tại) — `CreatedSuccess`/`OkSuccess` |
| `DELETE` | `/users/me/favorites/:appId` | Validate `appId`. Hard delete bản ghi `{userId, webAppId}`. Idempotent — xóa cái chưa từng favorite vẫn `204`. | `204 No Content` — `NoContentSuccess` |
| `GET` | `/users/me/favorites` | List app đã favorite của user. Query: `search?`, `categoryId?`, `sort?` (`recent` default / `name`). Join `web_apps`, **lọc `status=ACTIVE` + role visibility** (app bị deactivate/đổi role → tự ẩn). Trả shape `UserAppDto` + `isFavorite: true`. **Không phân trang** vòng này (favorites cá nhân, số lượng nhỏ; ghi nhận ở §8). | `200` — `{ items: UserAppDto[] }` |

- Cross-module: `POST`/`GET` cần đọc `web_apps` để validate + join → inject `WebAppRepository` (đã có) vào `FavoriteService` qua module factory (đọc xuyên module `@/modules/web-app/...`). Guard "app active + visible" tách thành `guards/app-favoritable.guard.ts` (Tier-2, có `assert(appId, role)`).
- `ERROR_CODES`: thêm `FAVORITE_APP_NOT_FOUND` (nếu chưa reuse được `WEB_APP_NOT_FOUND`). Throw qua `i18nMessage` thunk (`favorite:errors.appNotFound`).
- Validator: `validators/schemas/favorite.ts` — `favoriteAppIdParamSchema` (ObjectId), `listFavoritesQuerySchema` (`search`, `categoryId` ObjectId, `sort` enum). i18n key validation theo `@/i18n/locales`.

### 3.3 Backend — annotate `isFavorite` trên catalog (sửa module `web-app`)

| # | Thay đổi | File |
|---|---|---|
| BE-W1 | Inject `FavoriteRepository` (method read-only `findFavoritedAppIds(userId, appIds: string[]): Promise<Set<string>>`) vào `WebAppService` | `web-app.module.ts` + `modules.loader.ts` |
| BE-W2 | `listUserApps`: sau khi lấy page `docs`, gọi `findFavoritedAppIds(userId, docs.map(_id))` → map `isFavorite` mỗi item (bounded ≤ limit 100, không cần rewrite aggregation) | `web-app.service.ts` |
| BE-W3 | `UserAppDto` thêm `isFavorite: boolean`; `toUserAppDto(doc, isFavorite)` | `modules/web-app/dtos/user-app.dto.ts` |
| BE-W4 | `listUserApps` cần `userId` (hiện chỉ nhận `role`) — controller truyền `req.user` | `web-app.controller.ts` |
| BE-W5 | Swagger/Postman cập nhật `GET /apps` (field `isFavorite`) + 3 endpoint favorites mới (`standard-doc-api`) | `modules/*/swagger` |

> Lưu ý: `/apps` đang `authGuard` (user luôn xác định) → annotate `isFavorite` luôn có `userId`, không cần optional-auth handling.

### 3.4 API Contract (BE DTO ↔ FE type)

```
UserAppDto = { _id, displayName, description: string|null, iconUrl: string|null,
               homeUrl, category: string|null, isFavorite: boolean }   // + isFavorite (mới)
```

| Endpoint | Method | Auth | Query/Param | Response `data` |
|---|---|---|---|---|
| `/apps` | GET | ✅ | `page?,limit?,search?,categoryId?` | `{ items: UserAppDto[], meta }` (item kèm `isFavorite`) |
| `/users/me/favorites` | GET | ✅ | `search?,categoryId?,sort?` | `{ items: UserAppDto[] }` (mọi item `isFavorite:true`) |
| `/users/me/favorites/:appId` | POST | ✅ | `appId` (ObjectId) | `{ }` (201/200) |
| `/users/me/favorites/:appId` | DELETE | ✅ | `appId` (ObjectId) | — (204) |

### 3.5 ERD update (`docs/erd.md`)

- Thêm collection `USER_FAVORITE { _id, user_id FK→USER, web_app_id FK→WEB_APP, created_at }` + composite unique `(user_id, web_app_id)`.
- Thêm quan hệ `USER ||--o{ USER_FAVORITE` và `WEB_APP ||--o{ USER_FAVORITE`.
- Note Decision Record DR-1: favorite tách khỏi `entitlement` (lý do grantedBy semantics + catalog không gate). Cập nhật dòng "ENTITLEMENT gộp 3 concern" → favorite giờ ở collection riêng.

### 3.6 Frontend

| # | Thay đổi | File |
|---|---|---|
| FE-1 | `UserApp` thêm `isFavorite: boolean` | `types/Apps/index.ts` |
| FE-2 | Request `favorites.ts`: `addFavorite(appId)`, `removeFavorite(appId)`, `getFavorites(params)`; `END_POINTS.FAVORITES = "/users/me/favorites"`; `QUERY_KEYS.FAVORITES = "favorites"` | `requests/favorites.ts`, `constants/endpoints.ts`, `constants/queryKeys.ts` |
| FE-3 | Component dùng chung `FavoriteButton` — nút tim (filled khi fav / outline khi chưa), `aria-pressed`, `aria-label` add/remove (nhận label qua props, parent extract i18n), `disabled` khi mutation pending | `components/FavoriteButton/index.tsx` |
| FE-4 | Hook dùng chung `useToggleFavorite` — mutation; **optimistic update** cả cache `APPS` lẫn `FAVORITES`; rollback + `toast.error` khi lỗi; `useAnnounce` (added/removed); per-call `onSuccess` cho side effect UI | `hooks/useToggleFavorite.ts` (shared — dùng ở 3 view) |
| FE-5 | **Extract `AppCard` → `src/components/AppCard`** (DR-6); thêm `FavoriteButton`, nhận `isFavorite` + `onToggle`. Cập nhật import ở `views/Apps`; xóa `views/Apps/components/AppCard` cũ | `components/AppCard/index.tsx`, `views/Apps/mains/AppsBoard` |
| FE-6 | Home `QuickAccessCard` + `RecommendedAppCard`: thêm `FavoriteButton`, truyền `_id` + `isFavorite` (data từ `useHomeApps`) | `views/Home/components/*` |
| FE-7 | Favorites page: bỏ mock; hook `useFavorites` (GET, query key `FAVORITES`) + `useToggleFavorite`; giữ search + **category filter (category thật từ `getAppCategories`)** + sort (recent/name); bỏ rating/reviews; **dùng `src/components/AppCard`** (Open + tim); bấm tim = bỏ fav → optimistic remove khỏi list | `views/Favorites/**` |
| FE-8 | **Dead code**: xóa `mocks/Favorites.ts`, `views/Favorites/components/FavoriteAppCard` (thay bằng card mới), gỡ i18n key rating/reviews mồ côi; reconcile `favorites.json` en+vi | (xóa/sửa) |
| FE-9 | i18n en+vi: `favorites.button.add/remove`, `favorites.announce.added/removed`, `favorites.toast.addSuccess/removeSuccess/error`, sort labels (recent/name), reconcile key cũ | `locales/{en,vi}/favorites.json`, `apps.json`, `home.json` |

> `useToggleFavorite` là hook **cross-view** (3 view dùng) → đặt ở `src/hooks/` (KHÔNG vào barrel view-local). Optimistic: cập nhật mọi cache `[APPS, *]` (set `isFavorite`) + `[FAVORITES, *]` (thêm/bớt item). Rule `ghosts.md`: nếu cần `useEffect` thì để ở `ghosts/` — nhưng toggle là click handler (không phải effect on mount) ⇒ đúng [[feedback_no_mutation_in_effect]].

## 4. Error handling

- BE: `appId` sai pattern → 400. App không tồn tại/inactive/ngoài role → 404 (`favorite:errors.appNotFound`). POST trùng → idempotent (unique index, không 500). GET `sort` invalid → 400 hoặc default `recent`.
- FE: toggle 5xx → rollback optimistic + `toast.error` + announce lỗi. `useFavorites` 5xx → error UI (`favorites.error`); retry 5xx ≤ 2 (default). `getAppCategories` lỗi → ẩn pills, list "All" vẫn chạy.

## 5. Đơn vị & ranh giới (isolation)

- BE: module `favorite` độc lập (model + repo + service + guard + routes); chỉ đọc xuyên biên giới `WebAppRepository` (validate/join). `web-app` chỉ nhận thêm 1 read dependency (`FavoriteRepository.findFavoritedAppIds`) — không vòng lặp phụ thuộc (favorite → web-app read; web-app → favorite read; cả 2 read-only, wire ở loader).
- FE: `FavoriteButton` (UI thuần, props) + `useToggleFavorite` (logic mutation) tách biệt, test độc lập. Contract `UserApp.isFavorite` dùng chung 3 view.

## 6. E2E Scenario Matrix

Phạm vi: **Apps catalog** (nút tim) + **Home** (nút tim) + **Favorites page** (list thật + toggle). Áp dụng vì có behavior user mới (toggle yêu thích, đồng bộ trạng thái cross-page). Feature **có mutation** → cột `Gate`: mutation-heavy/idempotency/persistence để `A only` (gate B walk render + 1 toggle trong auth-context riêng, KHÔNG hammer cùng app cùng user → tránh contamination [[reference_e2e_suite_session_contamination]]).

| # | Nhóm | Áp dụng | Scenario + Expected | Gate |
|---|---|---|---|---|
| 1 | Happy path | ✅ | **Apps**: mở `/apps` → mỗi card có nút tim phản ánh `isFavorite` (outline=chưa, filled=đã). Bấm tim outline → filled (POST 201), toast success. **Favorites**: `/favorites` list app đã fav; bấm tim filled → item biến mất khỏi list (DELETE 204, optimistic). **Home**: QuickAccess/Recommended card tim đúng `isFavorite`. | A+B |
| 2 | AuthN | ✅ | Chưa login mở `/apps`,`/favorites` → redirect `/login` (AuthGuard). `POST/DELETE/GET /users/me/favorites` không token → **401**. | A+B |
| 3 | AuthZ | ✅ | **[DT]** `(appExists × appActive × roleVisible)`: `POST` app admin-only (USER không thấy) → **404**; app inactive → 404; app hợp lệ visible → 201. Admin `/admin/apps` **không có** nút tim (excluded). User chỉ favorite app trong catalog của mình. | A only |
| 4 | Validation / expected-error | ✅ | **[EP]** `appId` param: `valid ObjectId tồn-tại+active` → 201 · `malformed "abc"` → 400 · `valid ObjectId không tồn tại` → 404 · `valid nhưng inactive` → 404. **[EP]** GET query `sort`: `recent`·`name` valid → 200; `invalid` → 400/ default recent. `categoryId` malformed → 400. | A only |
| 5 | Empty / null states | ✅ | User chưa fav app nào → `/favorites` **empty state** (`favorites.empty`). Search/category trên favorites không match → empty. App `iconUrl=null` → fallback chữ cái; `description=null` → layout không vỡ. | A+B |
| 6 | Boundary / pagination | ✅ | **[BVA]** favorites count `0`(empty state)·`1`(1 card)·`nhiều`(grid). Không phân trang vòng này → N/A pager (ghi nhận §8). Sort ổn định khi count=1. | A+B |
| 7 | Filter / search | ✅ | **[DT]** Favorites `search × category`: chỉ search match·chỉ category·cả hai (giao)·không match→empty·"All"→bỏ lọc category. Apps: search sẵn có không vỡ khi thêm tim. URL persist filter favorites: **mặc định in-memory** (xem §8). | A+B |
| 8 | Data rendering | ✅ | Tim render theo boolean (filled/outline — KHÔNG raw `true/false`). `category` hiện `displayName` (không id/slug). `iconUrl` qua `CustomImage`, null→chữ cái. Nút Open mở `homeUrl` tab mới (`noopener,noreferrer`). | A+B |
| 9 | **i18n (en + vi)** | ✅ | Render Apps/Home/Favorites **cả en + vi**: `aria-label` add/remove favorite, `announce.added/removed`, toast add/remove/error, `favorites.empty`, sort labels (Recent/Name ↔ Gần đây/Tên), search placeholder. Bắt missing-message (bài học `adminUsers.pagination`). Tên category từ API giữ nguyên. | A+B |
| 10 | Error / loading | ✅ | Toggle POST/DELETE **5xx** → rollback tim về trạng thái cũ + `toast.error` + announce. `GET /users/me/favorites` 5xx → error UI. Loading → skeleton (catalog có `AppCardSkeleton`; Favorites thêm skeleton). | A only |
| 11 | Mutation safety | ✅ | **[ST]** valid: toggle on (POST) → **reload `/apps` giữ `isFavorite=true`** (persist); toggle off (DELETE) → reload giữ outline. **[ST]** invalid/edge: **double-click nhanh** → idempotent (POST 2 lần = 1 row unique index; DELETE 2 lần = 204 không lỗi); favorite rồi **mở lại app ở tab khác** trạng thái nhất quán. **Optimistic + rollback** (nhóm 10). **afterAll revert**: test thêm fav phải xóa fav (và ngược lại) → user state sạch, idempotent. | A only |
| 12 | Accessibility | ✅ | Nút tim `aria-pressed` (true=fav) + `aria-label` "Add {app} to favorites"/"Remove {app} from favorites"; focusable, kích hoạt bằng keyboard (Enter/Space). Toggle → `announce` qua `useAnnounce`. Favorites: item bị remove → **quản lý focus** (chuyển focus về grid/nút kế, không mất focus vào body). | A+B |
| 13 | **Cross-page consistency** (feature-specific) | ✅ | **[ST]** Favorite app X ở `/apps` → sang `/favorites` thấy X (React Query invalidate). Bỏ fav X ở `/favorites` → quay lại `/apps` tim X về outline. Home phản ánh đồng bộ. | A only |

**Artifact E2E (writing-plans expand):**
- `client/e2e/favorite-apps/*.e2e.ts` — toggle catalog, favorites list+remove, empty, filter/search, i18n en+vi, error/loading, a11y, cross-page, idempotency.
- Tài liệu kịch bản: `docs/specs/favorite-apps/e2e.md`.
- **Completeness critic** (nếu user yêu cầu "thorough/đủ"): dispatch 1 subagent tìm case thiếu (double-submit, session expiry giữa toggle, back-button, concurrent tab) trước khi chốt.

## 7. Testing (BE)

- Unit/integration `FavoriteService`: add idempotent (POST 2 lần → 1 row), remove idempotent, list lọc ACTIVE + role + search/category/sort.
- `AppFavoritableGuard.assert`: app inactive/ngoài role → throw 404.
- `WebAppService.listUserApps`: `isFavorite` đúng cho tập app đã/chưa fav.
- Validator `favoriteAppIdParamSchema` / `listFavoritesQuerySchema`.

## 8. Câu hỏi mở / ghi nhận

1. **Phân trang favorites?** Mặc định **không** (list cá nhân nhỏ, trả hết). Nếu cần sau → thêm `page/limit` như `/apps`. → chốt nếu user yêu cầu.
2. **Persist filter favorites vào URL?** Mặc định in-memory (không đổi URL). Deep-link cần `useSearchParams` (`next/navigation`). Đề xuất YAGNI: không persist trừ khi yêu cầu.
3. **Filter favorites server-side hay client-side?** Chọn **server-side** (query `search/categoryId/sort` trên `GET /users/me/favorites`) cho nhất quán với `/apps` và đúng khi list lớn dần.
4. **POST trả 201 hay 200 khi đã favorite?** Idempotent — đề xuất 200 nếu đã tồn tại, 201 nếu tạo mới (hoặc luôn 200/201 nhất quán) → chốt ở writing-plans.

## 9. Bước tiếp theo trong flow

- **Step 1.5 (Pencil mock) — CHỐT: CÓ**: dựng mock `.pen` cho Favorites page (card mới = `src/components/AppCard` + `FavoriteButton`) ở `docs/ui-designs/favorite-apps/` theo design system `.claude/uiux/`, trình screenshot user duyệt visual TRƯỚC khi `writing-plans` (gate blocking).
- `writing-plans` chia task BE/FE/FS + expand E2E matrix.
- Env/schema: feature **không thêm env var**; **thêm collection** `user_favorites` → seeder idempotent nếu cần seed favorite mẫu (`server/src/database/seeders`) + note ảnh hưởng data cũ (không — collection mới, rỗng).

## 10. Isolation / Worktree

3 worktree đã tạo theo §6 trên branch `feat/favorite-apps` tách từ `origin/main` mới nhất:
- `server/.worktrees/favorite-apps`
- `client/.worktrees/favorite-apps`
- `docs/.worktrees/favorite-apps`
