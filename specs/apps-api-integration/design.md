# Design — Tích hợp API Get Apps vào Home + gộp Discover vào Apps

> Feature: `apps-api-integration` · Branch: `feat/apps-api-integration` · Repos: `server/`, `client/`, `docs/`

## 1. Bối cảnh & vấn đề

API `GET /apps` (user-facing, có auth + phân trang + search) đã hoàn chỉnh và **trang Apps đã tiêu thụ thật** qua hook `useApps`. Nhưng 2 trang khác vẫn xài mock:

- **Home** (`views/Home`): `QuickAccessSection` + `RecommendedSection` dùng `QUICK_ACCESS_MOCK` / `RECOMMENDED_APPS_MOCK`; `GreetingSection` dùng stat mock.
- **Discover** (`views/Discover`): `FEATURED_APPS_MOCK` / `MY_APPS_MOCK` + `DISCOVER_CATEGORIES` hardcode; category tabs filter client-side trên mock.

UI mock giàu hơn API thật: mock có `rating`, `featured`, `lastOpened`, lucide `icon` + `gradient`/`iconColor`/`iconBg` — **API không có**. API trả: `_id, displayName, description, iconUrl, homeUrl, category(string|null)` + `meta` phân trang; query nhận `page, limit, search` (chưa có `categoryId`).

## 2. Mục tiêu & phạm vi

Thay mock bằng API thật ở các trang user-facing, đồng thời đơn giản hoá IA: **xoá trang Discover**, dồn chức năng filter-category vào trang Apps.

**Hướng đã chốt:** FE map theo API hiện có (bỏ field trang trí), BE bổ sung tối thiểu (filter `categoryId` + endpoint list categories cho user).

**Trong scope**
- BE: thêm `categoryId` vào user query + endpoint `GET /apps/categories`.
- Apps: thêm panel category pills + filter theo `categoryId`.
- Home: `QuickAccess` + `Recommended` lấy app thật từ `getApps`; stat `totalApps` ← `meta.total`.
- Xoá hoàn toàn Discover (route, view, mock, i18n, nav item).

**Ngoài scope (giữ mock)**
- `GreetingSection`: `appsThisMonth`, `timeSaved`, `currentStreak`, biểu đồ tuần, achievement banner.
- `Favorites`, `RecentlyUsed` và các trang khác.

## 3. Kiến trúc & thay đổi theo side

### 3.1 Backend (`server/`) — module `web-app`

BE đã có sẵn `buildWebAppFilter` (đã hỗ trợ `categoryId`) và `categoryRepo.findAll()`. Chỉ cần mở khoá cho user.

| # | Thay đổi | File | Chi tiết |
|---|---|---|---|
| BE-1 | Thêm `categoryId` vào user query schema | `validators/schemas/web-app.ts` → `listAppsQuerySchema` | `categoryId: Joi.string().pattern(OBJECTID_PATTERN).optional().messages({ "string.pattern.base": "validation:categoryId.invalid" })` — copy y từ `adminListAppsQuerySchema` |
| BE-2 | Thêm `categoryId?` vào type | `modules/web-app/types` → `UserAppsQuery` | `categoryId?: string` |
| BE-3 | Truyền `categoryId` vào filter | `web-app.service.ts` → `listUserApps` | `buildWebAppFilter({ search: query.search, status: "active", categoryId: query.categoryId })` |
| BE-4 | DTO user category | `modules/web-app/dtos/user-category.dto.ts` (mới) | `UserCategoryDto = { _id: string; displayName: string }` + `toUserCategoryDto`. **Không** tái dùng `AdminCategoryDto` (nó đặt `name`=displayName, `slug`=name → gây nhầm) |
| BE-5 | Service method | `web-app.service.ts` → `listUserCategories()` | `const docs = await this.categoryRepo.findAll(); return docs.map(toUserCategoryDto)` — trả **tất cả** categories (quyết định đã chốt) |
| BE-6 | Controller method | `web-app.controller.ts` → `listUserCategories` | `OkSuccess({ data, message: "webApp:success.listCategories" })` (key i18n đã tồn tại) |
| BE-7 | Route | `web-app.routes.ts` → `createUserWebAppRoutes` | `apps.get("/categories", asyncHandler(controller.listUserCategories))` — **đặt TRƯỚC** `apps.get("/")` để tránh nuốt route; chỉ `authGuard` (đã `apps.use(authGuard)`) |
| BE-8 | Swagger/Postman | theo `standard-doc-api` | Cập nhật doc cho `GET /apps` (param `categoryId`) + `GET /apps/categories` |

**Lưu ý route order:** router `apps` đã `use(authGuard)`. Mount `/categories` trước `/` (literal path không xung đột với `/` nên thực tế thứ tự không critical, nhưng đặt trước cho rõ ràng).

**Quyết định categories visibility:** trả tất cả categories. Tab category không có app user truy cập được → grid hiện empty state (đã có sẵn ở Apps). Đơn giản, categories không nhạy cảm.

### 3.2 API Contract (BE DTO ↔ FE type)

| Endpoint | Method | Query | Response `data` |
|---|---|---|---|
| `/apps` | GET (auth) | `page?`, `limit?`, `search?`, **`categoryId?`** | `{ items: UserAppDto[], meta: { total, page, limit, totalPages } }` |
| `/apps/categories` | GET (auth) | — | `{ items: UserCategoryDto[] }` |

`UserAppDto = { _id, displayName, description: string|null, iconUrl: string|null, homeUrl, category: string|null }`
`UserCategoryDto = { _id, displayName }`

### 3.3 Frontend (`client/`) — Apps page (merge target)

| # | Thay đổi | File |
|---|---|---|
| FE-A1 | `categoryId?: string` vào `UserAppsQueryParams`; thêm `UserCategory = { _id, displayName }` + `UserCategoriesResponse` | `types/Apps/index.ts` |
| FE-A2 | `getAppCategories()` request | `requests/apps.ts` (+ `END_POINTS.APP_CATEGORIES = "/apps/categories"` trong `constants/endpoints.ts`) |
| FE-A3 | Hook `useAppCategories` (query key `"appCategories"`) | `views/Apps/hooks/useAppCategories.ts` |
| FE-A4 | `AppsBoard`: state `activeCategoryId: string \| null` (null = "All"); render **panel pills** (port từ `Discover/mains/AppsBrowser` lines 37–61); **thay nút "Filter" chết** bằng panel; truyền `categoryId` vào `useApps`; đổi category → `setPage(1)` + `announce(t("announce.categoryChanged", { category }))` | `views/Apps/mains/AppsBoard/index.tsx` |
| FE-A5 | Pills = `[{ _id: null, label: t("categories.all") }, ...categories]`; active styling như Discover (rounded-full, border-primary khi active); dùng `CustomButton` + `aria-pressed` | `AppsBoard` (hoặc tách `mains/CategoryFilter` nếu `AppsBoard` > 200 lines) |

> Nếu `AppsBoard` vượt 200 lines (rule `views.md`) → tách panel pills thành `views/Apps/mains/CategoryFilter/index.tsx`, nhận `categories`, `activeId`, `onSelect` qua props.

### 3.4 Frontend (`client/`) — Home page

| # | Thay đổi | File |
|---|---|---|
| FE-H1 | Hook `useHomeApps` — `getApps({ limit: 8 })`, query key `"apps"` cùng namespace nhưng params khác (React Query cache riêng) | `views/Home/hooks/useHomeApps.ts` |
| FE-H2 | `QuickAccessSection` → client component: lấy `items[0..3]`; bỏ `lastOpenedText`, hiện `category` (hoặc bỏ dòng phụ); click card → mở `homeUrl` | `views/Home/mains/QuickAccessSection` |
| FE-H3 | `RecommendedSection` → client component: lấy `items[4..7]`; bỏ `rating`; nút Install/Free → **Open** (mở `homeUrl`, `window.open(..., "_blank","noopener,noreferrer")`) | `views/Home/mains/RecommendedSection` |
| FE-H4 | `QuickAccessCard` / `RecommendedAppCard`: đổi props — bỏ `lastOpenedText`/`rating`/`installLabel`/`freeLabel`; icon dùng `iconUrl` qua `CustomImage` (fallback chữ cái đầu như `AppCard`) | `views/Home/components/*` |
| FE-H5 | `GreetingSection`: `totalApps` ← `meta.total` từ `getApps` (reuse `useHomeApps` data); phần còn lại giữ mock | `views/Home/mains/GreetingSection` |
| FE-H6 | Loading skeleton + empty + error state cho mỗi section | `views/Home/mains/*` |

> **Icon:** client `origin/main` đã có commit migrate `<img>` → `next/image` (`CustomImage`). Mọi render icon app (`iconUrl`) **phải dùng `CustomImage`**, fallback chữ cái đầu. Re-verify `AppCard` trong worktree khi implement.

> **Server vs Client:** `QuickAccessSection`/`RecommendedSection` hiện là async server component. Chuyển sang client component để dùng React Query (nhất quán với Apps; auth token ở client store). `useEffect` (nếu cần) phải ở `ghosts/` theo rule.

### 3.5 Xoá Discover

**Xoá file/thư mục**
- `app/[locale]/(private)/(dashboard)/discover/` (toàn bộ)
- `views/Discover/` (toàn bộ: index, mains/PageHeader, mains/HeroSection, mains/AppsBrowser, components/DiscoverAppCard)
- `mocks/Discover/index.ts`
- `locales/en/discover.json`, `locales/vi/discover.json`

**Sửa file**
- `locales/en/index.ts` + `locales/vi/index.ts`: gỡ `import discover` + key `discover` trong messages.
- `constants/routes.ts`: gỡ `DISCOVER: "/discover"`.
- `dataSources/Dashboard/index.ts`: gỡ NavItem `{ key: "discover", ... }` (giữ group key `"discover"` vì group chứa cả Home+Apps); gỡ `"discover"` khỏi `NavKey` union.
- `locales/{en,vi}/dashboard.json`: gỡ `sidebar.nav.discover` (giữ `sidebar.groups.discover` — vẫn là tên group).

**i18n thêm mới (`apps.json` en+vi)**
- `apps.categories.all` + nhãn category (nếu cần label tĩnh; tên category thực lấy từ API `displayName`).
- `apps.announce.categoryChanged` = "Filtered by {category}." / "Đã lọc theo {category}."
- `home.json`: bỏ key mock không dùng (`quickAccess.lastOpened`, `recommended.*` rating/install/free) — reconcile, không để key chết.

## 4. Error handling

- BE: `categoryId` sai pattern → 400 (`validation:categoryId.invalid`) qua `queryPipe`. Category không tồn tại nhưng đúng ObjectId → filter trả 0 app (không lỗi).
- FE: `useApps`/`useAppCategories` lỗi 5xx → error UI (`apps.error`); React Query retry 5xx tối đa 2 lần (default project). Categories lỗi → ẩn pills, vẫn hiện grid "All".
- Home sections: lỗi → message lỗi; rỗng → empty state.

## 5. Đơn vị & ranh giới (isolation)

- BE thay đổi gói trong module `web-app` (route/controller/service/dto/validator) — không chạm module khác.
- FE: `requests/apps` + `types/Apps` là contract dùng chung; mỗi view giữ hook riêng trong `views/<Page>/hooks/`. `CategoryFilter` (nếu tách) nhận data qua props, test độc lập.

## 6. E2E Scenario Matrix

Phạm vi E2E: **trang Apps** (thêm category filter) + **trang Home** (data thật). Trang Discover bị xoá → gỡ e2e Discover nếu tồn tại (`client/e2e/discover/`). Áp dụng vì có behavior user quan sát được mới (filter category, Home hiển thị app thật).

Walk đủ 12 nhóm rubric:

| # | Nhóm | Áp dụng | Scenario + Expected |
|---|---|---|---|
| 1 | Happy path | ✅ | **Apps**: user đăng nhập mở `/apps` → grid app thật từ API render (card có displayName, category, description, nút Open). **Home**: `/home` → QuickAccess (≤4 card) + Recommended (≤4 card) render app thật; stat `totalApps` = tổng số app. |
| 2 | AuthN | ✅ | Truy cập `/apps` (và `/home`) khi chưa đăng nhập → redirect về `/login` (AuthGuard). `GET /apps/categories` không token → 401. |
| 3 | AuthZ | ✅ | User role thường chỉ thấy app `requiredRoles=USER` (đã có ở `listUserApps`). Category filter không làm lộ app ngoài quyền (filter cộng dồn với role scope). |
| 4 | Validation / expected-error | ✅ | `GET /apps?categoryId=not-an-objectid` → 400 `validation:categoryId.invalid`. `?page=abc` → 400 (đã có). FE: chọn pill chỉ gửi `_id` hợp lệ nên client không tạo input sai; test ở tầng API/contract. |
| 5 | Empty / null states | ✅ | Chọn category không có app user thấy được → grid empty state (`apps.empty`). App có `description=null`/`iconUrl=null` → render fallback (mô tả trống không vỡ layout; icon = chữ cái đầu). Home khi user 0 app → QuickAccess/Recommended empty state. |
| 6 | Boundary / pagination | ✅ | Apps: trang 1, trang cuối, `page` vượt range → grid rỗng + pager hợp lý. Đổi category → reset về page 1. `limit` mặc định 12. Home `limit:8` cố định (không pager). |
| 7 | Filter / search | ✅ | Apps: chọn category → grid lọc đúng; "All" → bỏ lọc. Kết hợp search + category. **Câu hỏi mở (xem §8):** filter có persist vào URL query không — nếu có thì test reload giữ filter; mặc định state in-memory (không persist) → test chỉ trong-phiên. |
| 8 | Data rendering | ✅ | `category` hiện `displayName` (không phải id/slug). `iconUrl` render ảnh qua `CustomImage`; null → chữ cái đầu. Nút "Open" mở `homeUrl` tab mới (`target=_blank rel=noopener`). |
| 9 | **i18n (en + vi)** | ✅ | Render Apps + Home ở **cả en và vi**: nhãn pill "All"/"Tất cả", `announce.categoryChanged`, empty/error, nút Open/Mở, tiêu đề section. Bắt missing-message (bài học `adminUsers.pagination`). Tên category từ API giữ nguyên (không dịch). |
| 10 | Error / loading | ✅ | `GET /apps` 5xx → error UI Apps. `GET /apps/categories` 5xx → ẩn pills, grid "All" vẫn chạy. Loading → skeleton (Apps đã có `AppCardSkeleton`; Home thêm skeleton). |
| 11 | Mutation safety | N/A | Feature read-only (chỉ GET). Không mutation, không state ghi → không cần revert. |
| 12 | Accessibility | ✅ | Pills dùng `CustomButton` + `role="group"` + `aria-pressed`; đổi category `announce` qua `useAnnounce`. Keyboard tab qua pills. Card icon `alt=""` (decorative) + tên app là text. Pager đã có `aria-label`. |

**Artifact E2E (writing-plans sẽ expand):**
- `client/e2e/apps/*.e2e.ts` — category filter, search+filter, empty, i18n en+vi, error/loading, a11y.
- `client/e2e/home/*.e2e.ts` — render app thật, totalApps, empty, i18n en+vi.
- Tài liệu kịch bản: `docs/specs/apps-api-integration/e2e.md`.

## 7. Testing (BE)

- Unit/integration cho `listUserApps` với `categoryId` (lọc đúng, kết hợp role scope + search).
- `listUserCategories` trả tất cả categories, đúng DTO shape.
- Validator `listAppsQuerySchema` chấp nhận/ từ chối `categoryId`.

## 8. Câu hỏi mở / quyết định ghi nhận

1. **Persist filter vào URL?** Mặc định: state in-memory ở `AppsBoard` (không đổi URL). Nếu muốn deep-link/refresh giữ filter → dùng `useSearchParams` (từ `next/navigation`, không phải i18n). **Đề xuất: không persist (YAGNI)** trừ khi user yêu cầu. → chốt khi writing-plans.
2. **Label group nav** vẫn là "Discover" (group chứa Home+Apps) sau khi gỡ item Discover — giữ nguyên, ít rủi ro. Có thể đổi sau nếu thấy lạ.
3. **Home dùng chung query key `"apps"`** với Apps page (params khác → cache riêng). Chấp nhận; không cần key riêng.

## 9. Isolation / Worktree

3 worktree đã tạo theo §6 trên branch `feat/apps-api-integration` tách từ `origin/main` mới nhất:
- `server/.worktrees/apps-api-integration`
- `client/.worktrees/apps-api-integration`
- `docs/.worktrees/apps-api-integration`
