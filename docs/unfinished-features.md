# Tính năng chưa hoàn thiện (UI có, API chưa có)

> Rà soát ngày 2026-07-09. Danh sách các phần đang dùng **mock data** hoặc **có giao diện nhưng chưa nối API thật**. Dùng làm backlog để triển khai từng feature.
>
> Toàn bộ mock data hiện nằm trong `client/src/mocks/` (~427 dòng, 5 file).

## Bảng tổng quan

| #   | Feature                | Mức độ            | FE UI          | FE API wiring                 | BE endpoint               | Ưu tiên    |
| --- | ---------------------- | ----------------- | -------------- | ----------------------------- | ------------------------- | ---------- |
| 1   | AdminEntitlements      | ✅ Xong (05.10.2026) | ✅ Đủ       | ✅ API thật                   | ✅ `/admin/entitlements`  | —          |
| 2   | AdminUsers (mutations) | 🟡 Hybrid         | ✅ Đủ          | ⚠️ List thật, 4 mutation mock | ⚠️ List có, 4 action chưa | Cao        |
| 3   | Profile stats          | 🟡 Hybrid         | ✅ Đủ          | ⚠️ Info thật, stats mock      | ❌ Chưa có stats          | Thấp (nhỏ) |
| 4   | Billing                | 🔴 Mock hoàn toàn | ✅ Đủ          | ❌ Không có request           | ❌ Không có module        | Trung bình |
| 5   | RecentlyUsed           | ✅ Xong (04.10.2026) | ✅ Đủ       | ✅ API thật                   | ✅ `/users/me/recent-apps` | —          |
| 6   | MyContacts             | ⚪ Placeholder    | ⚠️ Empty state | ❌ Chưa có                    | ❌ Chưa có list cho user  | Thấp       |
| 7   | OIDC — phần còn lại    | 🟡 Một phần       | —              | —                             | ⚠️ Core xong, 4 phần thiếu | Trung bình |
| 8   | Home — lượt mở app theo ngày | 🟡 Một phần | ✅ Đủ          | ✅ API thật                   | ⚠️ Cần bảng bucket theo ngày | Thấp       |

---

## 7. 🟡 OIDC — phần còn lại của MVP-1

> Cập nhật 26.09.2026. Core đã xong ở nhánh `feat/oidc-provider` — xem
> `docs/specs/oidc-provider/design.md`.

**Đã có**: `/oauth/authorize` (kèm `prompt=none`), `/oauth/token` (Authorization Code +
PKCE S256), `/oauth/userinfo`, `/.well-known/openid-configuration`,
`/.well-known/jwks.json`, phiên IdP qua cookie `sid` trên Redis, ký RS256 có `kid`.

**Còn thiếu**:

| Phần | Vì sao chưa làm |
| --- | --- |
| Consent screen | Mâu thuẫn chưa phân xử giữa ADR-002 (first-party vẫn phải consent) và yêu cầu "đã đăng nhập thì quay về ngay". Model `oauth_consents` vẫn chưa có route |
| `/oauth/introspect`, `/oauth/revoke` | Chỉ cần khi có endpoint nhạy cảm cần check revoke real-time; app vệ tinh đầu tiên (badminton) chưa có API nào |
| Refresh-token grant | Public client không có chỗ cất refresh token an toàn. Sẽ cần khi có app vệ tinh **có** backend (Match CV, Shorten Link) |
| Back-channel logout | Cần endpoint server phía client để nhận webhook. Badminton tĩnh nên không có. Hiện dựa vào TTL 15 phút của access token |

---

## 1. ✅ AdminEntitlements — Phân quyền app cho user (xong 05.10.2026)

Xong ở nhánh `feat/access-control` — xem `docs/specs/access-control/design.md`. Quyền = mặc định
theo role + override per-user (`allow` / `deny`) do admin đặt ở `/admin/entitlements`; áp ở
`/apps`, favorite, recent, thống kê home và `/oauth/authorize`.

**Còn lại (follow-up)**:

- Notification `ENTITLEMENT_GRANTED` / `ENTITLEMENT_REVOKED` khi admin đổi quyền — chờ
  `feat/notification-events` merge rồi tích hợp (spec §9).
- User đang ở trong app vệ tinh lúc bị revoke vẫn dùng được tới khi access token hết hạn (15 phút) —
  cần `/oauth/revoke` hoặc back-channel logout (mục 7).

---

## 2. 🟡 AdminUsers — Các thao tác quản trị user

**Vị trí FE**: `client/src/views/AdminUsers/`
**Mock**: `client/src/mocks/AdminUsers.ts` (94 dòng, 4 user)

**Trạng thái**: List đã chạy API thật (`getAdminUsers` → `GET /admin/users`). Nhưng 4 mutation vẫn dùng mock:

- `useLockAdminUser.ts` → `lockAdminUser` (mock)
- `useUnlockAdminUser.ts` → `unlockAdminUser` (mock)
- `useForceLogoutAdminUser.ts` → `forceLogoutAdminUser` (mock)
- `useResetAdminUserPassword.ts` → `resetAdminUserPassword` (mock)

**Cần làm**:

- [ ] BE: thêm 4 endpoint vào module user
  - `PATCH /admin/users/:id/lock`
  - `PATCH /admin/users/:id/unlock`
  - `POST /admin/users/:id/force-logout`
  - `POST /admin/users/:id/reset-password`
- [ ] FE: mở rộng `client/src/requests/adminUsers.ts` với 4 hàm mutation
- [ ] FE: thay mock trong 4 hook bằng call thật

---

## 3. 🟡 Profile — Thống kê trên ProfileCard

**Vị trí FE**: `client/src/views/Profile/mains/ProfileCard/index.tsx`
**Mock**: `client/src/mocks/Profile/index.ts` (8 dòng)

**Trạng thái**: Thông tin cá nhân dùng API thật (`GET/PATCH /users/me`). Nhưng 3 badge thống kê hardcode qua `PROFILE_STATS_MOCK`: `appsCount: 12`, `teamsCount: 3`, `planName: "Pro"`.

**Cần làm**:

- [ ] BE: thêm `GET /users/me/stats` (hoặc gộp vào `/users/me`)
- [ ] FE: thêm request + hook, thay `PROFILE_STATS_MOCK` bằng data thật
- [ ] Làm rõ nguồn `teamsCount` / `planName` — hiện dự án chưa có khái niệm team/plan

---

## 4. 🔴 Billing — Thanh toán & hóa đơn

**Vị trí FE**: `client/src/views/Billing/`
**Mock**: `client/src/mocks/Billing/index.ts` (70 dòng)

**UI hiện có** (3 card, đều mock):

- `PaymentMethodCard` — danh sách thẻ (Visa •4242, Mastercard •1956); nút "Add" handler rỗng
- `BillingHistoryCard` — 4 hóa đơn "Pro Plan — Monthly"; nút download không hoạt động
- `UsageCard` — 3 stat (patches/branches/api calls) + progress bar

**Cần làm** (lớn — cần quyết định có tích hợp payment provider không):

- [ ] Quyết định scope: có làm billing thật hay chỉ hiển thị usage?
- [ ] BE: module billing + tích hợp payment provider (Stripe?) nếu làm thật
- [ ] FE: `client/src/requests/billing.ts`, thay toàn bộ mock

---

## 5. ✅ RecentlyUsed — Ứng dụng dùng gần đây (xong 04.10.2026)

Wired tới `GET/DELETE /users/me/recent-apps`, `POST/DELETE /users/me/recent-apps/:appId`,
`POST /users/me/recent-apps/:appId/restore`. Ghi nhận từ mọi nút mở app (`useOpenApp`) và từ `/oauth/authorize`.
Xoá mềm có Undo, cuộn vô hạn, gắn yêu thích. Chi tiết: `docs/specs/recently-used/`.

Biểu đồ Weekly Activity ở Home đã được thay bằng "Hoạt động đăng nhập" dùng dữ liệu thật
(04.10.2026, `docs/specs/home-activity-insights/`). Phần vẫn chưa làm được tách thành mục 8 bên dưới.

---

## 6. ⚪ MyContacts — Danh sách liên hệ của user

**Vị trí FE**: `client/src/views/MyContacts/mains/MyContactsTable/index.tsx`

**Trạng thái**: Chỉ render empty state "No contacts yet" + nút mở SupportDialog để gửi contact mới. Không có bảng, không load data. BE hiện chỉ có `/admin/contacts` (cho admin), chưa có endpoint list contact của chính user.

**Cần làm** (nếu cần):

- [ ] BE: `GET /contacts` hoặc `GET /users/me/contacts` — list contact user đã gửi
- [ ] FE: request + hook + bảng hiển thị

---

## Ghi chú

- Các phần **đã nối API đầy đủ** (không cần làm): Auth (login/signup/logout/token/forgot-password/change-password), `/users/me`, Apps + AdminApps, Danh mục (`/admin/categories`, 04.10.2026), Favorites, Contact submit + AdminContacts, LoginHistory, Notifications (sinh từ sự kiện thật từ 05.10.2026 — `notification-events`) — tương ứng 41 endpoint BE hiện có.
- Khi triển khai từng feature: theo flow chuẩn dự án (worktree per-repo → brainstorming → SuperDesign nếu đổi UI → plan → implement → E2E → review → security → PR). Xem `.claude/CLAUDE.md`.
- Mỗi feature nên có `docs/specs/<feature-name>/design.md` riêng khi bắt đầu.

---

## 8. 🟡 Home — số lượt mở app theo ngày

> Tách ra từ mục 5 ngày 04.10.2026, khi `home-activity-insights` lên.

**Trạng thái**: Mọi con số trên Home đều là dữ liệu thật. Biểu đồ theo ngày đếm **lượt đăng nhập**
(`login_histories`, có `createdAt` từng dòng), không phải **lượt mở app**.

**Vì sao chưa làm được**: `user_app_usages` giữ một dòng / (user, app) với `useCount` cộng dồn
all-time và `lastUsedAt` là mốc cuối — không có trục thời gian. Từ đó ra được bảng xếp hạng app và
số app "còn dùng trong N ngày", nhưng **không** ra được chuỗi theo ngày.

**Cần làm** (cần quyết định về schema trước):

- [ ] Quyết định mô hình lưu: bucket theo ngày (`{ userId, webAppId, day, count }`, upsert `$inc`,
      TTL ~400 ngày) hay event log từng lượt mở. Bucket đủ cho mọi thứ dưới đây trừ phân giải theo giờ
- [ ] BE: ghi thêm ở đúng hai chỗ đang gọi `recentAppRepo.record` (`recordLaunch` + OIDC authorize),
      dùng lại `DEDUPE_WINDOW_MS` để một lượt mở không đếm hai lần
- [ ] BE: bổ sung `byDay` cho `/users/me/recent-apps/stats`
- [ ] FE: thêm chuỗi "lượt mở app" vào biểu đồ Home, và mở lại các chỉ số streak /
      "app tháng này so với tháng trước" đã gỡ khỏi UI

**Ngoài phạm vi đã ghi nhận**: `fromDate` của bộ lọc Lịch sử đăng nhập vẫn cắt theo ngày UTC, nên với
múi giờ lệch UTC thì vài giờ đầu ngày có thể rơi ra ngoài. Cần truyền timezone cho cả endpoint list
mới xử lý triệt để.
