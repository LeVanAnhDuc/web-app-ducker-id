# Design — Trim trang `/profile`

**Feature:** `profile-trim`
**Side:** FE-only (`client/src/**` + `client/e2e/**`) + docs
**Ngày:** 2026-07-08

## 1. Mục tiêu

Đơn giản hóa trang `/profile` (feature nền `profile-account-merge`) bằng 3 thay đổi:

1. Bỏ input **Email** trong `PersonalInfoCard` — input này luôn `disabled`/`readOnly`, và email đã hiển thị ở `ProfileCard` phía trên → dư thừa.
2. Xóa hẳn section **Connected Accounts** — hiện chưa cần.
3. Xóa hẳn section **Notification Preferences** — hiện chưa cần.

Quyết định của user: **xóa toàn bộ code** (không giữ dead code — cần lại thì khôi phục từ git history); Phone **ghép cặp với Gender** sau khi bỏ Email.

## 2. Thay đổi chi tiết

### 2.1 Bỏ input Email (`views/Profile/components/PersonalInfoForm/index.tsx`)

- Xóa block `FormItem` chứa Email (hiện dòng 114-125).
- Layout mới:

  | Hàng | Trái | Phải |
  |------|------|------|
  | 1 | First Name | Last Name |
  | 2 | Phone | Gender |
  | 3 | Address (full-width) | — |
  | 4 | Date of Birth | *(trống)* |

  `Date of Birth` giữ trong grid `sm:grid-cols-2` (nửa-cột, phải trống) — date picker full-width trông quá rộng.
- Dọn import không còn dùng: `FormItem`, `FormLabel` (từ `@/components/ui/form`), `CustomInput`.
- `profile` prop vẫn cần cho `mapProfileToFormValues` → giữ nguyên signature.

### 2.2 Xóa `ConnectedAccountsCard`

- Xóa file/folder:
  - `views/Profile/mains/ConnectedAccountsCard/`
  - `views/Profile/components/ConnectedAccountRow/`
- Xóa mock `CONNECTED_ACCOUNTS_MOCK` (`mocks/Profile/index.ts`).
- Xóa type `ConnectedAccountKey`, `ConnectedAccountMock` (`types/Profile/index.ts`).
- Xóa namespace i18n `account.connectedAccounts` trong `locales/en/account.json` + `locales/vi/account.json`.

### 2.3 Xóa `NotificationPreferencesCard`

- Xóa file/folder:
  - `views/Profile/mains/NotificationPreferencesCard/`
  - `views/Profile/components/NotificationToggleRow/`
- Xóa mock `NOTIFICATION_PREFS_MOCK` (`mocks/Profile/index.ts`).
- Xóa type `NotificationPrefKey`, `NotificationPrefMock` (`types/Profile/index.ts`).
- Xóa namespace i18n `account.notificationPreferences` trong `locales/en/account.json` + `locales/vi/account.json`.

### 2.4 `views/Profile/index.tsx`

- Gỡ import + render `<ConnectedAccountsCard />` và `<NotificationPreferencesCard />`.
- Còn lại: `PageHeader` → `ProfileCard` → `PersonalInfoCard` → `ChangePasswordCard` → `DangerZoneCard`.

### 2.5 Không đụng (giữ nguyên)

- `ProfileCard` — dùng `PROFILE_STATS_MOCK` + `ProfileStatsMock` (giữ lại).
- `mocks/Profile/index.ts` còn lại `PROFILE_STATS_MOCK`; `types/Profile/index.ts` còn lại `ProfileStatsMock`.
- `locales/*/signup.json` — không liên quan (namespace riêng).

## 3. API contract

Không đổi. Cả 3 thay đổi thuần FE UI; không đụng request/response BE.

## 4. E2E Scenario Matrix — reconcile feature nền `profile-account-merge`

Đây là **sửa feature đã có** (§4.3) → KHÔNG rebuild suite, chỉ reconcile 3 artifact của `profile-account-merge`:

| Artifact | Thay đổi |
|----------|----------|
| `client/e2e/profile-account-merge/merge.e2e.ts` — Row 1 (happy path) | REMOVE `connectedAccounts` + `notificationPreferences` khỏi danh sách heading phải-visible → còn `title + personalInfo + changePassword + dangerZone`. ADD assertion 2 heading đó `toHaveCount(0)` (regression guard). |
| `docs/specs/profile-account-merge/e2e.md` — Row 1 | Cập nhật mô tả "six sections" → 4 section render + 2 section đã xóa vắng mặt. |

Các row khác của suite (AuthN, page identity, i18n, route removal, nav integrity) **không đổi** — không phụ thuộc 2 section bị xóa.

Không tạo case mới cho việc bỏ input Email: không có e2e case nào assert sự hiện diện của input email (Row 1 chỉ check heading). Email vẫn hiển thị qua `ProfileCard`. Regression guard tối thiểu = 2 assertion `toHaveCount(0)` ở trên.

## 5. Gate SKIP (ghi rõ lý do)

| Gate | Quyết định | Lý do |
|------|------------|-------|
| SuperDesign step 1.5 | SKIP | Chỉ xóa UI + reflow 2-cột nhẹ, không có bố cục/luồng visual MỚI cần user duyệt trước. |
| Security review §4.5 | SKIP | Không đụng auth / input user / data nhạy cảm — chỉ gỡ 1 field read-only + 2 card mock-only. |
| CLAUDE.md drift §4.6 | SKIP | Không đổi command / module-struct / dependency / convention nào CLAUDE.md mô tả. |
| E2E dual-gate §4.3 | RUN (nhẹ) | Behavior user-observable đổi (section bị gỡ) → chạy lại suite `profile-account-merge` sau reconcile. |

## 6. Isolation & artifact

- Worktree per-repo từ `origin/main`, branch `chore/profile-trim`: `client/`, `docs/`.
- Design/plan: `docs/specs/profile-trim/`.
- E2E reconcile sửa trực tiếp `docs/specs/profile-account-merge/e2e.md` + `client/e2e/profile-account-merge/merge.e2e.ts`.
