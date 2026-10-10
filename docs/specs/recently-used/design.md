# Design — Recently Used Apps

> Feature: `recently-used` · Branch: `feat/recently-used` · Worktree: `.worktrees/recently-used`
> Status: implemented. User duyệt design và yêu cầu làm thẳng tới merge — bỏ qua gate mock UI (`docs/ui-designs/`).

## 1. Bối cảnh & vấn đề

`/recently-used` là trang cuối cùng của nhóm "My group" còn **100% mock** (`docs/unfinished-features.md` §5):

- `mocks/RecentlyUsed` — 10 app cứng, icon Lucide + màu tự chọn (không phải `iconUrl` thật), thời gian
  là chuỗi tiếng Anh cứng (`"12 minutes ago"`), "Mini Shop" xuất hiện 2 lần (log theo lượt mở).
- Search lọc client-side, không vào URL. **Clear** chỉ set `cleared = true` — reload là quay lại; không confirm.
- Nút **Open không có `onClick`**. Ở mọi trang khác, mở app chỉ là `window.open(homeUrl)` — **không ghi nhận gì**.
- Trang không dùng `PageShell` / `PageHeader` / `PageToolbar` → lệch concept list page (search trái, filter phải).

BE chưa có endpoint. Tín hiệu thật duy nhất hiện có: mỗi lần IdP cấp code cho app vệ tinh,
`loginHistoryService.recordAppSignIn` ghi một dòng `login_histories` (`method = sso`, `webAppId`).
Nhưng đó là **audit log bảo mật** (TTL 90 ngày): không được xoá theo ý user và không thấy click mở
app qua link thường.

**Mục tiêu:** trang Recently Used hiển thị app user thực sự vừa dùng, từ dữ liệu thật, có xoá
(mềm) từng app / toàn bộ, gắn yêu thích, cuộn vô hạn.

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
| --- | --- | --- |
| DR-1 | **Collection riêng `user_app_usages`**, không đọc từ `login_histories` | Audit log không được user xoá; tách ra thì "clear history" là thao tác thật mà không đụng log bảo mật. (User chọn) |
| DR-2 | **Hai nguồn ghi:** (a) FE gọi `POST` khi user bấm mở app ở bất kỳ đâu; (b) BE tự ghi khi OIDC authorize cấp code thành công cho app | (a) bắt được click link thường; (b) bắt được app mở từ bookmark / gõ URL rồi SSO về. (User chọn) |
| DR-3 | **Mỗi app một dòng** — `{ userId, webAppId, lastUsedAt, useCount }`, upsert | List gọn, không trùng; không phải lưu từng lượt mở. (User chọn) |
| DR-4 | **Xoá mềm** — `hiddenAt: Date \| null`; xoá 1 app và clear all đều chỉ set `hiddenAt` | Cho phép **Undo** ngay sau khi xoá 1 app; dòng ẩn tự purge sau 30 ngày bằng TTL. (User chọn) |
| DR-5 | **Mở lại app đã ẩn = hồi sinh dòng**: `hiddenAt = null`, `lastUsedAt = now`, **`useCount` reset về 1** | User đã chủ động xoá lịch sử → đếm lại từ đầu, không lộ con số cũ. |
| DR-6 | **Cuộn vô hạn trên phân trang `page`/`limit` dùng chung** (`resolvePaging` / `toPageMeta` ở `src/common/pagination/`, PR #18), sort `lastUsedAt desc, _id desc` | User yêu cầu dùng chung pattern phân trang vừa merge thay vì cursor riêng. Đánh đổi đã biết: nếu user mở app ở tab khác giữa hai lần tải trang, một dòng có thể bị lặp hoặc lỡ ở trang sau — chấp nhận được với lịch sử cá nhân vài chục dòng. FE lọc trùng theo `_id` khi gộp các trang để không render một app hai lần. (User chọn infinite scroll + pattern chung) |
| DR-7 | **Gắn nút yêu thích trên mỗi dòng** — trả `isFavorite` trong item, dùng lại `useToggleFavorite` | Đồng bộ với Apps / Home / Favorites (DR-4 của `favorite-apps` đã hoãn đúng phần này). (User chọn) |
| DR-8 | **Một hook `useOpenApp` cho mọi chỗ mở app** | 5 chỗ đang tự `window.open` (`AppCard`, `QuickAccessCard`, `RecommendedAppCard`, `HeaderSearch`, trang này). Gom lại để không chỗ nào quên ghi nhận. |
| DR-9 | **Path `/users/me/recent-apps`** (theo `project-goals.md`), không phải `/apps/recently-used` | Cùng họ với `/users/me/favorites` — dữ liệu cá nhân của user, không phải catalog. Sửa `unfinished-features.md` cho khớp. |
| DR-10 | **Nhóm Today / Yesterday / This week / Earlier làm ở FE** từ `lastUsedAt` | Ranh giới ngày phụ thuộc timezone của user; BE trả timestamp thô. |
| DR-11 | **Lệch ERD:** không dùng `entitlements.last_launched_at` | ERD gộp recently-used vào `entitlements`, nhưng catalog `/apps` không gate theo entitlement → user mở app chưa có bản ghi entitlement sẽ buộc tạo entitlement giả. Cùng lý do với DR-FAV (`user_favorites`). Cập nhật `docs/erd.md`: thêm `user_app_usages`, bỏ concern (2) khỏi ENTITLEMENT, thêm DR-RECENT. |

## 3. Backend

### 3.1 Model `server/src/models/user-app-usage.ts` (collection `user_app_usages`)

| Field | Type | Ghi chú |
| --- | --- | --- |
| `userId` | ObjectId → `USER` | required |
| `webAppId` | ObjectId → `WEB_APP` | required |
| `lastUsedAt` | Date | required, set mỗi lần ghi |
| `useCount` | Number | default 1, `$inc` mỗi lần ghi; reset 1 khi hồi sinh (DR-5) |
| `hiddenAt` | Date \| null | default null; set khi xoá mềm |
| `createdAt` | Date | `timestamps: { createdAt: true, updatedAt: false }` |

Index:
- `{ userId: 1, webAppId: 1 }` **unique** — upsert idempotent.
- `{ userId: 1, hiddenAt: 1, lastUsedAt: -1, _id: -1 }` — list + sort.
- `{ hiddenAt: 1 }` với `expireAfterSeconds: 30 ngày` — purge dòng đã ẩn (dòng `hiddenAt: null` không bị TTL đụng).

Thêm `USER_APP_USAGE` vào `MODEL_NAMES`; `UserAppUsageDocument` khai báo ở `modules/recent-app/types/`.

### 3.2 Module `server/src/modules/recent-app/` (layout mới)

`recent-app.module.ts` · `recent-app.routes.ts` · `recent-app.controller.ts` ·
`repository/recent-app.repository.ts` (interface) + `repository/impl/mongo-recent-app.repository.ts` ·
`services/{index,deps,list,record,record-launch,hide,hide-all,restore}.ts` + `services/spec/` · `dtos/` · `types/` ·
`constants/` · `swagger/`. Wire trong `modules.loader.ts` **trước** `oauth` (oauth nhận `recentAppService`).

Mọi route `authGuard`, mount `/api/v1/users/me/recent-apps`:

| Method | Path | Hành vi | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Query `search?` (name / displayName / description), `page?`, `limit?` (default 20, max 100 — `PAGINATION`). Chỉ dòng `hiddenAt: null`; **lọc app ACTIVE + visible theo role** trước khi phân trang (app bị tắt / đổi role tự biến mất, total khớp số dòng hiển thị); annotate `isFavorite`. Sắp `lastUsedAt desc, _id desc`. | `200` `PaginatedResult<RecentAppDto>` = `{ items, meta }` |
| `POST` | `/:appId` | Ghi một lượt mở (upsert theo DR-3 / DR-5). Guard app tồn tại + ACTIVE + visible. Rate limit theo user. | `204` |
| `DELETE` | `/:appId` | Xoá mềm 1 app (`hiddenAt = now`). Idempotent. | `204` |
| `POST` | `/:appId/restore` | Undo: `hiddenAt = null` nếu dòng đang ẩn. | `204` |
| `DELETE` | `/` | Clear all: `updateMany({ userId, hiddenAt: null }, { hiddenAt: now })`. | `204` |

`RecentAppDto` = shape `UserAppDto` (như favorites: `_id, displayName, slug, iconUrl, homeUrl, category, isFavorite`) + `lastUsedAt` + `useCount`.

**Ghi từ OIDC (DR-2b):** trong `oauth/services/authorize.ts`, ngay cạnh
`loginHistoryService.recordAppSignIn(payload)` (nhánh **không** denied), gọi
`recentAppService.record(userId, client._id)` — fire-and-forget, lỗi chỉ log, không làm hỏng luồng authorize.

**Guard "app hợp lệ":** `modules/favorite/guards/app-favoritable.guard.ts` đã kiểm tra đúng điều kiện
(ACTIVE + role USER thấy được). Nâng thành guard dùng chung trong `modules/web-app/guards/` để hai module
cùng dùng, thay vì copy.

Rate limit: thêm `rl.recordRecentAppByUser` (vd. 60 req/phút/user) — POST là thao tác rẻ nhưng do FE tự gọi.

i18n BE: `recentApp:errors.*`, `recentApp:success.*` (en + vi). Swagger: thêm `swagger/` barrel vào `openapi.ts`.

## 4. Frontend

### 4.1 Data layer

- `src/requests/recentApps.ts` — `getRecentApps`, `recordRecentApp`, `hideRecentApp`, `restoreRecentApp`, `clearRecentApps`.
- `CONSTANTS.END_POINTS.RECENT_APPS*`, `CONSTANTS.QUERY_KEYS.RECENT_APPS`.
- `views/RecentlyUsed/hooks/useRecentApps.ts` — `useInfiniteQuery` theo `page` (cùng kiểu `useNotifications`), `getNextPageParam` từ `meta.page < meta.totalPages`, search lấy từ `useListQuery().appliedSearch` (URL là source of truth, debounce sẵn).
- Mutation xoá: **optimistic** — bỏ dòng khỏi cache ngay, toast có nút **Undo** → `restore` + invalidate.
- `src/hooks/useOpenApp.ts` — `window.open(homeUrl, "_blank", "noopener,noreferrer")` **trước** (đồng bộ trong click handler để không bị chặn popup), rồi `recordRecentApp(appId)` nền, lỗi bỏ qua; invalidate `RECENT_APPS`. Thay vào 5 chỗ ở DR-8.

### 4.2 UI

- Khung: `PageShell` → `PageHeader` (title, description, **primary action "Clear history"** — outline destructive, mở `AlertDialog` confirm) → `PageToolbar` (search, **không** filter) → nội dung.
- Nhóm theo ngày (DR-10): header nhóm giữ chấm màu + tên + badge số lượng **đã tải** trong nhóm.
- `RecentAppRow`: icon thật (`CustomImage` từ `iconUrl`, fallback chữ cái đầu như `AppCard`), tên, category,
  "Mở N lần", thời gian tương đối theo locale (`useFormatter().relativeTime`), nút **yêu thích**,
  nút **Open** (`useOpenApp`), nút **xoá khỏi lịch sử** (icon `X`, `aria-label` có tên app).
- Infinite scroll: ghost `LoadMoreTrigger` dùng `IntersectionObserver` gọi `fetchNextPage` khi sentinel lộ ra;
  **kèm nút "Load more"** cho bàn phím / reduced-motion; khi hết dữ liệu hiện "Đã hiển thị tất cả".
- Trạng thái: skeleton lần đầu; empty (chưa dùng app nào → CTA "Browse apps"); empty theo search (→ "Clear search");
  lỗi → `role="alert"`.
- Announce: số kết quả khi search đổi (hook lo), "Đã xoá {app}", "Đã xoá toàn bộ lịch sử", "Đã tải thêm {n}".

Mock UI vẽ ở `docs/ui-designs/recently-used/` sau khi design này được duyệt (gate riêng).

### 4.3 Dọn dẹp

Xoá `mocks/RecentlyUsed`, type `RecentApp` cũ (`icon`/`iconColor`/`iconBg`/`group`/`time`), i18n key mồ côi.

## 5. Ngoài phạm vi

- Biểu đồ **Weekly Activity** ở Home (vẫn mock) — cần lưu từng lượt mở, DR-3 không đủ. Ghi vào backlog.
- Hiển thị "Recently used" trên Home / Quick Access.
- Admin xem usage của user.

## 6. Rủi ro / câu hỏi mở

- **Hai nguồn đếm trùng:** user bấm Open → FE ghi 1; app vệ tinh redirect về authorize → BE ghi thêm 1 →
  `useCount` +2 cho một lần mở. Đề xuất: BE bỏ qua lượt ghi nếu `lastUsedAt` của dòng đó < 60 giây trước
  (dedupe window) — áp cho cả hai nguồn.
- Undo chỉ có cho xoá **từng app**; clear all chỉ có confirm dialog (vẫn xoá mềm, purge sau 30 ngày).

## 7. Tài liệu cập nhật cùng PR

`docs/erd.md` (DR-11), `docs/unfinished-features.md` §5 (đánh dấu xong, sửa path), `docs/project-goals.md` (bảng endpoint Favorites/Recent →
✅), README `## Features` (bullet Recently used), Swagger.
