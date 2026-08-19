# Tính năng chưa hoàn thiện (UI có, API chưa có)

> Rà soát ngày 2026-07-09. Danh sách các phần đang dùng **mock data** hoặc **có giao diện nhưng chưa nối API thật**. Dùng làm backlog để triển khai từng feature.
>
> Toàn bộ mock data hiện nằm trong `client/src/mocks/` (~427 dòng, 5 file).

## Bảng tổng quan

| #   | Feature                | Mức độ            | FE UI          | FE API wiring                 | BE endpoint               | Ưu tiên    |
| --- | ---------------------- | ----------------- | -------------- | ----------------------------- | ------------------------- | ---------- |
| 1   | AdminEntitlements      | 🔴 Mock hoàn toàn | ✅ Đủ          | ❌ 5 hook dùng mock           | ❌ Chỉ có data model      | Cao        |
| 2   | AdminUsers (mutations) | 🟡 Hybrid         | ✅ Đủ          | ⚠️ List thật, 4 mutation mock | ⚠️ List có, 4 action chưa | Cao        |
| 3   | Profile stats          | 🟡 Hybrid         | ✅ Đủ          | ⚠️ Info thật, stats mock      | ❌ Chưa có stats          | Thấp (nhỏ) |
| 4   | Billing                | 🔴 Mock hoàn toàn | ✅ Đủ          | ❌ Không có request           | ❌ Không có module        | Trung bình |
| 5   | RecentlyUsed           | 🔴 Mock hoàn toàn | ✅ Đủ          | ❌ Client-side only           | ❌ Không có endpoint      | Trung bình |
| 6   | MyContacts             | ⚪ Placeholder    | ⚠️ Empty state | ❌ Chưa có                    | ❌ Chưa có list cho user  | Thấp       |

---

## 1. 🔴 AdminEntitlements — Phân quyền app cho user

**Vị trí FE**: `client/src/views/AdminEntitlements/`
**Mock**: `client/src/mocks/AdminEntitlements.ts` (131 dòng, 11 entitlement) + `client/src/mocks/AdminUsers.ts`
**BE**: Module `server/src/modules/entitlement/` **chỉ có** `EntitlementDocument` + `ENTITLEMENT_CONFIG` — KHÔNG có route/controller/service, **chưa wire vào** `src/loaders/modules.loader.ts`.

**UI hiện có**: Bảng ma trận app × user, trạng thái GRANTED / NOT_GRANTED / INSUFFICIENT_ROLE, nút grant/revoke.

**5 hook đang dùng mock**:

- `useAdminUsers.ts` → `@/mocks/AdminUsers`
- `useAdminUserById.ts` → `@/mocks/AdminUsers`
- `useEntitlementsByUser.ts` → `@/mocks/AdminEntitlements`
- `useGrantEntitlement.ts` → `@/mocks/AdminEntitlements`
- `useRevokeEntitlement.ts` → `@/mocks/AdminEntitlements`

**Cần làm**:

- [ ] BE: tạo `entitlement.routes.ts` + controller + service, wire vào modules loader
  - `GET /admin/entitlements` (theo user) — list
  - `POST /admin/entitlements/:userId/:appId` — grant
  - `DELETE /admin/entitlements/:userId/:appId` — revoke
- [ ] FE: tạo `client/src/requests/adminEntitlements.ts`, thêm endpoint vào `constants/endpoints.ts`
- [ ] FE: thay 5 mock hook bằng call API thật
- [ ] Seeder cho entitlement (idempotent)

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

## 5. 🔴 RecentlyUsed — Ứng dụng dùng gần đây

**Vị trí FE**: `client/src/views/RecentlyUsed/mains/HistoryList/index.tsx`
**Mock**: `client/src/mocks/RecentlyUsed/index.ts` (124 dòng, 10 app)

**UI hiện có**: Danh sách app group theo ngày (Today / Yesterday / This Week / Earlier), search + nút clear history. Toàn bộ chạy client-side, reload là mất; clear không persist.

**Cần làm**:

- [ ] BE: cơ chế ghi nhận truy cập app + endpoint
  - `GET /apps/recently-used`
  - `DELETE /apps/recently-used` (clear)
- [ ] FE: `client/src/requests/recentlyUsed.ts` + hook, thay mock + persist clear

---

## 6. ⚪ MyContacts — Danh sách liên hệ của user

**Vị trí FE**: `client/src/views/MyContacts/mains/MyContactsTable/index.tsx`

**Trạng thái**: Chỉ render empty state "No contacts yet" + nút mở SupportDialog để gửi contact mới. Không có bảng, không load data. BE hiện chỉ có `/admin/contacts` (cho admin), chưa có endpoint list contact của chính user.

**Cần làm** (nếu cần):

- [ ] BE: `GET /contacts` hoặc `GET /users/me/contacts` — list contact user đã gửi
- [ ] FE: request + hook + bảng hiển thị

---

## Ghi chú

- Các phần **đã nối API đầy đủ** (không cần làm): Auth (login/signup/logout/token/forgot-password/change-password), `/users/me`, Apps + AdminApps, Favorites, Contact submit + AdminContacts, LoginHistory, Notifications — tương ứng 41 endpoint BE hiện có.
- Khi triển khai từng feature: theo flow chuẩn dự án (worktree per-repo → brainstorming → SuperDesign nếu đổi UI → plan → implement → E2E → review → security → PR). Xem `.claude/CLAUDE.md`.
- Mỗi feature nên có `docs/specs/<feature-name>/design.md` riêng khi bắt đầu.
