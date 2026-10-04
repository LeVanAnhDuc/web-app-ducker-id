# Design — Home Activity Insights

> Feature: `home-activity-insights` · Branch: `feat/home-activity-insights` · Worktree: `.worktrees/home-activity-insights`
> Status: draft — chờ user duyệt design, sau đó tới gate mock UI (`docs/ui-designs/home-activity-insights/`).

## 1. Bối cảnh & vấn đề

Home (`/`, `/vi`) là màn hình đầu tiên sau đăng nhập, nhưng phần lớn số liệu là hằng số viết cứng:

| Khối | Nguồn hiện tại | Thật? |
| --- | --- | --- |
| Greeting | `"Anh Duc"` cứng trong JSX; ngày `"Wednesday, May 6, 2026"` cứng trong `locales/*/home.json`; `subtitle count: 3` | ❌ |
| StatCard "Total Apps Used" | `useHomeApps().data.meta.total` — thực ra là **tổng app trong catalog** | ⚠️ thật nhưng sai nhãn |
| StatCard "Apps This Month" / "Time Saved" / "Current Streak" | `"12"` / `"38 hrs"` / `"14 days"` cứng | ❌ |
| `LoginStatsRow` (3 thẻ) | `GET /api/v1/login-history/stats`, range 30 ngày | ✅ |
| Weekly Activity | `WEEKLY_DATA` trong `views/Home/mains/GreetingSection/index.tsx:21`; legend `"30 opens this week"` trong locale | ❌ |
| Achievement banner | Toàn bộ text cứng, nút CTA **không có handler** | ❌ |
| Quick Access | `getApps({ limit: 8 }).slice(0, 4)` — nhãn "Jump back in" nhưng lấy 4 app đầu catalog | ⚠️ sai ngữ nghĩa |
| Recommended | cùng query, `.slice(4, 8)` — không có logic gợi ý nào | ⚠️ sai ngữ nghĩa |
| exploreCTA | `"Over 47 apps"` cứng, nút không handler | ❌ |

Hai vấn đề, không chỉ một:

1. **Số sai nhãn còn tệ hơn số mock** — "Total Apps Used" đang hiển thị tổng catalog.
2. **Không khối nào dẫn đi đâu** — user thấy "Failed: 3" nhưng không click vào xem được 3 lượt đó là gì.

**Mục tiêu:** mọi con số trên Home truy được về dữ liệu thật đang có, có biểu đồ, và mỗi số liệu dẫn thẳng
tới trang chi tiết đã lọc sẵn.

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
| --- | --- | --- |
| DR-1 | **Không tạo collection mới.** Chỉ đọc từ `login_histories` và `user_app_usages` đang có | (User chọn.) Giữ PR gọn, không thêm nợ schema cho một màn hình đọc |
| DR-2 | Chỉ số nào không có nguồn thì **gỡ khỏi UI**, không giữ mock: Time Saved, Current Streak, Achievement banner | (User chọn.) Mock trên màn hình đầu tiên sau đăng nhập làm hỏng niềm tin vào mọi con số còn lại |
| DR-3 | "Weekly Activity = số app mở mỗi ngày" **đổi thành "Hoạt động đăng nhập theo ngày"** | `user_app_usages` giữ một dòng/app, `useCount` cộng dồn all-time → **không có trục thời gian**. `login_histories` có `createdAt` từng dòng → series thật, cùng hình dạng biểu đồ, drill-down tốt hơn |
| DR-4 | **Range mặc định 7 ngày**, toggle `7d` / `30d` / `90d`, chặn trên 90 | (User chọn 7d.) 90 = `LOGIN_HISTORY_CONFIG.RETENTION_DAYS`; xin dài hơn TTL chỉ trả về khoảng rỗng gây hiểu nhầm |
| DR-5 | **Timezone lấy tự động từ trình duyệt**, gửi kèm mỗi request (`?tz=`); BE cắt ngày bằng `$dateTrunc { timezone }` | (User chọn.) Không thêm trường nào vào `models/user.ts`. Mở rộng DR-10 của `recently-used` ("ranh giới ngày phụ thuộc timezone user") — nhưng gộp theo ngày phải làm ở BE, nên tz buộc phải đi lên |
| DR-6 | `tz` validate bằng **whitelist `Intl.supportedValuesOf("timeZone")`**, không bằng regex | Chuỗi này đi thẳng vào toán tử aggregation; chỉ nhận giá trị IANA có thật |
| DR-7 | **Không thêm module mới.** Mở rộng `GET /login-history/stats`, thêm `GET /users/me/recent-apps/stats` | Hai nguồn dữ liệu đã thuộc hai module đã wire sẵn. Module mới phải thêm tay vào `modules.loader.ts` — không đáng cho 2 endpoint đọc |
| DR-8 | Giữ nguyên ngữ nghĩa 4 facet cũ (vẫn loại `method = sso`), nhưng **chuyển điều kiện đó từ `$match` gốc xuống từng facet** | Facet mới `byApp` cần chính các dòng SSO. Chuyển xuống để không một con số nào đang hiển thị bị đổi |
| DR-9 | **Biểu đồ dùng `shadcn/chart` (recharts)** | (User chọn.) `--chart-1..5` **đã có sẵn** ở `client/src/app/[locale]/globals.css:183-213`, map vào Prussian/Brass + biến thể dark → cắm vào là đúng token, không phải tự chế |
| DR-10 | Thẻ/biểu đồ có đích điều hướng thì render bằng `Link` của `@/i18n/navigation`; thẻ không có đích thì **không** cho trông như click được | `LoginStatsRow` đang `router.push` trên `<button>` → mất middle-click, mất ngữ nghĩa link cho screen reader |
| DR-11 | Quick Access đổi nguồn sang `GET /users/me/recent-apps`, rỗng thì fallback catalog | "Jump back in" mà lấy 4 app đầu catalog là sai nghĩa; endpoint đã có sẵn từ `recently-used` |
| DR-12 | **Ngày trống fill ở tầng DTO** (`count: 0`), BE không trả thiếu cột | Chart phải giữ đủ 7/30/90 cột. Cùng tinh thần `totalPages: 0` của PR #21 |
| DR-13 | Cache Redis 60s theo `userId + range + tz` | Cả hai endpoint đều là aggregation, Home là trang được tải lại nhiều nhất |
| DR-14 | **Chuỗi có ngữ nghĩa trạng thái (thành công/thất bại) dùng `--primary` / `--destructive`, không dùng `--chart-*`.** `--chart-1/3/4/5` chỉ dành cho chuỗi phân loại; **bỏ qua `--chart-2`** (brass) trừ khi thật sự cần màu thứ 5 | Đỏ "thất bại" đã có nghĩa cố định khắp app (`LoginStatCard tone="danger"`, cột trạng thái Login History). MASTER.md: brass là signature — "ngoài fill CTA là fill phi trung tính duy nhất; dùng chỗ khác là hết nghĩa". `globals.css` gán `--chart-2: brass-600` đúng chữ nhưng sai tinh thần |
| DR-15 | **`--chart-3` ở light mode phải đổi sang `--prussian-500 #2A5F8F`** | `--prussian-300 #7CA9D8` là màu brand cho **dark mode**; trên nền trắng chỉ ~**2.5:1**, dưới ngưỡng 3:1 của WCAG 1.4.11 cho đồ hoạ phi văn bản. Phương án thay thế (giữ token + viền 1px quanh mỗi lát/thanh) ghi ở mock §1 |

## 3. Backend

### 3.1 Mở rộng `GET /api/v1/login-history/stats`

Endpoint hiện không nhận query nào. Thêm (đều optional → FE cũ không vỡ):

| Param | Kiểu | Mặc định |
| --- | --- | --- |
| `range` | `7d` \| `30d` \| `90d` | `7d` |
| `tz` | IANA timezone (whitelist) | `UTC` |

⚠️ `LOGIN_HISTORY_STATS.DEFAULT_RANGE_DAYS` đang là `30` → đổi thành `{ RANGES: [7, 30, 90], DEFAULT_RANGE_DAYS: 7 }`.
Đây là **thay đổi hành vi** của 3 thẻ đang chạy: con số sẽ nhỏ đi. Nhãn bắt buộc nói rõ khoảng thời gian.

Response — giữ nguyên field cũ (`total`, `successful`, `failed`, `byMethod`, `byDevice`), thêm:

```
byDay:     [{ date: "2026-10-04", total, successful, failed }]   // đã fill ngày trống
byApp:     [{ webAppId, clientName, count }]                     // chỉ dòng method = sso
anomalies: number
range:     { from, to, days, tz }                                // thêm days + tz
```

Aggregation (`repository/impl/mongo-login-history.repository.ts`):

- `$match` gốc: chỉ `userId` + khoảng `createdAt` — **bỏ `method != sso` khỏi đây** (DR-8)
- `total` / `byStatus` / `byMethod` / `byDevice`: mỗi facet mở đầu bằng `{ $match: { method: { $ne: SSO } } }` → số không đổi
- `byDay`: lọc `method != sso` → `$group` theo `$dateTrunc { date: "$createdAt", unit: "day", timezone: tz }`,
  đếm `total` + `successful` + `failed` bằng `$cond` trên `status`
- `byApp`: `$match { method: SSO, webAppId: { $ne: null } }` → `$group` theo `{ webAppId, clientName }` → `$sort count desc` → `$limit 5`
- `anomalies`: `$match { isAnomaly: true }` → `$count`

Index `{ userId: 1, createdAt: -1 }` đã có và phục vụ được `byDay`.

File đụng: `validators/schemas/login-history.ts` (schema mới `loginHistoryStatsQuerySchema`) ·
`login-history.routes.ts` (`queryPipe` cho `/stats`) · `services/get-my-login-stats.ts` ·
`dtos/my-stats.dto.ts` · `constants/` · `repository/login-history.repository.ts` + `impl/` ·
`services/spec/` + `repository/spec/`.

### 3.2 Thêm `GET /api/v1/users/me/recent-apps/stats`

Module `recent-app` đã wire trong `modules.loader.ts`, repo đã sở hữu `user_app_usages` → không cần module mới.

Query: `limit` (số app trong bảng xếp hạng, mặc định 5, max 10).

Response:

```
{ totalApps, activeLast7Days, activeLast30Days,
  topApps:    [{ appId, displayName, iconUrl, category, useCount, lastUsedAt }],
  byCategory: [{ category, count }] }
```

Aggregation: `$match { userId, hiddenAt: null }` → `$facet`:

- `totals` — `$count`, cộng `$cond(lastUsedAt >= now - 7d)` và `30d`
- `topApps` — `$sort { useCount: -1, lastUsedAt: -1 }` → `$limit` → `$lookup` sang `web_apps`,
  lọc theo cùng điều kiện hiển thị mà `isAppVisibleTo` dùng (không rò app user không còn quyền thấy)
- `byCategory` — `$lookup` → `$group` theo `category`

⚠️ `useCount` **cộng dồn từ trước tới nay**, không lọc được theo range → UI bắt buộc ghi nhãn
"tổng từ trước tới nay" và **không** gắn chung toggle 7d/30d/90d.

Index `{ userId: 1, hiddenAt: 1, lastUsedAt: -1, _id: -1 }` đã có.

File đụng: `recent-app.routes.ts` (đặt `/stats` trước `/:appId`) · `recent-app.controller.ts` ·
`services/stats.ts` + `services/index.ts` · `dtos/stats.dto.ts` ·
`repository/recent-app.repository.ts` + `impl/` · `validators/schemas/recent-app.ts` · `services/spec/`.

### 3.3 Swagger

`login-history` và `recent-app` hiện **chưa có** entry trong `libs/swagger/openapi.ts` (đã ghi nhận ở `CLAUDE.md`).
Không mở rộng phạm vi sang backfill; nếu làm thì làm cả module, không thêm lẻ một endpoint → §6.

## 4. Frontend

### 4.1 Data layer

- `requests/loginHistory.ts` — `getMyLoginHistoryStats({ range, tz })`
- `requests/recentApps.ts` — `getRecentAppsStats({ limit })`
- `constants/endpoints.ts` — `RECENT_APPS_STATS: "/users/me/recent-apps/stats"`
- `constants/queryKeys.ts` — `RECENT_APPS_STATS`
- `types/LoginHistory`, `types/RecentApps` — mở rộng
- `hooks/useBrowserTimeZone.ts` (mới) — `Intl.DateTimeFormat().resolvedOptions().timeZone`,
  trả `undefined` cho tới sau mount để tránh hydration mismatch, đúng pattern `FormatTime` / `useFormatTime` đang dùng

### 4.2 UI mới của Home

| # | Khối | Nguồn |
| --- | --- | --- |
| 1 | `GreetingSection` | tên từ `QUERY_KEYS.MY_PROFILE` (`getMyProfile`) thay `"Anh Duc"`; ngày format client-side theo locale thay `home.greeting.date`; subtitle dùng `totalApps` thật |
| 2 | `StatsRow` — 4 thẻ, tất cả thật | Ứng dụng đã dùng · Hoạt động 30 ngày · Đăng nhập thành công (7 ngày) · Đăng nhập thất bại (7 ngày) |
| 3 | `ActivitySection` — **chart chính**, stacked bar | `byDay`, 2 series success/failed, toggle 7d/30d/90d giữ ở URL (`?range=`) để chia sẻ link được |
| 4 | `MethodDonut` + `DeviceBar` | `byMethod` / `byDevice` — **0 dòng BE mới**, dữ liệu đã có sẵn mà UI đang vứt đi |
| 5 | `TopAppsSection` — bar ngang | `topApps` theo `useCount` |
| 6 | `QuickAccessSection` | `GET /users/me/recent-apps` (DR-11) |
| 7 | `RecommendedSection` | giữ catalog, đổi nhãn thành "Khám phá" cho trung thực |
| 8 | `exploreCTA` | `"Over 47 apps"` → `meta.total`; nút wire về `/apps` |

Gỡ hẳn: `WEEKLY_DATA`, `MAX_BAR`, thẻ Time Saved, thẻ Current Streak, toàn bộ Achievement banner.

### 4.3 Bản đồ điều hướng

| Thành phần | Đích |
| --- | --- |
| Ứng dụng đã dùng | `/recently-used` |
| Hoạt động 30 ngày | `/recently-used` |
| Đăng nhập thành công | `/login-history?status=success` |
| Đăng nhập thất bại | `/login-history?status=failed` |
| Cột trong chart chính | `/login-history?fromDate=…&toDate=…` (+ `status` nếu click đúng stack) |
| Lát donut phương thức | `/login-history?method=otp` |
| Thanh thiết bị | `/login-history?deviceType=mobile` |
| Một app trong Top apps | mở app (`useOpenApp`) / `/recently-used` |
| Tổng app catalog | `/apps` |

Deep link chạy được vì `useListQuery` đọc filter từ `searchParams`, **nhưng chỉ với key đã khai trong `filterDefs`**.
`dataSources/LoginHistory` hiện có `app` / `status` / `method` / `dateRange` — **thiếu `deviceType`** (BE đã hỗ trợ sẵn).
Phải thêm filter def + locale key, nếu không `DeviceBar` không có đích click.

Mapping này khai ở `dataSources/Home/` dạng **data**, không nhúng trong JSX.

### 4.4 shadcn chart

- `pnpm dlx shadcn@latest add chart` — theo skill `standard-shadcn`: quản lý qua CLI, không copy tay
- Màu chuỗi theo DR-14 / DR-15; **không** dùng bảng màu mặc định của recharts
- Đổi range không dựng lại khối: giữ dữ liệu cũ bằng `placeholderData`, làm mờ trong lúc fetch —
  biểu đồ nhấp nháy mỗi lần bấm toggle là lỗi cảm nhận rõ nhất của loại UI này
- Skeleton phải cao đúng bằng biểu đồ thật để trang không nhảy khi dữ liệu về
- `components/ui/chart.tsx` thuộc lớp shadcn → **bất biến**; mọi tuỳ biến đi qua wrapper trong `views/Home/components/`
- a11y: recharts render SVG → bọc `role="img"` + `aria-label` tóm tắt, kèm bảng dữ liệu `sr-only` để screen reader
  đọc được từng điểm. Giữ đúng tinh thần `ul/li + aria-label` mà bar chart thủ công hiện tại đang làm đúng
- `ghosts/LoginStatsAnnouncer` mở rộng: announce lại khi đổi range
- Kiểm contrast `--chart-*` ở cả light/dark theo bảng contrast trong MASTER.md

### 4.5 i18n

`locales/{en,vi}/home.json` viết lại gần hết. Gỡ `greeting.date`, `stats.timeSaved`, `stats.currentStreak`,
`stats.hoursThisMonth`, `stats.personalBest`, `achievement.*`, `weeklyActivity.legend`.
Thêm nhóm `activity.*`, `topApps.*`, `range.*`.
`locales/{en,vi}/loginHistory.json`: thêm `filters.deviceType` + nhãn từng giá trị.

## 5. Bảo mật

- Hai endpoint đều sau `authGuard`; userId lấy từ `RequestContext.requireUserId()` — **không** nhận `userId` từ query
- `tz` whitelist (DR-6), `range` enum, `limit` max 10
- Rate limit Redis theo user như các route đọc khác
- `byApp` trả `clientName` snapshot; `topApps` lọc theo điều kiện hiển thị của `isAppVisibleTo`

## 6. Ngoài phạm vi

- **Số lượt mở app theo ngày / streak / "apps this month vs last month"** — cần bảng bucket theo ngày.
  Nâng `docs/unfinished-features.md:134` từ một dòng ghi chú thành mục riêng
- Gamification / achievements — sản phẩm chưa có khái niệm này
- Gợi ý app thật cho `RecommendedSection`
- Backfill Swagger cho `login-history` / `recent-app` / `notification` / `favorite`
- Profile stats (§3 `unfinished-features.md`) — dùng lại được `recent-apps/stats`, để PR sau
- Timezone picker / lưu tz vào hồ sơ user

## 7. Rủi ro / câu hỏi mở

- Đổi range mặc định 30 → 7 làm 3 con số đang hiển thị nhỏ đi. Nhãn phải nói rõ khoảng thời gian,
  nếu không user tưởng mất dữ liệu
- `login_histories` TTL 90 ngày → range `90d` luôn thiếu ở rìa. Nhãn nói rõ "tối đa 90 ngày"
- User đăng nhập một lần rồi sống bằng refresh token → `byDay` rất thưa. Empty state phải giải thích,
  không để chart trống trơn
- `topApps` theo `useCount` all-time có thể bị một app cũ chiếm đỉnh mãi mãi
- Thêm recharts làm tăng bundle trang Home — đo trước/sau bằng `pnpm build`

## 8. Tài liệu cập nhật cùng PR

- `README.md` §Features — một bullet tiếng Anh
- `docs/unfinished-features.md` — mục Home mới; đóng phần "Weekly Activity vẫn mock"
- `docs/adr/0003-charting-library.md` — ADR cho recharts (MASTER.md trước nay chỉ chốt Lucide + Framer Motion)
- `docs/design-system/ducker-id/MASTER.md` — một dòng ghi nhận lớp chart + `--chart-*`
- `docs/specs/home-activity-insights/{plan.md, e2e.md}` — sau khi design được duyệt
