# Design — Notification Events

> Feature: `notification-events` · Branch: `feat/notification-events` · Worktree: `.worktrees/notification-events`
> Status: brainstorm 05.10.2026. User chốt §2 DR-1…DR-5 trong hội thoại, rồi uỷ quyền làm tới merge
> không qua các cổng duyệt còn lại — các quyết định đánh dấu *(tự chốt)* là do agent quyết thay.
> Mock UI: `docs/ui-designs/notification-events/notification-events.html`.

Feature 1/3 của chuỗi "notification thật": `notification-events` (feature này) → `notification-realtime`
(SSE/WebSocket) → `admin-announcements` (admin gửi `SYSTEM_ANNOUNCEMENT`). Hai feature sau là chu trình
spec/plan/PR riêng.

## 1. Bối cảnh & vấn đề

- Phía **đọc** đã có: `GET /notifications`, `/unread-count`, `PATCH /:id/read`, `/read-all`, model
  `notifications` có index; client có `NotificationPanel` trên header và trang `/notifications`.
- Phía **ghi** không tồn tại: không module nào tạo notification. Mọi bản ghi đến từ
  `server/src/database/seeders/data/notifications.ts`.
- `title` / `message` lưu **chuỗi tiếng Anh cố định** → user `vi` đọc tiếng Anh.
- `login_history.isAnomaly` luôn ghi `false`, `anomalyReasons` luôn `[]` — chưa có phát hiện bất thường.
- UI: item trong panel có `cursor-pointer` nhưng không `onClick`; không mark-read từng cái trong panel;
  panel thiếu loading/empty/error; item đã đọc dùng `opacity-50` (kéo chữ dưới 4.5:1); trang chỉ có tab
  Chưa đọc / Đã đọc; notification không dẫn đi đâu; cảnh báo bảo mật trông như "có app mới".
- `project-goals.md` MVP-4: "Notifications wire vào event thật".

**Mục tiêu:** sự kiện thật trong hệ thống sinh notification cho đúng người, hiển thị song ngữ, bấm vào
là tới đúng chỗ; UI panel + trang được làm lại; badge tự cập nhật bằng polling (realtime là feature 2).

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
| --- | --- | --- |
| DR-1 | **Tách 3 feature**, làm `notification-events` trước | Gộp producer + realtime + broadcast + UI là PR quá lớn để review và E2E. (User chọn) |
| DR-2 | **5 sự kiện**: đổi mật khẩu, admin reset mật khẩu, khoá do sai mật khẩu, app mới được public, đăng nhập bất thường. Admin khoá/mở khoá và `ENTITLEMENT_*` để sau | Entitlement là module stub, không có sự kiện thật. Bị admin khoá thì user không đăng nhập được để đọc. (User chọn) |
| DR-3 | **Ghi qua BullMQ `notification` queue**, mô phỏng `EmailDispatcher` | Lỗi ghi không làm hỏng luồng nghiệp vụ; fan-out không chặn request admin; có retry; feature 2/3 gắn vào worker. (User chọn) |
| DR-4 | **Lưu `type + params + link`, client dịch bằng next-intl** | Đổi ngôn ngữ không cần refetch; sửa câu chữ không cần migrate. (User chọn) |
| DR-5 | **Đăng nhập bất thường** = tổ hợp `browser+os+deviceType` mới **hoặc** `country` mới so với các lần thành công **90 ngày** trước; bỏ qua lần đầu của tài khoản, bỏ qua `country` khi là `LOCAL`/rỗng, bỏ qua SSO | Bắt cả hai kiểu đáng ngờ; dev localhost vẫn kích hoạt được qua thiết bị mới. (User chọn) |
| DR-6 | **UI**: bấm item → mark read + điều hướng `link`; cảnh báo bảo mật có tông riêng + hành động "Không phải tôi?"; sửa UX nền (loading/empty/error trong panel, mark-read từng cái, bỏ `opacity-50`, thêm tab "Tất cả"); lọc theo nhóm trên trang | (User chọn cả 4) |
| DR-7 | *(tự chốt)* **Bỏ hẳn `title`, `message`, `meta`** khỏi schema thay vì để optional | YAGNI: feature 3 sẽ tự thêm nội dung tự do `{ en, vi }` khi cần. Dữ liệu hiện có chỉ là seed → không migration, chạy lại seed. |
| DR-8 | *(tự chốt)* Thêm **`category`** (`security` / `account` / `app` / `system`) tính từ `type` lúc ghi | Lọc + index bằng một field; client không phải giữ bảng map type→nhóm thứ hai. |
| DR-9 | *(tự chốt)* **Writer là cross-cutting service** `src/services/notification/` (giống `email`), không nằm trong module | Queue được tạo ở `loadQueues` **trước** `loadModules`; worker cần writer có sẵn lúc đó. Loader không được với vào `impl/` của module. |
| DR-10 | *(tự chốt)* **`APP_AVAILABLE` gửi một lần cho mỗi app**: khi tạo app ở trạng thái active, hoặc khi update chuyển inactive→active; chặn lặp bằng `webApp.announcedAt` set nguyên tử (`findOneAndUpdate({ _id, announcedAt: null })`) | Bật/tắt app nhiều lần không spam. Sửa một app cũ đang active (không có chuyển trạng thái) không gửi. |
| DR-11 | *(tự chốt)* Người nhận `APP_AVAILABLE` = user active có role thuộc `requiredRoles` của app **∪ `admin`** | Khớp đúng quy tắc hiển thị của `listUserApps` (admin thấy toàn bộ catalog). |
| DR-12 | *(tự chốt)* `link` chỉ là **đường dẫn nội bộ**: bắt đầu bằng `/`, không bắt đầu bằng `//`, không chứa `\`; kiểm tra ở Mongoose và ở client trước khi điều hướng | Chống open redirect nếu sau này có producer đặt link từ dữ liệu ngoài. |
| DR-13 | *(tự chốt)* **Polling**: `unread-count` `refetchInterval` 60s + refetch khi focus cửa sổ; list `staleTime: 0` (refetch khi mở panel / vào trang) | Đủ "thật" cho feature 1; feature 2 thay bằng push. |
| DR-14 | *(tự chốt)* Trang `/notifications`: tab trạng thái **Tất cả / Chưa đọc / Đã đọc** (mặc định Tất cả) + chip nhóm **Tất cả / Bảo mật / Tài khoản / Ứng dụng / Hệ thống**; state giữ local, không đưa lên URL | Trang là infinite list "load more", không thuộc hệ `useListQuery` (bảng + phân trang). |
| DR-15 | *(tự chốt)* Bổ sung **Swagger** cho module `notification` | `CLAUDE.md` ghi module này đang thiếu trong `/api-docs`; feature đổi contract nên làm luôn. |

## 3. Mô hình dữ liệu

### `notifications`

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| `userId` | ObjectId → `users` | required |
| `type` | enum `NOTIFICATION_TYPES` | giữ nguyên 7 giá trị |
| `category` | enum `security \| account \| app \| system` | mới, tính từ `type` |
| `params` | `Record<string, string \| number>` | mới, mặc định `{}` |
| `link` | `string \| null` | mới, DR-12 |
| `isRead` / `readAt` | như cũ | |
| `createdAt` | như cũ | append-only, không `updatedAt` |

Bỏ: `title`, `message`, `meta`. Index thêm `{ userId: 1, category: 1, createdAt: -1 }`.

Bảng `type → category`: `LOGIN_ANOMALY`, `ACCOUNT_LOCKED`, `PASSWORD_CHANGED` → `security`;
`ENTITLEMENT_GRANTED`, `ENTITLEMENT_REVOKED` → `account`; `APP_AVAILABLE` → `app`;
`SYSTEM_ANNOUNCEMENT` → `system`.

### `web_apps`

Thêm `announcedAt: Date | null` (mặc định `null`). Không backfill: app đang active và chưa từng
announce sẽ không bao giờ được announce (không có chuyển trạng thái nào xảy ra) — đúng ý, vì user đã thấy
chúng trong launcher.

### `login_history`

Không đổi schema; bắt đầu ghi thật `isAnomaly` và `anomalyReasons` (`new_device`, `new_country`).

## 4. Sự kiện

| Sự kiện | Nơi phát | `type` | `params` | `link` |
| --- | --- | --- | --- | --- |
| User tự đổi mật khẩu | `ChangePasswordService.changePassword` | `PASSWORD_CHANGED` | `{ actor: "self" }` | `/profile` |
| Admin reset mật khẩu | `user/services/admin-reset-password.ts` | `PASSWORD_CHANGED` | `{ actor: "admin" }` | `/profile` |
| Khoá do sai mật khẩu | `PasswordLoginStrategy.verifyPasswordOrFail`, khi `lockoutSeconds > 0` | `ACCOUNT_LOCKED` | `{ minutes }` | `/login-history` |
| App mới | `web-app/services/create-app.ts`, `update-app.ts` (DR-10) | `APP_AVAILABLE` | `{ appName }` (displayName) | `/apps?search=<displayName>` |
| Đăng nhập bất thường | `login-history/services/record-successful-login.ts` | `LOGIN_ANOMALY` | `{ reason: "device" \| "country" \| "both", browser, os, country }` | `/login-history` |

`ACCOUNT_LOCKED`: lúc bị khoá user không đăng nhập được; notification để họ xem lại sau khi mở khoá
(email cảnh báo vẫn là kênh chính).

**Phát hiện bất thường** (`record-successful-login`, chỉ đường IdP tương tác — `recordAppSignIn` của
SSO không đi qua đây):

1. Dựng dữ liệu bản ghi (parse UA, geoip) như hiện tại.
2. `loginHistoryRepo.findSignInTraits(userId, since = now − 90 ngày)` → `{ hasHistory, devices[], countries[] }`
   từ các lần `status: success`, `source: idp` trong cửa sổ. Lấy **trước** khi ghi bản ghi mới.
3. Helper thuần `assessLoginAnomaly(current, traits)` → `{ isAnomaly, reasons }`:
   không có lịch sử → không bất thường; thiết bị = `${browser}|${os}|${deviceType}` chưa có → `new_device`;
   `country` khác rỗng/`LOCAL` và chưa có → `new_country`.
4. Ghi bản ghi với `isAnomaly` / `anomalyReasons`; nếu bất thường → `notify(LOGIN_ANOMALY)`.
5. Toàn bộ vẫn **không bao giờ throw** (giữ hợp đồng hiện tại của `logLoginAttempt`).

## 5. Kiến trúc server

```
module nghiệp vụ ──notify()/broadcast()──▶ NotificationDispatcher ──addJob──▶ BullMQ "notification"
                                                │ (queue null / add lỗi)              │
                                                └──────── withRetry(deliver) ◀────────┘ worker: NotificationDeliveryService.deliver(job)
```

- `src/types/services/notification.ts` — `NotificationJobData` (union): `{ kind: "user", userId, type, params, link }`
  | `{ kind: "audience", roles, type, params, link }`.
- `src/services/notification/notification.service.ts` — `NotificationDeliveryService.deliver(job)`:
  `user` → `insertOne`; `audience` → duyệt `authentications` active có `roles ∈ roles` theo `_id`
  tăng dần, lô **500**, map sang `users._id`, `insertMany(ordered: false)`. Category tính ở đây.
- `src/services/notification/notification.dispatcher.ts` — `NotificationDispatcher.notify()` /
  `broadcast()`, **không throw**; queue `null` → fallback `withRetry(deliver)` fire-and-forget.
- `src/services/queue/processors/notification.processor.ts` + `queue.module.ts` tạo queue thứ hai,
  Bull Board hiện cả hai. `loadServices()` tạo `notificationDelivery`; `loadAll()` tạo dispatcher và
  truyền vào `loadModules(app, emailDispatcher, notificationDispatcher)`.
- Module nhận dispatcher qua factory: `change-password`, `user` (deps), `login` (strategy password),
  `login-history` (chuyển sang `services/deps.ts` vì có 2 dependency), `web-app` (deps).

**API đọc** (`/api/v1/notifications`): query thêm `category` (Joi `valid(...)`); DTO
`{ id, type, category, params, link, isRead, readAt, createdAt }`. Không endpoint mới. Swagger mới ở
`modules/notification/swagger/`.

## 6. Client

- **Nội dung**: `notifications.types.<TYPE>.{title,body}` (ICU, en + vi) render bằng `params`;
  `country` đổi sang tên bằng `Intl.DisplayNames` theo locale (util thuần). Type không biết → fallback
  `notifications.types.fallback`.
- **`src/components/NotificationItem/`** (dùng chung panel + trang): icon Lucide theo type, nền icon theo
  category (security → destructive tint); **chưa đọc** = keyline brass 2px bên trái + tiêu đề weight 600
  + chấm; **đã đọc** = tiêu đề weight 400, không giảm opacity. Phần thân là `Link` (next-intl) tới `link`
  — click: mark read (nếu chưa đọc) rồi điều hướng. Nút mark-read (icon, `aria-label`) là **anh em** của
  link, không lồng. `LOGIN_ANOMALY` thêm link phụ "Không phải tôi? Đổi mật khẩu" → `/profile`.
- **Panel**: tab Tất cả / Chưa đọc, 8 item gần nhất, loading skeleton / empty / error (nút thử lại),
  mark-all, "Xem tất cả". Bấm item đóng popover.
- **Trang**: `PageHeader` (mark-all), tab trạng thái + chip nhóm, nhóm theo ngày Hôm nay / Hôm qua /
  Trước đó, load more, announce qua `useAnnounce`.
- Hooks: `useNotifications({ isRead, category, limit })`, `useUnreadCount` (polling), `useMarkNotificationRead`
  có `onError` toast (giữ hành vi cũ).

## 7. Lỗi & bảo mật

- Dispatcher/worker lỗi → log, không ảnh hưởng request; job retry 3 lần (backoff mũ), hết lượt vào DLQ log.
- `params` chỉ chứa chuỗi/số do server dựng; client render qua next-intl (escape) — không `dangerouslySetInnerHTML`.
- `link` kiểm tra DR-12 hai đầu. Notification chỉ đọc/sửa theo `userId` của token (đã có).
- Không đưa email/IP vào `params` (chỉ browser, OS, mã quốc gia).

## 8. Kiểm thử

- **Unit (Jest, server)**: delivery (user + audience theo lô, category), dispatcher (queue / fallback /
  không throw), processor, `assessLoginAnomaly` (bảng quyết định), `recordSuccessfulLogin` (ghi cờ +
  notify), change-password / admin-reset / password-lockout phát đúng event, web-app create/update chỉ
  announce khi chuyển trạng thái + `markAnnounced` thắng, list lọc `category`, DTO mới.
- **E2E (Playwright)**: viết lại `e2e/notifications/notifications.e2e.ts` theo shape mới — ma trận ở §9,
  chi tiết ở `e2e.md`. Sự kiện thật được E2E là `LOGIN_ANOMALY` (đăng nhập API với User-Agent chưa
  thấy) vì nó không có tác dụng phụ lên session hay khoá tài khoản.
- `seed` viết lại theo shape mới; `pnpm seed:clear` (xoá rồi seed lại) trước khi chạy E2E. Sửa luôn
  thứ tự `--clear`: notification phải được xoá **trước** user, vì `clearNotifications` tìm theo email.

## 9. E2E Scenario Matrix

Bản chi tiết từng test: `e2e.md`. Gate `A only` = có mutation thật trên seed.

| # | Nhóm | Kịch bản | Gate |
| --- | --- | --- | --- |
| 1 | Happy path | Trang mặc định tab Tất cả, nhóm theo ngày, thời gian tương đối, template seed hiển thị | A+B |
| 2 | AuthN | Chưa đăng nhập vào `/notifications` → màn đăng nhập | A+B |
| 3 | AuthZ | N/A ở FE — mỗi user chỉ đọc/sửa notification của mình, chặn ở BE theo `userId` của token (unit test + `notifications-api`); không có đường UI nào nhắm id người khác | — |
| 4 | Validation | **[EP]** `category`: hợp lệ / `bogus` → 400. **[EP]** `link`: nội bộ → `<a href>`; `https://…` · `//host` · `/\host` → không render anchor | A+B |
| 5 | Empty / null | Danh sách rỗng → empty state; tab Đã đọc rỗng riêng; type lạ → fallback tên type, không crash | A+B |
| 6 | Boundary | **[BVA]** 20 dòng/1 trang → không có "Tải thêm"; 25 dòng → tải trang 2 rồi nút biến mất; panel xin đúng `limit=8` | A+B |
| 7 | Filter | **[DT]** tab × nhóm gộp vào một request (`isRead=false&category=security`); mặc định không gửi cả hai. **[EP]** chip Bảo mật (thật) chỉ còn security, chip Ứng dụng chỉ còn app; tab Đã đọc chỉ còn dòng đã đọc | A+B |
| 8 | Data rendering | **[DT]** `PASSWORD_CHANGED` actor `admin`/`self` ra hai câu khác nhau; `LOGIN_ANOMALY` reason `device`/`both`; mã quốc gia → tên nước; `ACCOUNT_LOCKED` nội suy số phút; không lộ enum/ISO | A+B |
| 9 | i18n | vi: tab, nút, template (`Có ứng dụng mới`, `Có lượt đăng nhập mới…`), `trước`, tên nước `Việt Nam`; không lọt câu tiếng Anh | A+B |
| 10 | Error / loading | List 500 → error state, "Thử lại" refetch thành công; panel lỗi; mark-read lỗi → toast riêng, **không** kèm toast 5xx chung; skeleton khi chờ | A+B |
| 11 | Mutation | **[ST]** mark một dòng → biến khỏi Chưa đọc, unread −1; còn đã đọc sau reload; mở dòng chưa đọc → PATCH + điều hướng; mở dòng đã đọc → **không** PATCH (invalid transition); mark-all (intercept); double-click → 1 PATCH; **sự kiện thật**: đăng nhập từ thiết bị chưa thấy → `LOGIN_ANOMALY` xuất hiện | A only |
| 12 | Accessibility | Enter/Space trên nút mark-read; `article` có tên = tiêu đề; link focus được; chip có `aria-pressed`; announcer cho đổi tab/nhóm/tải thêm | A+B |
| 13 | Panel | Badge = số chưa đọc, ẩn khi 0; panel empty/error; mở item → đóng panel + điều hướng; "Xem tất cả" → `/notifications`; "Không phải bạn?" → `/profile` | A+B |

Không chạy thật `ACCOUNT_LOCKED` (khoá `user@test.com` 30 phút, làm hỏng các suite khác),
`APP_AVAILABLE` và `PASSWORD_CHANGED` (đổi mật khẩu tăng `tokenVersion`, giết session của storageState)
trong E2E — ba sự kiện này có unit test ở server và đã kiểm tay qua API (`e2e.md` §3).

## 10. Ngoài phạm vi

Realtime push, admin broadcast, admin khoá/mở khoá, entitlement, tuỳ chọn tắt từng loại notification,
xoá notification, retention/TTL.
