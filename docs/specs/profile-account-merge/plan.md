# Gom Hồ sơ & Cài đặt tài khoản — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gom trang `/account-settings` (chỉ còn ChangePasswordCard) vào trang `/profile` thành 1 trang cuộn dọc, xoá `/account-settings`, đổi danh tính trang → "Account/Tài khoản", gom i18n về 1 file `account.json`.

**Architecture:** FE-only (Next.js 15 App Router). Di chuyển 1 card + hook giữa 2 view, xoá 1 view + 1 route, hợp nhất 2 namespace i18n thành 1, đổi 15 reference namespace, dọn nav/route/type. Reconcile 3 artifact E2E.

**Tech Stack:** Next.js 15, React 19, TypeScript, next-intl, Playwright (E2E).

## Global Constraints

- **Convention source-of-truth**: đọc `client/.claude/CLAUDE.md` + `client/.claude/rules/*` trước khi sửa code FE. Conflict skill ↔ CLAUDE.md → CLAUDE.md thắng.
- **Component folder**: mỗi component 1 folder `index.tsx`, arrow function, 1 default export (rules/component-folder.md).
- **View structure**: `index.tsx` chỉ import từ `mains/`; query/mutation ở `views/<Page>/hooks/` (rules/views.md).
- **i18n**: mọi string qua next-intl; key phải tồn tại cả `en/` và `vi/`; namespace import qua `@/i18n/navigation` cho navigation.
- **Constants**: route paths qua `CONSTANTS.ROUTES.*` (rules/constants.md).
- **Quality gate** (sau mỗi task, BẮT BUỘC, theo client CLAUDE.md): `cd client && yarn format && yarn lint && yarn build` — phải xanh hết. `yarn build` (next build) đã type-check + validate IntlMessages.
- **Worktree**: làm trong `client/.worktrees/profile-account-merge/` (đã tạo, branch `feat/profile-account-merge`).
- **Route `/profile` + folder `views/Profile/` + nav key `profile` GIỮ NGUYÊN** — chỉ đổi label hiển thị (design §2.6).
- **Commit gate**: user opt-out review → subagent commit per-task tự động (Review OFF).

---

## File Structure (decomposition)

**Created:**
- `client/src/locales/en/account.json`, `client/src/locales/vi/account.json` — namespace `account` hợp nhất (title/description/card/personalInfo/connectedAccounts/notificationPreferences/changePassword/dangerZone).
- `client/src/views/Profile/mains/ChangePasswordCard/index.tsx` — move từ AccountSettings.
- `client/src/views/Profile/hooks/useChangePassword.ts` — move từ AccountSettings.
- `client/e2e/profile-account-merge/merge.e2e.ts` — suite E2E mới.

**Modified:**
- `client/src/views/Profile/index.tsx` — thêm ChangePasswordCard trước DangerZoneCard.
- 13 component dùng `useTranslations("profile.*")` → `"account.*"` (liệt kê Task 1).
- `client/src/locales/{en,vi}/index.ts` — thay import `profile`+`accountSettings` bằng `account`.
- `client/src/locales/{en,vi}/dashboard.json` — `nav.profile` → "Account"/"Tài khoản"; xoá `nav.accountSettings`.
- `client/src/constants/routes.ts` — gỡ `ACCOUNT_SETTINGS`.
- `client/src/types/Dashboard/index.ts` — gỡ `"accountSettings"` khỏi `NavKey`.
- `client/src/dataSources/Dashboard/index.ts` — gỡ nav item `accountSettings` + import `Settings` nếu orphan.
- `client/e2e/change-password/change-password.e2e.ts` — repoint `/account-settings` → `/profile`.

**Deleted:**
- `client/src/views/AccountSettings/` (toàn bộ).
- `client/src/app/[locale]/(private)/(settings)/account-settings/`.
- `client/src/locales/{en,vi}/profile.json`, `client/src/locales/{en,vi}/accountSettings.json`.
- `client/e2e/account-settings-cleanup/` (toàn bộ suite).

---

## Task 1: Hợp nhất i18n về `account.json` + repoint references

**Files:**
- Create: `client/src/locales/en/account.json`, `client/src/locales/vi/account.json`
- Modify: `client/src/locales/en/index.ts`, `client/src/locales/vi/index.ts`
- Modify (rename namespace, 13 files):
  - `client/src/views/Profile/mains/ProfileCard/index.tsx`
  - `client/src/views/Profile/mains/PageHeader/index.tsx`
  - `client/src/views/Profile/mains/NotificationPreferencesCard/index.tsx`
  - `client/src/views/Profile/mains/DangerZoneCard/index.tsx`
  - `client/src/views/Profile/mains/ConnectedAccountsCard/index.tsx`
  - `client/src/views/Profile/components/PhoneField/index.tsx`
  - `client/src/views/Profile/components/PersonalInfoForm/index.tsx`
  - `client/src/views/Profile/components/LastNameField/index.tsx`
  - `client/src/views/Profile/components/GenderField/index.tsx`
  - `client/src/views/Profile/components/FirstNameField/index.tsx`
  - `client/src/views/Profile/components/DateOfBirthField/index.tsx`
  - `client/src/views/Profile/components/AddressField/index.tsx`
  - `client/src/views/AccountSettings/mains/ChangePasswordCard/index.tsx` (tạm — sẽ move ở Task 2)

**Interfaces:**
- Produces: namespace i18n `account` với toàn bộ key của `profile` + `account.changePassword` (move từ `accountSettings.changePassword`). Title/description đổi sang "Account".
- Note: profile.json + accountSettings.json **vẫn còn** sau task này (registered-but-unused) → build vẫn xanh. Xoá ở Task 2 sau khi view AccountSettings biến mất.

- [ ] **Step 1: Tạo `client/src/locales/en/account.json`**

Nội dung = copy NGUYÊN văn `en/profile.json`, với 2 thay đổi + chèn `changePassword`:
- `title`: `"Account"` (đổi từ `"Profile"`)
- `description`: `"Manage your profile, preferences, and account security"` (đổi từ `"Manage your personal information and preferences"`)
- Chèn block `"changePassword"` (copy NGUYÊN văn từ `en/accountSettings.json` → `changePassword`) **ngay trước** block `"dangerZone"`.

Thứ tự key: `title, description, card, personalInfo, connectedAccounts, notificationPreferences, changePassword, dangerZone`.

- [ ] **Step 2: Tạo `client/src/locales/vi/account.json`**

Tương tự, copy NGUYÊN văn `vi/profile.json` với:
- `title`: `"Tài khoản"` (đổi từ `"Hồ sơ"`)
- `description`: `"Quản lý hồ sơ, tùy chọn và bảo mật tài khoản"`
- Chèn `"changePassword"` copy NGUYÊN văn từ `vi/accountSettings.json` → `changePassword`, ngay trước `"dangerZone"`.

- [ ] **Step 3: Đăng ký namespace `account` trong locale index (en + vi)**

Trong `client/src/locales/en/index.ts` VÀ `client/src/locales/vi/index.ts`:
- Thêm `import account from "./account.json";` (cạnh các import khác).
- Thêm `account,` vào object `messages`.
- (Chưa xoá `profile` / `accountSettings` — giữ tới Task 2.)

- [ ] **Step 4: Repoint 13 file sang namespace `account`**

Đổi prefix namespace (giữ nguyên phần sau dấu chấm):
- `useTranslations("profile")` → `useTranslations("account")` (ProfileCard)
- `getTranslations("profile")` → `getTranslations("account")` (PageHeader)
- `useTranslations("profile.notificationPreferences")` → `"account.notificationPreferences"`
- `useTranslations("profile.dangerZone")` → `"account.dangerZone"`
- `useTranslations("profile.connectedAccounts")` → `"account.connectedAccounts"`
- `useTranslations("profile.personalInfo")` → `"account.personalInfo"` (PhoneField, PersonalInfoForm, LastNameField, GenderField, FirstNameField, DateOfBirthField, AddressField)
- `useTranslations("profile.personalInfo.genderOptions")` → `"account.personalInfo.genderOptions"` (GenderField)
- `useTranslations("accountSettings.changePassword")` → `"account.changePassword"` (ChangePasswordCard — tạm ở AccountSettings view)

- [ ] **Step 5: Verify build + no missing-message**

```bash
cd client && yarn format && yarn lint && yarn build
```
Expected: PASS. Grep chốt không còn reference cũ ở `src/` ngoài file profile.json/accountSettings.json (sẽ xoá Task 2):
```bash
grep -rn '"profile\.\|("profile")\|accountSettings\.changePassword' src/views src/components || echo "clean"
```
Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "i18n(profile-account-merge): consolidate profile + accountSettings into account namespace"
```

---

## Task 2: Gom view + xoá route/nav + dọn i18n cũ

**Files:**
- Create: `client/src/views/Profile/mains/ChangePasswordCard/index.tsx` (move), `client/src/views/Profile/hooks/useChangePassword.ts` (move)
- Modify: `client/src/views/Profile/index.tsx`, `client/src/constants/routes.ts`, `client/src/types/Dashboard/index.ts`, `client/src/dataSources/Dashboard/index.ts`, `client/src/locales/{en,vi}/dashboard.json`, `client/src/locales/{en,vi}/index.ts`
- Delete: `client/src/views/AccountSettings/`, `client/src/app/[locale]/(private)/(settings)/account-settings/`, `client/src/locales/{en,vi}/profile.json`, `client/src/locales/{en,vi}/accountSettings.json`

**Interfaces:**
- Consumes: namespace `account.changePassword` (Task 1).
- Produces: `/profile` render 6 card; `/account-settings` không còn route (404); nav chỉ còn Account/Billing/Team.

- [ ] **Step 1: Move hook `useChangePassword.ts` sang Profile**

`git mv client/src/views/AccountSettings/hooks/useChangePassword.ts client/src/views/Profile/hooks/useChangePassword.ts` (tạo folder `Profile/hooks/` nếu chưa có). Nội dung không đổi (đã dùng `account.changePassword` từ Task 1).

- [ ] **Step 2: Move `ChangePasswordCard` sang Profile + sửa import hook**

`git mv client/src/views/AccountSettings/mains/ChangePasswordCard client/src/views/Profile/mains/ChangePasswordCard`. Import hook trong card đã là `../../hooks/useChangePassword` → path tương đối giữ đúng (mains/ChangePasswordCard → ../../hooks). Xác nhận import resolve.

- [ ] **Step 3: Thêm ChangePasswordCard vào `Profile/index.tsx`**

```tsx
// components
import PageHeader from "./mains/PageHeader";
import ProfileCard from "./mains/ProfileCard";
import PersonalInfoCard from "./mains/PersonalInfoCard";
import ConnectedAccountsCard from "./mains/ConnectedAccountsCard";
import NotificationPreferencesCard from "./mains/NotificationPreferencesCard";
import ChangePasswordCard from "./mains/ChangePasswordCard";
import DangerZoneCard from "./mains/DangerZoneCard";

const Profile = () => (
  <div className="flex flex-col gap-6">
    <PageHeader />
    <ProfileCard />
    <PersonalInfoCard />
    <ConnectedAccountsCard />
    <NotificationPreferencesCard />
    <ChangePasswordCard />
    <DangerZoneCard />
  </div>
);

export default Profile;
```

- [ ] **Step 4: Xoá view AccountSettings + route account-settings**

```bash
rm -rf "client/src/views/AccountSettings"
rm -rf "client/src/app/[locale]/(private)/(settings)/account-settings"
```

- [ ] **Step 5: Gỡ route constant + union NavKey**

- `client/src/constants/routes.ts`: xoá dòng `ACCOUNT_SETTINGS: "/account-settings",`.
- `client/src/types/Dashboard/index.ts`: xoá `| "accountSettings"` khỏi `NavKey`.

- [ ] **Step 6: Gỡ nav item trong dataSources/Dashboard**

`client/src/dataSources/Dashboard/index.ts`: xoá dòng
`{ key: "accountSettings", icon: Settings, href: ROUTES.ACCOUNT_SETTINGS },`.
Nếu `Settings` không còn dùng ở đâu trong file → xoá khỏi import `lucide-react` (lint sẽ bắt nếu sót). Giữ item `{ key: "profile", icon: User, href: ROUTES.PROFILE }`.

- [ ] **Step 7: Đổi nhãn nav + xoá key accountSettings trong dashboard.json**

- `en/dashboard.json`: `sidebar.nav.profile`: `"Profile"` → `"Account"`; xoá dòng `"accountSettings": "Account Settings",`.
- `vi/dashboard.json`: `sidebar.nav.profile`: `"Hồ sơ"` → `"Tài khoản"`; xoá dòng `"accountSettings": "Cài đặt tài khoản",`.

- [ ] **Step 8: Xoá i18n cũ + unregister**

```bash
rm client/src/locales/en/profile.json client/src/locales/vi/profile.json
rm client/src/locales/en/accountSettings.json client/src/locales/vi/accountSettings.json
```
`client/src/locales/{en,vi}/index.ts`: xoá `import profile ...`, `import accountSettings ...` và xoá `profile,`, `accountSettings,` khỏi `messages`.

- [ ] **Step 9: Verify build + grep dead refs**

```bash
cd client && yarn format && yarn lint && yarn build
grep -rn 'ACCOUNT_SETTINGS\|views/AccountSettings\|accountSettings\|"profile\.\|profile\.json\|account-settings' src || echo "clean"
```
Expected: build PASS; grep `clean` (chỉ còn `/profile` route + nav key `profile` nếu match — kiểm tra kỹ các hit còn lại đều là nav key `profile` hợp lệ, không phải reference đã xoá).

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(profile-account-merge): merge change-password into /profile, remove /account-settings"
```

---

## Task 3: Reconcile E2E (suite mới + xoá cleanup + repoint change-password)

**Files:**
- Create: `client/e2e/profile-account-merge/merge.e2e.ts`
- Delete: `client/e2e/account-settings-cleanup/` (toàn bộ)
- Modify: `client/e2e/change-password/change-password.e2e.ts`
- Create: `docs/specs/profile-account-merge/e2e.md` (trong docs worktree)

**Interfaces:**
- Consumes: helpers `client/e2e/helpers/env.ts` (`BASE_URL`, `USER_EMAIL`, `USER_PASSWORD`).
- Verify thật sự ở bước §4.3 dual-gate (không chạy trong task này — task này chỉ viết test đúng).

- [ ] **Step 1: Repoint suite change-password sang `/profile`**

Trong `client/e2e/change-password/change-password.e2e.ts`, thay TẤT CẢ:
- `page.goto("/account-settings")` → `page.goto("/profile")`
- `page.goto("/vi/account-settings")` → `page.goto("/vi/profile")`
- `await freshPage.goto("/account-settings")` → `"/profile"`
- `expect(page).toHaveURL(/\/account-settings/)` → `expect(page).toHaveURL(/\/profile/)`
- Sửa comment nguồn i18n: `accountSettings.changePassword` → `account.changePassword`.

Logic test giữ nguyên (form đổi mật khẩu không đổi behavior; selector theo label/role vẫn đúng).

- [ ] **Step 2: Xoá suite cleanup obsolete**

```bash
rm -rf client/e2e/account-settings-cleanup
```
(Mọi assertion của suite này dựa trên `/account-settings` tồn tại + nav "Account Settings" — không còn đúng. Case route-removal `/security` của nó KHÔNG thuộc feature này; không di chuyển. Case còn giá trị về co-location DangerZone được suite mới phủ lại.)

- [ ] **Step 3: Viết suite mới `client/e2e/profile-account-merge/merge.e2e.ts`**

```ts
import { test, expect } from "@playwright/test";

// E2E — Profile/Account merge. Scenario Matrix:
// docs/specs/profile-account-merge/e2e.md. Read-only / no mutation
// (password-change form behaviour lives in e2e/change-password). i18n strings
// sourced verbatim from src/locales/{en,vi}/{account,dashboard}.json.

const EN = {
  title: "Account",
  personalInfo: "Personal Information",
  connectedAccounts: "Connected Accounts",
  notificationPreferences: "Notification Preferences",
  changePassword: "Change Password",
  dangerZone: "Danger Zone",
  settingsGroup: "Settings",
  navAccount: "Account",
  navBilling: "Billing",
  navTeam: "Team",
  navAccountSettings: "Account Settings",
  navProfileOld: "Profile"
} as const;

const VI = {
  title: "Tài khoản",
  changePassword: "Đổi mật khẩu",
  dangerZone: "Vùng nguy hiểm"
} as const;

const NOT_FOUND_TEXT = /this page could not be found|404|not found/i;

const collectConsoleErrors = (page: import("@playwright/test").Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
};

const expectNoMissingMessage = (errors: string[]) => {
  const offending = errors.filter((m) =>
    /MISSING_MESSAGE|IntlError|MessageFormat/i.test(m)
  );
  expect(offending, offending.join("\n")).toHaveLength(0);
};

// --- Row 1 — Happy path: all six cards on one /profile page ---------------
test.describe("Profile/Account merge — happy path", () => {
  test("renders all six sections on /profile in one page", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: EN.title })
    ).toBeVisible();
    for (const name of [
      EN.personalInfo,
      EN.connectedAccounts,
      EN.notificationPreferences,
      EN.changePassword,
      EN.dangerZone
    ]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });
});

// --- Row 8 — Data rendering: new title, not the old "Profile" -------------
test.describe("Profile/Account merge — page identity", () => {
  test("page title is 'Account' (not the old 'Profile')", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: EN.navProfileOld, exact: true })
    ).toHaveCount(0);
  });
});

// --- Row 2 — AuthN: unauthenticated -> /login -----------------------------
test.describe("Profile/Account merge — AuthN", () => {
  test("unauthenticated user is redirected away from /profile", async ({
    browser
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    await ctx.clearCookies();
    try {
      const freshPage = await ctx.newPage();
      await freshPage.goto("/profile");
      await expect(freshPage).toHaveURL(/\/login/, { timeout: 20_000 });
    } finally {
      await ctx.close();
    }
  });
});

// --- Row 9 — i18n en + vi, no missing-message after namespace rename ------
test.describe("Profile/Account merge — i18n", () => {
  test("english /profile localized with no missing messages", async ({
    page
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: EN.changePassword })
    ).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/account\.(title|changePassword|dangerZone)/);
    expect(body).not.toMatch(/profile\.|accountSettings\./);
    expectNoMissingMessage(errors);
  });

  test("vietnamese /vi/profile localized with no missing messages", async ({
    page
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/vi/profile");
    await expect(page.getByRole("heading", { name: VI.title })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: VI.changePassword })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: VI.dangerZone })
    ).toBeVisible();
    expectNoMissingMessage(errors);
  });
});

// --- F1 — Route removal [ST invalid]: /account-settings -> not-found ------
test.describe("Profile/Account merge — route removal", () => {
  test("/account-settings renders not-found (default locale)", async ({
    page
  }) => {
    await page.goto("/account-settings");
    await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: EN.changePassword })
    ).toHaveCount(0);
  });

  test("/vi/account-settings renders not-found (vietnamese)", async ({
    page
  }) => {
    await page.goto("/vi/account-settings");
    await expect(page.getByText(NOT_FOUND_TEXT).first()).toBeVisible();
  });
});

// --- F2 — Nav integrity: Account present, Account Settings/Profile gone ----
test.describe("Profile/Account merge — nav integrity", () => {
  test("settings nav has Account/Billing/Team, no Account Settings", async ({
    page
  }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: EN.title })).toBeVisible();

    const settingsNav = page
      .getByRole("navigation", { name: EN.settingsGroup })
      .or(page.locator(`[aria-label="${EN.settingsGroup}"]`))
      .first();

    await expect(
      settingsNav.getByRole("link", { name: EN.navAccount, exact: true })
    ).toBeVisible();
    await expect(
      settingsNav.getByRole("link", { name: EN.navBilling })
    ).toBeVisible();
    await expect(
      settingsNav.getByRole("link", { name: EN.navTeam })
    ).toBeVisible();
    await expect(
      settingsNav.getByRole("link", { name: EN.navAccountSettings })
    ).toHaveCount(0);
  });

  test("Account nav link navigates to /profile", async ({ page }) => {
    await page.goto("/profile");
    const settingsNav = page
      .getByRole("navigation", { name: EN.settingsGroup })
      .or(page.locator(`[aria-label="${EN.settingsGroup}"]`))
      .first();
    await settingsNav
      .getByRole("link", { name: EN.navAccount, exact: true })
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(
      page.getByRole("heading", { name: EN.dangerZone })
    ).toBeVisible();
  });
});
```

- [ ] **Step 4: Viết `docs/specs/profile-account-merge/e2e.md`**

Tài liệu kịch bản: liệt kê các describe trên ánh xạ về row matrix (1, 2, 8, 9, F1, F2), ghi rõ:
- Gate column (tất cả `A+B`; không scenario mutation).
- Row 4/10/11 (validation/error/mutation form) → **delegated** suite `change-password` (đã repoint `/profile`).
- DEFER registry: rate-limit case của change-password vẫn `test.skip` như cũ.
- Follow-up: nav landmark aria-label = group label (theo pattern cleanup cũ).

- [ ] **Step 5: Commit**

```bash
git -C client add -A && git -C client commit -m "test(profile-account-merge): new merge e2e suite, repoint change-password, drop cleanup suite"
git -C docs add specs/profile-account-merge/e2e.md && git -C docs commit -m "docs(profile-account-merge): e2e scenario doc"
```

---

## Self-Review

**Spec coverage** (design §3, §4, §7):
- §3.A view move → Task 2 step 1-4 ✓
- §3.B route/nav → Task 2 step 5-7 ✓
- §3.C i18n gom + 15 ref → Task 1 (13 file) + Task 2 step 2 (ChangePasswordCard moved, đã repoint Task 1 step 4) + hook (Task 1 step 4 áp cho hook? — **hook repoint**: bổ sung, xem dưới) ✓
- §4 reconcile E2E → Task 3 ✓
- §7 matrix rows → Task 3 step 3 (rows 1,2,8,9,F1,F2) + delegated (4,10,11 → change-password) ✓

**Gap fix**: Task 1 step 4 liệt kê 13 file nhưng §3.C có **15 reference** = 13 + ChangePasswordCard + `useChangePassword.ts` hook. Hook `useChangePassword.ts` dùng `useTranslations("accountSettings.changePassword")` → PHẢI repoint sang `account.changePassword`. **Bổ sung vào Task 1 step 4**: thêm file `client/src/views/AccountSettings/hooks/useChangePassword.ts` vào danh sách repoint (đổi `"accountSettings.changePassword"` → `"account.changePassword"`). Sau Task 1 cả card lẫn hook đều dùng `account.changePassword`; Task 2 chỉ `git mv` (nội dung không đổi nữa).

**Placeholder scan**: không có TBD/TODO; account.json dùng "copy verbatim" + giá trị title/description cụ thể (instruction chính xác, không phải placeholder).

**Type consistency**: `NavKey` (không phải `SettingsKey`); nav key `profile` giữ; `ROUTES.PROFILE` giữ; `ROUTES.ACCOUNT_SETTINGS` xoá. Nhất quán.
