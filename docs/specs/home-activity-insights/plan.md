# Plan — Home Activity Insights

> Design: `design.md` · Mock: `docs/ui-designs/home-activity-insights/` (đã duyệt) · Branch: `feat/home-activity-insights`

Thứ tự thực hiện (mỗi bước xanh `tsc` + lint + test trước khi sang bước sau). BE xong mục 1–5 là FE chạy song song được.

## BE — login-history

1. `constants/`: `LOGIN_HISTORY_STATS` → `{ RANGES: [7, 30, 90], DEFAULT_RANGE_DAYS: 7 }` (DR-4).
   Helper thuần `resolveStatsRange(range, tz)` → `{ from, to, days, tz }`, đặt cạnh service, không trong façade.
2. `validators/schemas/login-history.ts` → `loginHistoryStatsQuerySchema`: `range` enum theo `RANGES`,
   `tz` **whitelist `Intl.supportedValuesOf("timeZone")`** mặc định `UTC` (DR-6). Gắn `queryPipe` vào route `/stats`.
3. `repository/impl/mongo-login-history.repository.ts` — `aggregateMyStats`:
   - chuyển `method: { $ne: SSO }` từ `$match` gốc xuống **từng** facet `total` / `byStatus` / `byMethod` / `byDevice` (DR-8);
     test phải chứng minh 4 con số cũ không đổi
   - `byDay`: `$dateTrunc { date: "$createdAt", unit: "day", timezone: tz }`, đếm `total` + `successful` + `failed` bằng `$cond`
   - `byApp`: `$match { method: SSO, webAppId: { $ne: null } }` → group `{ webAppId, clientName }` → sort desc → limit 5
   - `anomalies`: `$match { isAnomaly: true }` → `$count`
   - mở rộng `LoginStatsAggregationResult` trong `types/`
4. `dtos/my-stats.dto.ts`: fill ngày trống thành `count: 0` (DR-12) — fill ở DTO, **không** ở repository;
   `range` trả thêm `days` + `tz`. Giữ nguyên mọi field cũ.
5. `services/get-my-login-stats.ts`: nhận `{ range, tz }`; cache Redis 60s key `userId + range + tz` (DR-13).

## BE — recent-app

6. `repository/recent-app.repository.ts` + `impl/`: thêm `aggregateStats(userId, limit)` —
   `$match { userId, hiddenAt: null }` → `$facet` `totals` / `topApps` (`$lookup` `web_apps`, lọc theo điều kiện của
   `isAppVisibleTo`) / `byCategory`.
7. `services/stats.ts` + một dòng delegate ở `services/index.ts`; `dtos/stats.dto.ts`; controller;
   route `recentApps.get("/stats", …)` **đặt trước** `/:appId`; `validators/schemas/recent-app.ts` thêm `limit` (default 5, max 10).
8. i18n: key message thành công cho hai endpoint (`req.t`, không literal).
9. Unit test — `login-history/repository/spec` (4 facet cũ giữ nguyên số · `byDay` fill đủ cột · `byApp` chỉ lấy SSO),
   `login-history/services/spec` (default 7 ngày · tz được truyền xuống · cache hit/miss),
   `recent-app/services/spec` (topApps lọc theo visibility · `activeLast7Days` đúng mốc).

## FE

1. `pnpm dlx shadcn@latest add chart` (qua CLI, theo `standard-shadcn`).
   `globals.css`: `--chart-3` ở light mode → `--prussian-500` (DR-15); dark mode giữ nguyên.
2. Constants `END_POINTS.RECENT_APPS_STATS` + `QUERY_KEYS.RECENT_APPS_STATS`; types `LoginHistoryStats` / `RecentAppsStats`;
   `requests/loginHistory.ts` nhận `{ range, tz }`, `requests/recentApps.ts` thêm `getRecentAppsStats`.
3. `hooks/useBrowserTimeZone.ts` — `Intl.DateTimeFormat().resolvedOptions().timeZone`, trả `undefined` tới sau mount
   (tránh hydration mismatch, theo pattern `useFormatTime`).
4. `dataSources/Home/index.ts` — 4 định nghĩa stat card + bản đồ đích điều hướng dạng **data**, không rải trong JSX.
5. `dataSources/LoginHistory` — thêm filter def `deviceType` + locale key. **Không làm bước này thì khối Thiết bị phải bỏ click**:
   `useListQuery` im lặng bỏ qua query param không có trong `filterDefs`.
6. `views/Home/components/` — wrapper quanh `ui/chart` (lớp shadcn bất biến): `ActivityBarChart`, `MethodDonut`,
   `DeviceBars`, `TopAppsBars`. Mỗi chart kèm `role="img"` + `aria-label` và bảng `sr-only` cùng dữ liệu.
   Màu chuỗi theo DR-14: trạng thái dùng `--primary`/`--destructive`, phân loại dùng `--chart-1/3/4/5`.
7. `views/Home/mains/` — `StatsRow` (4 thẻ là `<a>` thật, DR-10), `ActivitySection` (range ở URL `?range=`,
   `placeholderData` giữ dữ liệu cũ khi đổi range, skeleton cao bằng chart thật), `MethodDeviceRow`, `TopAppsSection`.
8. `QuickAccessSection` đổi nguồn sang `GET /users/me/recent-apps`, rỗng thì fallback catalog (DR-11);
   `RecommendedSection` đổi nhãn "Khám phá"; `exploreCTA` dùng `meta.total` + nối nút vào `/apps`.
9. `GreetingSection` — tên từ `getMyProfile()`, ngày format client-side. Gỡ `WEEKLY_DATA`, `MAX_BAR`,
   thẻ Time Saved, thẻ Current Streak, toàn bộ Achievement banner (DR-2).
10. `ghosts/LoginStatsAnnouncer` announce lại khi đổi range.
11. Locale `home.json` en + vi viết lại (gỡ `greeting.date`, `stats.timeSaved`, `stats.currentStreak`,
    `stats.hoursThisMonth`, `stats.personalBest`, `achievement.*`, `weeklyActivity.legend`; thêm `activity.*`,
    `topApps.*`, `range.*`); `loginHistory.json` thêm `filters.deviceType` + nhãn giá trị.
12. Đo bundle trang Home trước/sau bằng `pnpm build` (recharts, §7 design).

## Docs

`docs/adr/0003-charting-library.md` (recharts + DR-14/DR-15) · `docs/design-system/ducker-id/MASTER.md` một dòng ghi nhận
lớp chart · `docs/unfinished-features.md` (mục Home mới; đóng dòng "Weekly Activity vẫn mock" ở §5; tách mục
"lượt mở app theo ngày / streak" cần bảng bucket) · `docs/project-goals.md` bảng endpoint · README `## Features` ·
`e2e.md` (chạy skill `e2e-scenario-coverage` — thay đổi hành vi user quan sát được của feature có UI).
