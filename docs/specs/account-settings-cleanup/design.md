# Design — Account Settings Cleanup (gỡ Active Sessions + trang /security)

> **Status**: Approved (brainstorming)
> **Date**: 2026-06-15
> **Feature branch**: `chore/account-settings-cleanup` (worktree per-repo: `client/`, `docs/`)
> **Scope**: FE-only (`client/src/**`) + spec docs. KHÔNG đụng `server/`.

## 1. Bối cảnh & vấn đề

Yêu cầu ban đầu: làm phần **"Phiên đang hoạt động / Các thiết bị đang đăng nhập"** trong `account-settings`.

Khi rà codebase phát hiện feature này **không khả thi** với backend hiện tại, đồng thời lộ ra khu vực Security/Account-Settings có nhiều mock trùng lặp:

### 1.1. Active Sessions không có nguồn dữ liệu thật

- Có model Mongoose `refresh_tokens` (`server/src/models/refresh-token.ts`: authId, tokenHash, isRevoked, expiresAt, ip) **nhưng không có code nào ghi vào nó** — dead scaffolding.
- Refresh token thực tế là **JWT stateless trong cookie**: `token.controller` đọc `req.cookies.refreshToken`, `RefreshTokenValidGuard` chỉ verify chữ ký (`verifyRefreshToken`), logout chỉ `clearCookie`.
- ⇒ Không có session store phía server, không có khái niệm "phiên đang hoạt động" để liệt kê, không revoke được theo từng thiết bị.
- Dữ liệu thiết bị phong phú (deviceType/os/browser/geo) chỉ được ghi vào `login_histories` (audit log riêng), không gắn với session.

Làm Active Sessions "thật" đòi hỏi xây stateful session store (đụng login 3 strategy, refresh rotation, logout revoke, guard) — **ngoài phạm vi mong muốn**. → **Quyết định: bỏ feature, xoá UI mock.**

### 1.2. Bản đồ trùng lặp (3 trang)

| Trang (route) | Card / Nội dung | Thật / Mock |
| --- | --- | --- |
| `/account-settings` (`views/AccountSettings`) | Đổi mật khẩu | ✅ Thật (`useChangePassword` → API) |
| | Two-Factor (2FA) | ❌ Mock (`useState` toggle) |
| | Phiên đang hoạt động | ❌ Mock, không khả thi |
| | Vùng nguy hiểm (deactivate) | ❌ Mock |
| `/security` (`views/Security`) | Hoạt động đăng nhập gần đây | ❌ Mock — **trùng** `/login-history` |
| | Khóa API | ❌ Mock — **lạc concept** (xem 2.2) |
| | Vùng nguy hiểm (delete) | ❌ Mock — **trùng** |
| `/login-history` (`views/LoginHistory`) | Cả trang (stats + filter + bảng) | ✅ Thật (`getMyLoginHistory` + stats → API) |
| `/profile` (`views/Profile`) | Vùng nguy hiểm | ❌ Mock (giữ nguyên, ngoài scope) |

## 2. Quyết định thiết kế

### 2.1. Xoá hẳn trang `/security`
Cả 3 card đều mock + thừa: Login Activity trùng trang `/login-history` thật; Danger Zone trùng; API Keys lạc concept. Trang không có gì vừa-thật-vừa-độc-nhất → xoá route + view + mock + locale + entry sidebar.

### 2.2. "Khóa API" không hợp ý đồ sản phẩm
IDMS là **Identity Provider + Launcher Portal cho người dùng cuối**. "API key cá nhân" là khái niệm máy-với-máy / developer. Thứ tương đương trong một IdP là `client_id`/`client_secret` của app vệ tinh — thuộc **App Registry do admin quản lý** (`/admin/apps`), không thuộc account settings của end-user. → bỏ.

### 2.3. `/account-settings` chỉ giữ tính năng thật
Bỏ toàn bộ card mock (2FA, Active Sessions, Danger Zone). Còn lại: `PageHeader` + `ChangePasswordCard`. Tránh UI "giả" đánh lừa người dùng tưởng đã hoạt động.

### 2.4. Danger Zone về Profile
`@/components/DangerZoneCard` là presentational dùng chung; sau cleanup **chỉ còn Profile dùng** → theo `components.md` (chỉ ở `src/components/` khi ≥2 page dùng) phải về Profile. **Gộp** presentational vào `views/Profile/mains/DangerZoneCard/index.tsx` (inline markup + giữ `useTranslations("profile.dangerZone")`), xoá folder shared, bỏ lớp wrapper thừa. App vẫn còn 1 Danger Zone (ở Profile).

## 3. Phạm vi thay đổi (inventory chính xác)

### A. Xoá trang `/security`
- `src/app/[locale]/(private)/(settings)/security/` (route folder)
- `src/views/Security/` (toàn bộ: PageHeader, LoginActivityCard + LoginActivityRow, ApiKeysCard + ApiKeyRow, DangerZoneCard)
- `src/mocks/Security/index.ts`
- `src/locales/en/security.json`, `src/locales/vi/security.json`
- `src/locales/en/index.ts` + `vi/index.ts`: gỡ `import security` + đăng ký `security,`
- `src/dataSources/Dashboard/index.ts`: gỡ entry `{ key: "security", icon: Shield, href: ROUTES.SECURITY }`, gỡ `| "security"` khỏi union `SettingsKey`, gỡ import `Shield` nếu không còn dùng
- `src/constants/routes.ts`: gỡ `SECURITY: "/security"`
- `src/locales/en/dashboard.json` + vi: gỡ `sidebar.nav.security`

### B. Dọn `/account-settings`
- `src/views/AccountSettings/index.tsx`: chỉ còn `PageHeader` + `ChangePasswordCard`
- Xoá `src/views/AccountSettings/mains/{TwoFactorCard,ActiveSessionsCard,DangerZoneCard}/`
- Xoá `src/views/AccountSettings/components/SessionRow/`
- Xoá `src/mocks/AccountSettings/index.ts`
- `src/locales/en/accountSettings.json` + vi: gỡ `twoFactor`, `sessions`, `dangerZone`; sửa `description` (bỏ "and sessions" / tương đương vi)

### D. Di chuyển Danger Zone về Profile
- Gộp `src/components/DangerZoneCard/index.tsx` vào `src/views/Profile/mains/DangerZoneCard/index.tsx`
- Xoá `src/components/DangerZoneCard/`

## 4. Ngoài phạm vi (không làm lần này)
- **BE**: dead model `refresh_tokens` + `token/types` liên quan — để lại; ghi follow-up tuỳ chọn dọn sau (KHÔNG đụng để giữ scope FE-only).
- **Profile Danger Zone**: nội dung vẫn mock, behavior không đổi — chỉ đổi nơi đặt component.
- Trang `/billing`, `/team` (có thể cũng mock) — không trong yêu cầu.

## 5. Rủi ro & lưu ý
- Sau khi xoá namespace locale, phải đảm bảo **không còn reference** (`security.*`, `accountSettings.{twoFactor,sessions,dangerZone}.*`) → next-intl missing-message. Chốt bằng `yarn build` + grep.
- Kiểm tra import `Shield` / `Switch` không còn orphan (lint bắt).
- Người dùng đã bookmark `/security` sẽ gặp `not-found` (chấp nhận — trang chưa public).

## 6. E2E Scenario Matrix

Thay đổi observable (mất nav item + route, trang account-settings trimmed) → áp dụng E2E. Phần lớn category N/A vì là xoá/di chuyển, không thêm input/data mới.

| # | Category | Verdict | Scenario / lý do | Gate |
| --- | --- | --- | --- | --- |
| 1 | Happy path | ✅ | `/account-settings` render đúng PageHeader + Change Password (không còn 2FA/Sessions/DangerZone). `/profile` vẫn render Danger Zone (đã move). | A+B |
| 2 | AuthN | ✅ | Chưa đăng nhập vào `/account-settings`, `/profile` → redirect `/login` (regression AuthGuard). | A+B |
| 3 | AuthZ | N/A | Trang user-level, không gating theo role. | — |
| 4 | Validation | N/A | Cleanup không thêm/đổi validation; form change-password không đổi (đã có suite riêng). | — |
| 5 | Empty / null | N/A | Không còn list/fetch trong account-settings sau khi dọn. | — |
| 6 | Boundary / pagination | N/A | Không có pagination. | — |
| 7 | Filter / search | N/A | Không có filter/search. | — |
| 8 | Data rendering | N/A | Không đổi label/format dữ liệu (chỉ còn form). | — |
| 9 | **i18n** | ✅ | Render `/account-settings` + `/profile` Danger Zone + sidebar ở **cả en & vi**; verify không còn missing-message sau khi gỡ namespace `security` + `accountSettings.{twoFactor,sessions,dangerZone}`. | A+B |
| 10 | Error / loading | N/A | Không thêm data fetch mới. | — |
| 11 | Mutation safety | N/A | Cleanup gỡ các mock-mutation; change-password mutation có suite riêng. | — |
| 12 | Accessibility | ✅ | account-settings/profile dùng role/label selector; link "Security" không còn trong tab order sidebar. | A+B |
| F1 | Route removal `[ST]` | ✅ | Vào `/security` và `/vi/security` → `not-found`/404 (invalid transition: route từng hợp lệ nay không còn). | A+B |
| F2 | Nav integrity | ✅ | Sidebar nhóm Settings liệt kê profile, account-settings, billing, team — **không** có security; các link còn lại điều hướng đúng. | A+B |
| F3 | Dead-reference guard | ✅ | Không còn import/string tham chiếu `ROUTES.SECURITY`/`views/Security`/`mocks/Security`/locale `security`/các card đã xoá — chốt bằng `yarn build` (type-check) + grep, không cần E2E. | — |

**Test-design techniques**: EP/BVA/DT không kích hoạt (không có input domain / boundary / điều kiện kết hợp mới). Chỉ ST cho F1 (route removal = invalid transition). Completeness-critic: chưa yêu cầu "thorough/≥90%" → không chạy (có thể bật nếu cần).
