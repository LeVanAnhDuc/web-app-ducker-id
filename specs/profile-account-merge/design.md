# Design — Gom Hồ sơ & Cài đặt tài khoản (`profile-account-merge`)

> **Status**: Approved (brainstorming)
> **Date**: 2026-06-29
> **Feature branch**: `feat/profile-account-merge` (worktree per-repo: `client/`, `docs/`)
> **Scope**: FE-only (`client/src/**`) + spec docs + reconcile E2E. KHÔNG đụng `server/`.

## 1. Bối cảnh & vấn đề

Sau feature `account-settings-cleanup`, khu Settings còn 2 trang riêng nhưng phân mảnh:

| Trang (route) | View | Nội dung | Thật / Mock |
| --- | --- | --- | --- |
| `/profile` | `views/Profile` | ProfileCard, PersonalInfoCard, ConnectedAccountsCard, NotificationPreferencesCard, DangerZoneCard | PersonalInfo: ✅ form; còn lại mock |
| `/account-settings` | `views/AccountSettings` | PageHeader + **ChangePasswordCard** | ✅ Thật (`useChangePassword` → API) |

Hai trang cùng nằm trong route group `(settings)` + `DashboardLayout`, là 2 mục sidebar riêng trong nhóm "settings". `/account-settings` sau cleanup chỉ còn đúng 1 card (đổi mật khẩu) → một trang riêng cho 1 card là thừa điều hướng. Người dùng phải nhảy giữa 2 trang để quản lý cùng một thứ ("tài khoản của tôi").

→ **Quyết định: gom 2 trang thành 1 trang cuộn dọc tại `/profile`, đổi danh tính trang thành "Tài khoản / Account".**

## 2. Quyết định thiết kế

### 2.1. Một trang cuộn dọc tại `/profile`
Gộp `ChangePasswordCard` vào trang `/profile` theo bố cục cuộn dọc (không tab). Thứ tự card:

```
ProfileCard → PersonalInfoCard → ConnectedAccountsCard
→ NotificationPreferencesCard → ChangePasswordCard → DangerZoneCard
```

ChangePasswordCard đặt **ngay trước DangerZoneCard**: nhóm hành động bảo mật (đổi mật khẩu) liền kề vùng hành động nguy hiểm, kết thúc trang bằng các thao tác "nặng".

### 2.2. Xoá hẳn `/account-settings` (→ 404)
Route `(settings)/account-settings/` bị xoá. Truy cập URL cũ → Next.js `not-found` (không có custom not-found.tsx — xác nhận tại thời điểm viết). Người dùng đã bookmark `/account-settings` sẽ gặp not-found (chấp nhận — trang nội bộ sau đăng nhập). KHÔNG redirect (user chọn xoá hẳn, không giữ route trung gian).

### 2.3. Sidebar: bỏ mục "Cài đặt tài khoản", đổi danh tính mục còn lại
Nhóm "settings" hiện có: profile, accountSettings, billing, team. Sau gom:
- **Xoá** nav item `accountSettings`.
- Mục `profile` (giữ route `/profile`, giữ icon `User`) **đổi nhãn → "Account" / "Tài khoản"**.
- Còn lại: account (→`/profile`), billing, team.

### 2.4. Đổi title trang → "Account / Tài khoản"
Title trang `/profile` đổi từ "Profile/Hồ sơ" → "Account/Tài khoản"; description cập nhật cho khớp phạm vi rộng hơn (hồ sơ + bảo mật).

### 2.5. i18n: gom về 1 file `account.json`, namespace `account`
Để "clean code" (tên file = tên danh tính trang), **hợp nhất** `profile.json` + `accountSettings.json` thành một file mới `account.json` (namespace `account`):

```
account.json
├── title            ← "Account" / "Tài khoản" (đổi từ profile.title)
├── description      ← cập nhật phạm vi
├── card             ← nguyên từ profile.card
├── personalInfo     ← nguyên từ profile.personalInfo
├── connectedAccounts← nguyên từ profile.connectedAccounts
├── notificationPreferences ← nguyên từ profile.notificationPreferences
├── changePassword   ← MOVE từ accountSettings.changePassword
└── dangerZone       ← nguyên từ profile.dangerZone (giữ cuối, khớp thứ tự card)
```

- **Xoá** `profile.json` + `accountSettings.json` (en + vi) và 2 dòng import/đăng ký trong `locales/{en,vi}/index.ts`.
- 2 key orphan `accountSettings.title` / `accountSettings.description` (page header `/account-settings` cũ) **không** chuyển sang — biến mất cùng PageHeader.

### 2.6. Giữ route `/profile` + folder `views/Profile/` (cố ý, giảm rủi ro)
Chỉ i18n file/namespace đổi tên thành `account`. Route `/profile` và folder view `Profile/` **giữ nguyên** để: (a) không phá bookmark `/profile`; (b) giảm churn (đổi folder kéo theo nhiều import + route group). Đây là đánh đổi có chủ đích — chấp nhận lệch nhẹ tên (route `profile` ↔ namespace `account`).

## 3. Phạm vi thay đổi (inventory chính xác)

### A. View (`client/src/views/`)
- **Move** `AccountSettings/mains/ChangePasswordCard/` → `Profile/mains/ChangePasswordCard/`.
- **Move** `AccountSettings/hooks/useChangePassword.ts` → `Profile/hooks/useChangePassword.ts` (cập nhật import path trong card: `../../hooks/useChangePassword`).
- `Profile/index.tsx`: thêm `ChangePasswordCard` vào trước `DangerZoneCard`.
- **Xoá** toàn bộ `views/AccountSettings/` (gồm `index.tsx`, `mains/PageHeader/`).

### B. Route & điều hướng
- **Xoá** folder `src/app/[locale]/(private)/(settings)/account-settings/`.
- `src/constants/routes.ts`: gỡ `ACCOUNT_SETTINGS: "/account-settings"`.
- `src/types/Dashboard/index.ts`: gỡ union member `"accountSettings"` (SettingsKey).
- `src/dataSources/Dashboard/index.ts`: gỡ entry `{ key: "accountSettings", icon: Settings, href: ROUTES.ACCOUNT_SETTINGS }`; gỡ import `Settings` nếu thành orphan. Giữ entry `profile`.

### C. i18n
- **Tạo** `src/locales/en/account.json` + `src/locales/vi/account.json` (cấu trúc §2.5).
- **Xoá** `src/locales/{en,vi}/profile.json` + `src/locales/{en,vi}/accountSettings.json`.
- `src/locales/{en,vi}/index.ts`: thay 2 import (`profile`, `accountSettings`) bằng 1 import `account` + đăng ký `account,`.
- `src/locales/{en,vi}/dashboard.json`: `sidebar.nav.profile` → "Account"/"Tài khoản"; **xoá** `sidebar.nav.accountSettings`.
- **Đổi 15 tham chiếu** namespace (mechanical, đổi prefix `profile`→`account`, `accountSettings.changePassword`→`account.changePassword`):
  - `Profile/mains/ProfileCard` — `useTranslations("profile")` → `"account"`
  - `Profile/mains/PageHeader` — `getTranslations("profile")` → `"account"`
  - `Profile/mains/NotificationPreferencesCard` — `"profile.notificationPreferences"` → `"account.notificationPreferences"`
  - `Profile/mains/DangerZoneCard` — `"profile.dangerZone"` → `"account.dangerZone"`
  - `Profile/mains/ConnectedAccountsCard` — `"profile.connectedAccounts"` → `"account.connectedAccounts"`
  - `Profile/components/{PhoneField,LastNameField,GenderField,FirstNameField,DateOfBirthField,AddressField,PersonalInfoForm}` — `"profile.personalInfo"` (+ GenderField `"profile.personalInfo.genderOptions"`) → `"account.personalInfo..."`
  - `Profile/mains/ChangePasswordCard` (đã move) — `"accountSettings.changePassword"` → `"account.changePassword"`
  - `Profile/hooks/useChangePassword.ts` (đã move) — `"accountSettings.changePassword"` → `"account.changePassword"`

### D. Types
- `src/types/ChangePassword/` giữ nguyên (chỉ là form values, không gắn route/namespace).

## 4. Reconcile E2E (3 artifact đồng bộ — §4.3)

Việc gom phá vỡ giả định "/account-settings tồn tại" của các suite cũ. Reconcile:

### D.1. Suite mới `client/e2e/profile-account-merge/`
Owns hành vi **đặc thù của việc gom** (route removal, nav, composition, i18n rename). Di chuyển case còn hữu dụng từ `account-settings-cleanup` sang đây. Tài liệu kịch bản: `docs/specs/profile-account-merge/e2e.md`.

### D.2. Xoá suite `client/e2e/account-settings-cleanup/`
Phần lớn obsolete sau khi `/account-settings` biến mất (F2 assert "có link Account Settings", #1/#9/#2 goto `/account-settings`). Case còn giá trị (F1 security-route 404 — KHÔNG liên quan feature này) đã có lịch sử riêng; F1 giữ lại bằng cách **di chuyển vào suite mới** hoặc xác nhận đã được suite khác cover. Reconcile khi `writing-plans` quyết định từng case: ADD (nav-removed, /account-settings 404, page co-location) · UPDATE (target /profile) · REMOVE (mọi assert dựa trên /account-settings tồn tại).

### D.3. Repoint suite `client/e2e/change-password/change-password.e2e.ts`
Form đổi mật khẩu giờ sống ở `/profile`. **Update** (không re-derive — logic form không đổi): mọi `goto("/account-settings")` / `"/vi/account-settings"` → `/profile`; mọi `expect(page).toHaveURL(/\/account-settings/)` → `/\/profile/`; comment nguồn i18n `accountSettings.changePassword` → `account.changePassword`. Helper `helpers/changePassword.ts` không hardcode route → không đổi.

## 5. Ngoài phạm vi (YAGNI)
- **BE / logic change-password**: không đụng (chỉ di chuyển component + đổi route/nhãn/namespace).
- **Pencil mock (step 1.5)**: SKIP — không có layout/luồng visual mới; chỉ ghép card sẵn có vào trang sẵn có (tái dùng layout ProfileCard + ChangePasswordCard).
- **Security review (4.5)**: SKIP — không thay đổi bề mặt tấn công (auth/input/data nhạy cảm không đổi; form change-password giữ nguyên contract + guard BE).
- **Đổi tên route `/profile`→`/account` + folder `Profile`→`Account`**: không làm (xem §2.6).

## 6. Rủi ro & lưu ý
- **i18n missing-message (rủi ro cao nhất)**: đổi namespace `profile`→`account` + move `changePassword` chạm 15 chỗ. Sót 1 reference → next-intl `MISSING_MESSAGE`. Chốt bằng `yarn build` (type-check IntlMessages) + grep `"profile\.`/`accountSettings` + E2E i18n console scan (en + vi).
- **Orphan import**: `Settings` icon trong `dataSources/Dashboard` có thể thành orphan sau khi gỡ nav item → lint bắt.
- **Bookmark cũ** `/account-settings` → not-found (chấp nhận, §2.2).
- **E2E reconcile chưa làm = thay đổi chưa hoàn chỉnh**: code đổi nhưng suite cũ còn goto `/account-settings` sẽ fail — phải sync trong cùng PR.

## 7. E2E Scenario Matrix

Thay đổi observable (gộp card, mất nav item + route, đổi title/nhãn, đổi namespace render) → áp dụng E2E. Đây là **reconcile feature đã có**: matrix tập trung vào *delta của việc gom*; validation/BVA/DT của form đổi mật khẩu **đã thuộc suite `change-password`** (chỉ repoint path), không re-derive ở đây.

| # | Category | Verdict | Scenario / lý do | Gate |
| --- | --- | --- | --- | --- |
| 1 | Happy path | ✅ | Đăng nhập → `/profile` render đủ 6 card trong 1 trang cuộn dọc: ProfileCard, PersonalInfo, ConnectedAccounts, NotificationPreferences, **ChangePassword**, DangerZone. Title = "Account". | A+B |
| 2 | AuthN | ✅ | Chưa đăng nhập vào `/profile` → redirect `/login` (fresh context: `storageState: undefined` + `clearCookies` — cookie localhost không scope port). **[error-guessing]** | A+B |
| 3 | AuthZ | N/A | Trang self-service user-level, không gating theo role (không phải admin). | — |
| 4 | Validation / expected-error | ✅ (delegated) | Validation form đổi mật khẩu (EP class new-pw, DT combo current×new×confirm) **do suite `change-password` cover** tại location mới `/profile` — không re-derive. Merge suite chỉ smoke: form reachable + submit được ở `/profile`. | A+B |
| 5 | Empty / null | N/A | Gom không thêm list/fetch/empty-state mới (card mock sẵn có không đổi). | — |
| 6 | Boundary / pagination | N/A | Không có pagination/numeric input mới do việc gom. Boundary kiểu "route tồn tại/không" → đưa vào F1 (ST). | — |
| 7 | Filter / search | N/A | Trang không có filter/search. | — |
| 8 | Data rendering | ✅ | Title render "Account"/"Tài khoản" (không phải "Profile" cũ, không raw key `account.title`). Sidebar hiện nhãn "Account". Heading các card (ChangePassword, DangerZone) render text thật. | A+B |
| 9 | **i18n (en + vi)** | ✅ | `/profile` + `/vi/profile`: title, nhãn sidebar, mọi heading card render localized; **không có `MISSING_MESSAGE`/`IntlError` trong console** sau rename namespace `profile`→`account` + move `changePassword`. **[error-guessing]** quét console error; assert không leak raw key `account.*` / `profile.*` / `accountSettings.*` trong body. (Rủi ro cao nhất — §6.) | A+B |
| 10 | Error / loading | ✅ (delegated + 1) | Lỗi/loading API đổi mật khẩu **do suite `change-password` cover** ở `/profile`. Merge thêm: `/account-settings` (đã xoá) → trang not-found render gọn, không crash / không bão console error. | A+B |
| 11 | Mutation safety / State Transition | ✅ | **[ST] valid**: từ trang khác bấm link sidebar "Account" → điều hướng đúng `/profile`, render đủ card (nav còn hoạt động). **[ST] invalid (MANDATORY)** — xem F1: route `/account-settings` từng hợp lệ nay không match → not-found. Merge suite **KHÔNG** mutate mật khẩu (mutation thật thuộc suite `change-password`, gate `A only` ở đó) → mọi scenario merge an toàn `A+B`. | A+B |
| 12 | Accessibility | ✅ | `/profile` dùng role/label selector; mỗi card có heading (`aria-labelledby`); 1 page title (h1) duy nhất; ChangePasswordCard (đã move) giữ label-association + tab order (form internals do suite `change-password` cover). | A+B |
| F1 | Route removal `[ST]` | ✅ | `/account-settings` và `/vi/account-settings` → `not-found`/404 (invalid transition: route từng hợp lệ nay không còn). Heading "Change Password" KHÔNG xuất hiện ở URL đó. | A+B |
| F2 | Nav integrity | ✅ | Sidebar nhóm Settings liệt kê **Account**, Billing, Team — **KHÔNG** còn "Account Settings", **KHÔNG** còn nhãn "Profile" cũ. Bấm "Account" → `/profile` (chứng minh render trang thật, không phải not-found). | A+B |
| F3 | Dead-reference / build guard | ✅ | Không còn import/string tham chiếu `ROUTES.ACCOUNT_SETTINGS` / `views/AccountSettings` / namespace `profile.*` / `accountSettings.*` / file `profile.json`/`accountSettings.json` — chốt bằng `yarn build` (type-check IntlMessages bắt key sai) + grep. Không cần E2E. | — |

**Test-design techniques áp dụng**:
- **[ST]** — F1 route removal (invalid transition) + row 11 valid transition (nav). Đây là kỹ thuật chính cho feature điều hướng/composition này.
- **[error-guessing]** — row 2 (fresh-context AuthN), row 9 (console MISSING_MESSAGE scan), row 10 (not-found không crash).
- **[EP]/[BVA]/[DT]** — KHÔNG kích hoạt ở merge suite: không có input domain / boundary / điều kiện kết hợp **mới** do việc gom. Các kỹ thuật này áp cho form đổi mật khẩu, **đã thuộc suite `change-password`** (giữ nguyên, chỉ repoint `/profile`).
- **Completeness-critic**: user chưa yêu cầu "thorough/≥90%" → không chạy subagent critic. Error-guessing inline đã phủ: bookmark URL cũ → 404 (F1), đổi locale giữ trang gom (row 9), link sidebar cũ (F2), console missing-message sau rename (row 9).
