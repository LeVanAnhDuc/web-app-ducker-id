# Design — Hybrid SSR cho Apps Catalog (`apps-category-ssr`)

## Bối cảnh & động cơ

Trang Apps (`client/src/views/Apps`) hiện là SPA thuần: mọi data fetch client-side (React Query + `axiosInstance` + access token in-memory). User cân nhắc chuyển sang **Server Component** để: bỏ loading spinner, kiến trúc App Router chuẩn, giảm JS. (SEO đã loại — trang sau đăng nhập, bot không index được.)

### Ràng buộc gốc đã xác định

Access token nằm **in-memory (Zustand)**; refresh token đã ở **httpOnly cookie** (BE set khi login, `login.controller.ts`; refresh đọc `req.cookies?.refreshToken`, `token.controller.ts`). Đây là pattern chuẩn OAuth SPA. Server Component **không** đọc được in-memory token → muốn RSC fetch endpoint có `authGuard` thì buộc migrate access token sang cookie (dự án lớn, đụng lõi auth IdP + CSRF). → **Không đi hướng đó.**

### Phân tích per-endpoint (quyết định hướng)

| Endpoint | Phụ thuộc danh tính? | Kết luận |
|---|---|---|
| `GET /apps/categories` (`listUserCategories`) | **Không** — chỉ `categoryRepo.findAll()`, không đọc `RequestContext` (`web-app.service.ts:113-116`) | Có thể **public** → RSC fetch không cần token |
| `GET /apps` (`listUserApps`) | **Có** — role-scoped visibility (`requiredRoles`, service.ts:75-77) + `isFavorite` per-user (service.ts:87-93) | Giữ **client fetch** |

## Hướng chọn: C — Hybrid (không đụng auth cốt lõi)

- **Category** → public (`optionalAuthGuard`) + fetch trong **Server Component**, render ngay.
- **Apps list** → giữ nguyên client (role filter + favorites + là phần tương tác search/filter/pagination).
- Access token vẫn in-memory, refresh vẫn httpOnly cookie — **không đổi một dòng auth cốt lõi**. Admin category endpoint giữ protected.

## Kiến trúc & data flow

```
apps/page.tsx (Server Component, async)
  └─ getServerAppCategories()  → fetch(`${API_SERVER_URL}/api/v1/apps/categories`)   [no token]
       │  fail → trả null (KHÔNG throw, KHÔNG crash trang)
       ▼
  <Apps categories={categories}>                (prop drilling)
       ▼
  <AppsBoard categories={categories}>           (Client Component)
       ├─ categories != null  → dùng server-rendered prop
       └─ categories == null  → fallback useAppCategories() (client fetch, resilient)
       └─ useApps(params)     → apps list giữ client như cũ
```

**Nguyên tắc:** server fetch là *progressive enhancement*, không phải điểm chết. BE lỗi → degrade về client fetch cũ, trang không bao giờ trắng.

## Quyết định thiết kế (đã user duyệt)

1. **Guard:** dùng `optionalAuthGuard` (đã có sẵn `middlewares/guards/optional-auth.guard.ts`) cho `/apps/categories` — có token thì gắn user context, không token thì cho qua anonymous. KHÔNG xoá hẳn auth (giữ khả năng cá nhân hoá/log theo user về sau).
2. **Fallback:** server fetch category fail → `AppsBoard` fallback `useAppCategories()` (client). Trang không bao giờ trắng.

## Thay đổi Backend (`server/`)

1. **Tách route** (`web-app.routes.ts`): bỏ `apps.use(authGuard)` phủ toàn bộ sub-router; áp `optionalAuthGuard` cho `/categories`, `authGuard` cho `/` (apps list). Theo `module-struct`: stateless guard import trực tiếp.
2. **Rate-limit theo IP** cho `/categories` (giờ public): thêm limiter IP-keyed vào `RateLimiterMiddleware` (KHÔNG key theo user id — anonymous không có), inject qua route factory (stateful middleware).
3. **Cache-Control** `public, max-age=…` cho response category (dữ liệu tham chiếu gần immutable).
4. **Swagger** (`web-app/swagger/paths.ts`): bỏ `security: [{ bearerAuth: [] }]` khỏi `/apps/categories`, sửa mô tả + bỏ 401 bắt buộc (theo `standard-doc-api`).

## Thay đổi Frontend (`client/`)

1. `src/requests/server/apps.ts` — `getServerAppCategories()` dùng **native `fetch`** + `API_SERVER_URL` (KHÔNG dùng `axiosInstance` — client-only), unwrap `ResponsePattern`. Trả `null` khi fail.
2. `app/[locale]/(private)/(dashboard)/apps/page.tsx` — async Server Component: fetch categories, truyền prop xuống `<Apps>`.
3. `views/Apps/index.tsx` + `views/Apps/mains/AppsBoard/index.tsx` — nhận prop `categories`; `AppsBoard` fallback `useAppCategories()` khi prop null (giữ hook).
4. **Không đổi** AdminApps (fetch qua endpoint admin protected riêng — cô lập).

## Env / Schema / Seed

- **Env:** không thêm biến mới — `API_SERVER_URL` đã có (`client/.env.example`). Worktree runner đã có env này.
- **Schema/Seed:** không đổi Mongoose model; seeder category đã idempotent — không thay đổi.

## API contract (BE DTO ↔ FE type)

`UserCategoryDto { _id, slug, displayName }` ↔ FE `UserCategory { _id, slug, displayName }` — **khớp, không drift**.

## Rủi ro & xử lý (từ 3 subagent audit)

| Rủi ro | Xử lý |
|---|---|
| Server fetch category fail | Fallback client (`useAppCategories`) — không trắng trang |
| Public abuse / DoS | Rate-limit IP + Cache-Control; query rẻ (`.lean()`, indexed, ~5–20 doc) |
| Lộ dữ liệu | DTO chỉ `_id/slug/displayName`; KHÔNG lộ clientId/secret/redirectUris/requiredRoles/status → LOW risk |
| CORS | Server→server fetch bỏ qua CORS; browser vẫn theo `CORS_ORIGINS` |
| Enumeration app qua category | Không — biết categoryId vẫn phải auth để gọi `/apps?categoryId=` |
| Chuẩn IdP | Public catalog metadata phù hợp OAuth/OIDC (giống `.well-known`) |

**Verdict security:** LOW risk (báo cáo subagent) với hardening rate-limit + cache.

## Ghi chú E2E — RECONCILE, không rebuild

Feature này **sửa đổi trang Apps đã có** (`specs/web-app-user-list/` + `client/e2e/web-app-user-list/`). E2E của thay đổi này **reconcile vào suite `web-app-user-list`** (ADD case category-SSR + public endpoint + fallback; UPDATE case có expected đổi; giữ matrix ↔ e2e.md ↔ test file đồng bộ) — KHÔNG tạo suite mới, KHÔNG rebuild.

## E2E Scenario Matrix

| # | Category | Scenario / Kỹ thuật | Expected | Gate |
|---|---|---|---|---|
| 1 | Happy path | User + Admin mở `/apps` → filter danh mục render ngay (server-rendered), có options | Category options hiện không cần spinner; giống nhau mọi role | A+B |
| 2 | AuthN | (a) anonymous `GET /apps/categories` trực tiếp → **200** (public mới); (b) chưa login vào page `/apps` → redirect `/login` (AuthGuard giữ nguyên) | (a) 200 + data; (b) redirect login | (a) A only · (b) A+B |
| 3 | AuthZ | Category **không** role-scoped **[DT]** role∈{user,admin} → cùng output | List danh mục độc lập role | A+B |
| 4 | Validation | Category endpoint **không nhận param** → **N/A** (không có input). Apps query validation không đổi (ngoài delta) | — | — |
| 5 | Empty/null | Seed 0 category → server fetch trả `[]` → filter render rỗng graceful | Filter hiện, không option, không lỗi | A+B |
| 6 | Boundary/pagination | Category endpoint trả full list, **không phân trang** → **N/A** | — | — |
| 7 | Filter/search | Chọn category lọc apps; `categoryId` persist URL; combo **[DT]**: none / category-only / search-only / both | Apps list đúng filter; URL giữ param; reload giữ state | A+B |
| 8 | Data rendering | Filter hiển thị `displayName` (human), không `slug`/`_id` | Nhãn người đọc được | A+B |
| 9 | **i18n** | Filter label + render ở **en AND vi**; page server render đúng locale route | Cả 2 locale đúng chữ, không thiếu message | A+B |
| 10 | Error/loading | Category server fetch 5xx → **fallback client** (`useAppCategories`), page vẫn render + apps list chạy | Không trắng trang; degrade mượt | A only (khó mô phỏng ở gate B — note follow-up) |
| 11 | Mutation safety | Feature **read-only** (category không ghi) → **N/A**. Favorites mutation ngoài scope | — | — |
| 12 | A11y | Filter popover: role/label selector, keyboard mở/chọn, focus trả đúng | Điều hướng bàn phím OK | A+B |
| 13 | AuthN cliff | **[M1]** `GET /apps/categories` với token hết hạn/rác → **401** (optionalAuthGuard delegate authGuard khi có header); server fetch gửi **no header** → luôn 200 | Cliff được assert; server fetch KHÔNG đính token | A |
| 14 | Fallback | **[M2]** happy path (server prop có) → client **KHÔNG** fetch lại categories (0 client call, hook `enabled:false`); server null + client fail → filter rỗng graceful | Không double-fetch; both-fail không crash | B |
| 15 | Cache/staleness | **[M3/M8]** response có `Cache-Control: public, max-age=300`; server fetch `next.revalidate` → admin thêm category xuất hiện sau revalidate | Header đúng; contract revalidate rõ | A |
| 16 | i18n (tách) | **[M6]** filter group label i18n en/vi; category name qua slug→`common.categories.<slug>`; slug KHÔNG có key → fallback `displayName` cả 2 locale | Label vs name đúng cơ chế; fallback branch phủ | A+B |
| 17 | Rate-limit | **[M7]** hammer /categories 1 IP quá ngưỡng → **429**; fallback KHÔNG retry (4xx no-retry) → không bão request | 429 đúng; fallback không amplify | A |
| 18 | Routing | **[M9]** deep-link `/vi/apps?categoryId=<id>` cold SSR → filter pre-select + options có; back/forward giữ state; `categoryId` rác → apps query xử lý (không crash) — sửa row 4: apps query CÓ nhận categoryId | Deep-link + history OK | B (+A malformed) |
| 19 | Infra | **[M11]** fallback client gọi **same-origin** `/api/v1/apps/categories` (qua rewrite), không cross-origin API host | Không CORS error | B |
| 20 | Regression pin | **[M12]** anon == user == admin trả **byte-identical** category array (pin `listUserCategories` không đọc RequestContext) | Pin identity-independence | A |

**Completeness critic:** ✅ đã chạy (subagent adversarial) — 12 gap M1–M12 đã fold vào rows 13–20 + note row 4/18. M1 (token cliff), M3/M8 (cache staleness), M6 (label vs name localization) là các gap dễ thành bug thật nhất.
