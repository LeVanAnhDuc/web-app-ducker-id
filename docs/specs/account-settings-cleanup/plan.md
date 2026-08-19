# Account Settings Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gỡ feature "Phiên đang hoạt động" (không khả thi) và xoá trang `/security` trùng lặp; account-settings chỉ còn Đổi mật khẩu; Danger Zone về Profile.

**Architecture:** Thuần FE (`client/src/**`). Phần lớn là xoá file + gỡ đăng ký (route/nav/locale/constant) + 1 thao tác gộp component (Danger Zone presentational → Profile). Không đụng `server/`.

**Tech Stack:** Next.js 15 App Router, next-intl (en/vi), Playwright E2E. Làm trong worktree `client/.worktrees/account-settings-cleanup`.

> **Worktree paths:** mọi path `src/**`, `e2e/**` dưới đây nằm trong `client/.worktrees/account-settings-cleanup/`. Spec/e2e doc nằm trong `docs/.worktrees/account-settings-cleanup/specs/account-settings-cleanup/`.

---

## Task 1 (FE): Xoá trang `/security` — route, view, mock, locale, nav, route-const

**Files:**
- Delete: `src/app/[locale]/(private)/(settings)/security/` (cả folder, gồm `page.tsx`)
- Delete: `src/views/Security/` (toàn bộ folder)
- Delete: `src/mocks/Security/index.ts`
- Delete: `src/locales/en/security.json`, `src/locales/vi/security.json`
- Modify: `src/locales/en/index.ts`, `src/locales/vi/index.ts`
- Modify: `src/dataSources/Dashboard/index.ts`
- Modify: `src/constants/routes.ts`
- Modify: `src/locales/en/dashboard.json`, `src/locales/vi/dashboard.json`

- [ ] **Step 1: Xoá các file/folder của trang security**

```bash
cd client/.worktrees/account-settings-cleanup
git rm -r "src/app/[locale]/(private)/(settings)/security" src/views/Security src/mocks/Security src/locales/en/security.json src/locales/vi/security.json
```

- [ ] **Step 2: Gỡ đăng ký locale `security`** trong `src/locales/en/index.ts` và `src/locales/vi/index.ts`

Xoá dòng `import security from "./security.json";` và dòng `security,` trong object export (cả 2 file en + vi).

- [ ] **Step 3: Gỡ nav entry + type + import icon** trong `src/dataSources/Dashboard/index.ts`

Trong import lucide: bỏ `Shield` (dòng cuối danh sách `Users,\n  Shield`). Trong union `NavKey`: bỏ `| "security";` (đổi `| "team"\n  | "security";` thành `| "team";`). Trong `NAV_GROUPS` nhóm `settings`: bỏ dòng `{ key: "security", icon: Shield, href: ROUTES.SECURITY }` (và dấu phẩy của dòng `team` phía trên).

Kết quả nhóm settings:
```ts
    items: [
      { key: "profile", icon: User, href: ROUTES.PROFILE },
      { key: "accountSettings", icon: Settings, href: ROUTES.ACCOUNT_SETTINGS },
      { key: "billing", icon: CreditCard, href: ROUTES.BILLING },
      { key: "team", icon: Users, href: ROUTES.TEAM }
    ]
```

- [ ] **Step 4: Gỡ route const** — trong `src/constants/routes.ts` xoá dòng `SECURITY: "/security",`

- [ ] **Step 5: Gỡ nav label** — trong `src/locales/en/dashboard.json` và `src/locales/vi/dashboard.json`, xoá key `"security"` trong object `sidebar.nav` (en: `"security": "Security"`; vi: tương ứng). Đảm bảo JSON còn hợp lệ (không thừa dấu phẩy).

- [ ] **Step 6: Type-check + grep dead-ref**

```bash
cd client/.worktrees/account-settings-cleanup
npx tsc --noEmit
grep -rn "ROUTES.SECURITY\|views/Security\|mocks/Security\|sidebar.nav.security\|\"security\"" src
```
Expected: `tsc` PASS; grep không còn hit nào liên quan security (trừ chuỗi không liên quan).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(client): remove redundant /security settings page"
```

---

## Task 2 (FE): Dọn `/account-settings` về chỉ còn Đổi mật khẩu

**Files:**
- Modify: `src/views/AccountSettings/index.tsx`
- Delete: `src/views/AccountSettings/mains/TwoFactorCard/`, `src/views/AccountSettings/mains/ActiveSessionsCard/`, `src/views/AccountSettings/mains/DangerZoneCard/`, `src/views/AccountSettings/components/SessionRow/`
- Delete: `src/mocks/AccountSettings/index.ts`
- Modify: `src/locales/en/accountSettings.json`, `src/locales/vi/accountSettings.json`

- [ ] **Step 1: Rút gọn `src/views/AccountSettings/index.tsx`** còn:

```tsx
// components
import PageHeader from "./mains/PageHeader";
import ChangePasswordCard from "./mains/ChangePasswordCard";

const AccountSettings = () => (
  <div className="flex flex-col gap-6">
    <PageHeader />
    <ChangePasswordCard />
  </div>
);

export default AccountSettings;
```

- [ ] **Step 2: Xoá card mock + mock data**

```bash
cd client/.worktrees/account-settings-cleanup
git rm -r src/views/AccountSettings/mains/TwoFactorCard src/views/AccountSettings/mains/ActiveSessionsCard src/views/AccountSettings/mains/DangerZoneCard src/views/AccountSettings/components/SessionRow src/mocks/AccountSettings/index.ts
```

- [ ] **Step 3: Dọn locale `accountSettings` (en)** — `src/locales/en/accountSettings.json` thành:

```json
{
  "title": "Account Settings",
  "description": "Manage the password used to sign in to your account",
  "changePassword": {
    "title": "Change Password",
    "description": "Update the password used to sign in to your account",
    "fields": {
      "currentPassword": "Current Password",
      "newPassword": "New Password",
      "confirmPassword": "Confirm New Password"
    },
    "placeholders": {
      "currentPassword": "Enter current password",
      "newPassword": "Enter new password",
      "confirmPassword": "Re-enter new password"
    },
    "buttons": {
      "cancel": "Cancel",
      "save": "Update Password"
    },
    "tooltips": {
      "noChanges": "No changes to save"
    },
    "toast": {
      "success": "Password updated successfully",
      "error": "Failed to update password"
    },
    "announce": {
      "saving": "Updating password...",
      "saved": "Password updated."
    }
  }
}
```

- [ ] **Step 4: Dọn locale `accountSettings` (vi)** — `src/locales/vi/accountSettings.json` thành:

```json
{
  "title": "Cài đặt tài khoản",
  "description": "Quản lý mật khẩu dùng để đăng nhập vào tài khoản",
  "changePassword": {
    "title": "Đổi mật khẩu",
    "description": "Cập nhật mật khẩu dùng để đăng nhập vào tài khoản",
    "fields": {
      "currentPassword": "Mật khẩu hiện tại",
      "newPassword": "Mật khẩu mới",
      "confirmPassword": "Xác nhận mật khẩu mới"
    },
    "placeholders": {
      "currentPassword": "Nhập mật khẩu hiện tại",
      "newPassword": "Nhập mật khẩu mới",
      "confirmPassword": "Nhập lại mật khẩu mới"
    },
    "buttons": {
      "cancel": "Hủy",
      "save": "Cập nhật mật khẩu"
    },
    "tooltips": {
      "noChanges": "Chưa có thay đổi nào để lưu"
    },
    "toast": {
      "success": "Đã cập nhật mật khẩu thành công",
      "error": "Không thể cập nhật mật khẩu"
    },
    "announce": {
      "saving": "Đang cập nhật mật khẩu...",
      "saved": "Đã cập nhật mật khẩu."
    }
  }
}
```

- [ ] **Step 5: Verify PageHeader** — đọc `src/views/AccountSettings/mains/PageHeader/index.tsx`, đảm bảo chỉ dùng `accountSettings.title` + `accountSettings.description` (không tham chiếu namespace đã xoá). Nếu có ref tới `twoFactor/sessions/dangerZone` → sửa.

- [ ] **Step 6: Type-check + grep**

```bash
npx tsc --noEmit
grep -rn "accountSettings.twoFactor\|accountSettings.sessions\|accountSettings.dangerZone\|ACTIVE_SESSIONS_MOCK\|TwoFactorCard\|ActiveSessionsCard\|SessionRow" src
```
Expected: `tsc` PASS; grep không còn hit.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(client): trim account-settings to real Change Password only"
```

---

## Task 3 (FE): Gộp Danger Zone presentational vào Profile, xoá shared component

**Files:**
- Modify: `src/views/Profile/mains/DangerZoneCard/index.tsx`
- Delete: `src/components/DangerZoneCard/`

- [ ] **Step 1: Gộp presentational + i18n vào `src/views/Profile/mains/DangerZoneCard/index.tsx`**

```tsx
"use client";

// libs
import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import CustomButton from "@/components/CustomButton";

const DangerZoneCard = () => {
  const t = useTranslations("profile.dangerZone");
  const items: { title: string; description: string; action: ReactNode }[] = [
    {
      title: t("delete.title"),
      description: t("delete.description"),
      action: (
        <CustomButton variant="destructive" size="sm">
          {t("delete.button")}
        </CustomButton>
      )
    }
  ];

  return (
    <Card className="border-destructive/40" aria-labelledby="danger-zone-title">
      <CardHeader className="border-destructive/30 border-b">
        <div className="flex items-center gap-2">
          <TriangleAlert
            className="text-destructive size-4"
            aria-hidden="true"
          />
          <h3
            id="danger-zone-title"
            className="text-destructive text-base leading-none font-semibold"
          >
            {t("title")}
          </h3>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">
                {item.title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {item.description}
              </p>
            </div>
            {item.action}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DangerZoneCard;
```

- [ ] **Step 2: Xoá shared component**

```bash
cd client/.worktrees/account-settings-cleanup
git rm -r src/components/DangerZoneCard
```

- [ ] **Step 3: Type-check + grep dead-ref**

```bash
npx tsc --noEmit
grep -rn "@/components/DangerZoneCard\|SharedDangerZoneCard" src
```
Expected: `tsc` PASS; grep 0 hit.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(client): inline danger zone into profile, drop shared component"
```

---

## Task 4 (FE): Green-check gate toàn cục

- [ ] **Step 1: Format + Lint + Build**

```bash
cd client/.worktrees/account-settings-cleanup
yarn format
yarn lint
yarn build
```
Expected: lint 0 error; `next build` PASS (đã bao gồm type-check). Build PASS = không còn missing i18n message reference / orphan import.

- [ ] **Step 2: Fix nếu fail** — lint/build fail thì sửa (systematic-debugging) rồi chạy lại Step 1 từ đầu. Re-read file sau khi `yarn format`/`yarn lint --fix` đổi.

- [ ] **Step 3: Commit nếu có thay đổi do format/lint**

```bash
git add -A
git commit -m "chore(client): format & lint fixes for account-settings cleanup" || echo "nothing to commit"
```

---

## Task 5 (E2E): Viết test cho Scenario Matrix + `e2e.md`

**Files:**
- Create: `client/e2e/account-settings-cleanup/cleanup.e2e.ts`
- Create: `docs/.worktrees/account-settings-cleanup/specs/account-settings-cleanup/e2e.md`

- [ ] **Step 1: Học convention E2E hiện có** — đọc `client/playwright.config.ts`, `client/e2e/auth.setup.ts`, `client/e2e/helpers/`, và 1 spec mẫu (vd `client/e2e/login-history/*.e2e.ts`) để biết: project nào dùng storageState, cách set locale (en/vi), base URL, helper điều hướng.

- [ ] **Step 2: Viết `client/e2e/account-settings-cleanup/cleanup.e2e.ts`** phủ các scenario (mirror import/auth theo Step 1). Phủ:
  - **F1 Route removal**: `goto('/security')` và `goto('/vi/security')` → trang `not-found` (assert dùng dấu hiệu not-found của app: heading 404 / text not-found — xác định từ `app/[locale]/not-found.tsx`).
  - **F2 Nav integrity**: ở `/account-settings`, sidebar nhóm settings KHÔNG có link "Security"; vẫn có Profile / Account Settings / Billing / Team; click 1 link còn lại điều hướng đúng.
  - **#1 Happy path**: `/account-settings` render heading Change Password; KHÔNG render "Active Sessions" / "Two-Factor" / "Danger Zone". `/profile` render Danger Zone heading.
  - **#9 i18n**: lặp #1 ở cả `en` (`/account-settings`) và `vi` (`/vi/account-settings`); assert string đúng theo locale; không có console error "MISSING_MESSAGE".
  - **#2 AuthN**: context chưa đăng nhập (không storageState) `goto('/account-settings')` → redirect `/login` (theo pattern AuthGuard hiện có).

  Selector ưu tiên role/label (`getByRole('heading', { name: ... })`, `getByRole('navigation')`). KHÔNG sửa app code để chiều test (gặp lỗi a11y → flag follow-up).

- [ ] **Step 3: Viết `e2e.md`** — copy Scenario Matrix từ `design.md` §6 + ghi rõ scenario nào đã thành test, scenario N/A, và follow-up nếu có.

- [ ] **Step 4: Chạy gate A**

```bash
cd client/.worktrees/account-settings-cleanup
yarn e2e account-settings-cleanup
```
Expected: PASS. (Tiền đề app-running + gate B MCP walk theo CLAUDE.md §4.3 do main loop điều phối ở bước E2E.)

- [ ] **Step 5: Commit**

```bash
# client repo
git add e2e/account-settings-cleanup
git commit -m "test(client): e2e for account-settings cleanup (route removal, nav, i18n)"
# docs repo
cd docs/.worktrees/account-settings-cleanup
git add specs/account-settings-cleanup/e2e.md
git commit -m "docs(account-settings-cleanup): add e2e scenario doc"
```

---

## Self-Review (đã chạy khi viết plan)

- **Spec coverage**: §3 inventory A→Task1, B→Task2, D→Task3; §5 green/dead-ref→Task4; §6 matrix→Task5. ✅ đủ.
- **Placeholder scan**: locale JSON + index.tsx + Profile DangerZone có code đầy đủ; E2E task chỉ rõ scenario + assertion (selector cụ thể hoá sau khi đọc helper ở Step 1 — không phải placeholder logic).
- **Type consistency**: `NavKey` bỏ `"security"` đồng bộ với việc xoá entry; `profile.dangerZone` i18n key giữ nguyên (Profile đã dùng namespace này từ trước).
