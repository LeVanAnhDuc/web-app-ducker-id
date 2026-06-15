# Unified Control Sizing System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết lập hệ thống chiều cao control thống nhất (input + button) 36/40/48px với cây quyết định vai trò→size, encode ở lớp `Custom*`, và refactor toàn bộ control hiện có cho khớp.

**Architecture:** Giữ `src/components/ui/*` (shadcn) bất biến; encode height+text mỗi size ở lớp `CustomButton` (map trong `dataSources/Common`) và các `Custom*` input wrapper. Đổi default `CustomButton` `lg`→`default` (tự kéo mọi button về 40px/14px). Refactor usage theo cây quyết định, chỉ set size khi role lệch default.

**Tech Stack:** Next.js 15 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + class-variance-authority + tailwind-merge (`cn`).

**Repos:** code ở worktree `client/.worktrees/control-sizing-system`; design system ở `.claude/.worktrees/control-sizing-system/uiux`; spec ở `docs/.worktrees/control-sizing-system`.

**Cây quyết định vai trò → size (áp cho MỌI task refactor):**
1. Trong form (input 40px) / primary submit full-width của form/auth → **`default`** (40px) — KHÔNG set size (đã là default) + xoá mọi `h-*`/`text-*` ép.
2. Vùng dày (table row, toolbar, filter, chip, action phụ trong list/card) → **`size="sm"`** (36px).
3. Còn lại (dialog confirm/cancel, card CTA chính, page-header action) → **`default`** (40px).
4. Icon-only → pair tier vùng: `icon-sm`(dày) / `icon`(thường) / `icon-lg`(cạnh lg); **bắt buộc `aria-label`**.
5. `lg` (48px) chỉ cho hero CTA hiếm.
Cấm hardcode `h-*` hoặc `text-*` lên control để ép kích thước (trừ width như `w-full`/`size-8` toggle inline có chủ đích).

**Lệnh verify chuẩn (chạy trong `client/.worktrees/control-sizing-system`):**
- Lint file đụng: `yarn lint` (hoặc `npx eslint <files>`), `npx prettier --write <files>`.
- Type+build cuối: `yarn build`.
- Grep sạch: không còn `h-12`/`h-11`/`h-14` trên button/input control (trừ allow-list nêu ở Task 11).

---

### Task 1: Foundation — control-size tokens (component layer)

**Files:**
- Modify: `src/dataSources/Common/index.ts`
- Modify: `src/components/CustomButton/index.tsx`
- Modify: `src/components/CustomInput/index.tsx`
- Modify: `src/components/CustomSelectTrigger/index.tsx`
- Modify: `src/components/OtpInputGroup/index.tsx`

- [ ] **Step 1: Mở rộng size map trong `dataSources/Common/index.ts`**

Đổi `BUTTON_SIZE_TEXT_CLASSES` → `BUTTON_SIZE_CLASSES` (gồm height + text), giữ block `ColorVariant`/`DISABLED_CLASSES` nguyên:

```ts
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 text-xs",
  default: "h-10 text-sm",
  lg: "h-12 text-base",
  icon: "size-10",
  "icon-sm": "size-9",
  "icon-lg": "size-12"
};
```

- [ ] **Step 2: Cập nhật `CustomButton/index.tsx`** — đổi default size + dùng map mới

```tsx
// dataSources
import { BUTTON_SIZE_CLASSES } from "@/dataSources/Common";
```
```tsx
const CustomButton = ({
  className,
  loading,
  variant = "default",
  size = "default",
  fullWidth,
  iconRight,
  iconLeft,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    iconRight?: ReactNode;
    iconLeft?: ReactNode;
    fullWidth?: boolean;
  }) => (
  <ButtonUI
    className={cn(
      "hover:cursor-pointer",
      BUTTON_SIZE_CLASSES[size ?? "default"],
      {
        "w-full": fullWidth
      },
      className
    )}
    disabled={loading || props.disabled}
    variant={variant}
    size={size}
    {...props}
  >
    {loading ? <Spinner /> : iconLeft}
    {props.children}
    {iconRight}
  </ButtonUI>
);
```

- [ ] **Step 3: `CustomInput/index.tsx`** — `h-12` → `h-10`

Đổi base class: `"border-input bg-background focus:border-ring focus:ring-ring h-12 rounded-lg px-4 transition-colors duration-200"` → thay `h-12` bằng `h-10`. Không đổi gì khác.

- [ ] **Step 4: `CustomSelectTrigger/index.tsx`** — `!h-12` → `!h-10`

Đổi `cn("!h-12 w-full", className)` → `cn("!h-10 w-full", className)`.

- [ ] **Step 5: `OtpInputGroup/index.tsx`** — slot 56 → 48px

Đổi slot `className="h-14 w-12 text-xl"` → `className="h-12 w-12 text-xl"` (48² square, giữ text-xl cho dễ đọc số).

- [ ] **Step 6: Verify** — `npx prettier --write` 5 file trên; `yarn lint`. Expected: no errors. (Build chạy ở Task 11.)

- [ ] **Step 7: Commit**

```bash
git add src/dataSources/Common/index.ts src/components/CustomButton src/components/CustomInput src/components/CustomSelectTrigger src/components/OtpInputGroup
git commit -m "refactor(client): unified control size tokens (36/40/48), CustomButton default=default"
```

---

### Task 2: Xoá `h-12` ép trên auth button (về 40px standard)

**Files (đã xác minh grep `h-12`):**
- Modify: `src/views/Logins/Login/components/NextButton/index.tsx`
- Modify: `src/views/Logins/LoginPassword/mains/PasswordStepForm/index.tsx`
- Modify: `src/views/Signups/SignupInfo/components/SubmitButton/index.tsx`
- Modify: `src/views/ForgotPasswords/ForgotPasswordReset/mains/ForgotPasswordResetForm/index.tsx`
- Modify: `src/components/ResendButton/index.tsx`
- Modify: `src/views/Logins/Login/mains/SocialAuthenButtons/index.tsx`

- [ ] **Step 1:** Mỗi file: xoá `h-12` khỏi `className` của `<CustomButton>`/`<Button>`. Giữ nguyên các class khác (`fullWidth`, `border-input`, `justify-between`, `transition-colors`…). Nếu sau khi xoá `className` rỗng → bỏ luôn prop `className`. KHÔNG thêm `size` (default = 40px standard).
- [ ] **Step 2: Verify** — grep `h-12` trên 6 file: phải sạch. `npx prettier --write` + `yarn lint` các file. Expected: no `h-12`, no lint error.
- [ ] **Step 3: Commit**

```bash
git add src/views/Logins src/views/Signups src/views/ForgotPasswords src/components/ResendButton
git commit -m "refactor(client): auth buttons to 40px standard (remove h-12 override)"
```

---

### Task 3: Refactor area — Auth views & auth-shared

**Files:**
- `src/views/Logins/LoginAlternative/mains/LoginOptionContactAdmin/index.tsx`
- `src/views/Logins/LoginAlternative/components/LoginOptionCardButton/index.tsx`
- `src/views/ForgotPasswords/ForgotPassword/mains/RecoveryOptionContactAdmin/index.tsx`
- `src/views/ForgotPasswords/ForgotPassword/components/RecoveryOptionCardButton/index.tsx`
- `src/components/AuthOptionCard/AuthOptionCardButton/index.tsx`

- [ ] **Step 1:** Trong mỗi file, audit từng `<CustomButton>` theo cây quyết định. Lưu ý: các *OptionCardButton này là card lựa chọn nhiều dòng dùng `h-auto py-4` — **giữ `h-auto py-4`** (đó là layout đa dòng có chủ đích, KHÔNG phải ép chiều cao control 1 dòng), nhưng xoá mọi `h-12`/`text-*` ép cỡ chữ nếu có. Button submit/CTA full-width → default (40px). Bỏ `size="lg"` nếu chỉ để lấy chữ 16px.
- [ ] **Step 2: Verify** — `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): auth-shared option buttons follow control sizing`

---

### Task 4: Refactor area — Admin tables & row actions (dày → sm/icon-sm)

**Files:**
- `src/views/AdminApps/components/AppRowActions/index.tsx`
- `src/views/AdminUsers/components/UserRowActions/index.tsx`
- `src/views/AdminEntitlements/components/GrantToggleButton/index.tsx`
- `src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx`
- `src/views/AdminContact/mains/AdminContactTable/index.tsx`
- `src/views/AdminContactDetail/mains/ContactAttachments/index.tsx`
- `src/views/MyContacts/mains/MyContactsTable/index.tsx`

- [ ] **Step 1:** Row-action text button → `size="sm"` (36px). Row menu trigger / icon trong row → `size="icon-sm"` + `aria-label` (i18n). GrantToggleButton (toggle trong cell) → `size="sm"`. Bỏ mọi `h-*`/`text-*` ép.
- [ ] **Step 2: Verify** — `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): admin table row actions to compact (sm/icon-sm)`

---

### Task 5: Refactor area — Admin toolbars / filters / headers

**Files:**
- `src/views/AdminApps/mains/AdminAppsToolbar/index.tsx`
- `src/views/AdminApps/mains/AdminAppsHeader/index.tsx`
- `src/views/AdminUsers/mains/AdminUsersToolbar/index.tsx`
- `src/views/AdminContact/mains/AdminContactFilters/index.tsx`
- `src/views/AdminLoginHistory/mains/AdminLoginHistoryFilters/index.tsx`
- `src/views/AdminEntitlements/mains/AdminEntitlementsToolbar/index.tsx`
- `src/views/LoginHistory/mains/LoginHistoryFilters/index.tsx`

- [ ] **Step 1:** Button trong toolbar/filter (filter/clear/add) → `size="sm"` (36px). **Input trong toolbar/filter**: xoá `!h-12`/`h-12` (qua `inputClassName`) → để input về 40px standard (đơn giản, đồng nhất). Page-header primary action (vd "Create app" ở AdminAppsHeader) → `default` (40px). Icon-only → pair + `aria-label`.
- [ ] **Step 2: Verify** — grep `h-12` trên các file: sạch. `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): admin toolbars/filters control sizing (sm buttons, 40px inputs)`

---

### Task 6: Refactor area — Admin dialogs & forms

**Files:**
- `src/views/AdminUsers/mains/AdminUsersResetPasswordDialog/index.tsx`
- `src/views/AdminUsers/mains/AdminUsersLockDialog/index.tsx`
- `src/views/AdminUsers/mains/AdminUsersForceLogoutDialog/index.tsx`
- `src/views/AdminEntitlements/mains/AdminEntitlementsRevokeDialog/index.tsx`
- `src/views/AdminApps/mains/AdminAppsSecretDialog/index.tsx`
- `src/views/AdminApps/mains/AdminAppsHideDialog/index.tsx`
- `src/views/AdminApps/mains/AdminAppsFormSheet/index.tsx`
- `src/views/AdminApps/components/StringListField/index.tsx`
- `src/views/AdminApps/components/SecretField/index.tsx`

- [ ] **Step 1:** Dialog confirm + cancel → `default` (40px) — bỏ `size="sm"` lệch nếu có (vd FormSheet cancel đang `sm`). **KHÔNG đổi variant** (giữ destructive/default/outline hiện tại — ngoài phạm vi). FormSheet submit (có input 40px) → `default`. StringListField/SecretField: input → 40px (xoá `h-12`), nút remove icon → `icon-sm` + `aria-label`.
- [ ] **Step 2: Verify** — grep `h-12` các file: sạch. `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): admin dialogs/forms control sizing (default actions, 40px inputs)`

---

### Task 7: Refactor area — Dashboard (Home / Apps / Favorites / RecentlyUsed / Notifications)

**Files:**
- `src/views/Home/mains/RecommendedSection/index.tsx`, `src/views/Home/mains/GreetingSection/index.tsx`
- `src/views/Home/components/RecommendedAppCard/index.tsx`, `src/views/Home/components/QuickAccessCard/index.tsx`
- `src/views/Apps/mains/AppsBoard/index.tsx`, `src/views/Apps/components/CategoryFilter/index.tsx`
- `src/views/Favorites/mains/FavoritesGrid/index.tsx`
- `src/views/RecentlyUsed/mains/HistoryList/index.tsx`, `src/views/RecentlyUsed/components/RecentAppRow/index.tsx`
- `src/views/Notifications/mains/PageHeader/index.tsx`, `src/views/Notifications/mains/NotificationList/index.tsx`, `src/views/Notifications/components/NotificationItem/index.tsx`

- [ ] **Step 1:** "See all"/nav phụ trong card, filter chip, row inline → `size="sm"`. View-toggle/close icon → `icon-sm` (dày) hoặc `icon` (header) + `aria-label`. CTA chính của card → `default`. Bỏ mọi `h-*`/`text-*` ép. NotificationItem close button đang `size="icon"` (40²) trong card dày → đổi `icon-sm` (36²).
- [ ] **Step 2: Verify** — `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): dashboard views control sizing`

---

### Task 8: Refactor area — Account / Profile / Security / Billing / Team / Settings

**Files:**
- `src/views/Team/mains/TeamMembersCard/index.tsx`, `src/views/Team/components/TeamMemberRow/index.tsx`, `src/views/Team/components/PendingInvitationRow/index.tsx`
- `src/views/Security/mains/DangerZoneCard/index.tsx`, `src/views/Security/mains/ApiKeysCard/index.tsx`, `src/views/Security/components/ApiKeyRow/index.tsx`
- `src/views/Profile/mains/DangerZoneCard/index.tsx`, `src/views/Profile/components/PersonalInfoForm/index.tsx`, `src/views/Profile/components/ConnectedAccountRow/index.tsx`
- `src/views/Billing/mains/PaymentMethodCard/index.tsx`, `src/views/Billing/mains/BillingHistoryCard/index.tsx`, `src/views/Billing/mains/CurrentPlanCard/index.tsx`, `src/views/Billing/components/PaymentMethodRow/index.tsx`
- `src/views/AccountSettings/mains/DangerZoneCard/index.tsx`, `src/views/AccountSettings/mains/ChangePasswordCard/index.tsx`, `src/views/AccountSettings/components/SessionRow/index.tsx`

- [ ] **Step 1:** Row action (member/session/account/payment row) → `size="sm"` (+`aria-label` nếu icon). Card CTA chính / DangerZone action → `default`. Form trong card (PersonalInfoForm, ChangePasswordCard) → input 40px (xoá `h-12` nếu có) + submit `default`. Bỏ mọi `h-*`/`text-*` ép.
- [ ] **Step 2: Verify** — `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): account/profile/security/billing/team control sizing`

---

### Task 9: Refactor area — Shared components & layouts

**Files:**
- `src/layouts/AppHeader/index.tsx`, `src/layouts/AppHeader/components/NotificationPanel/index.tsx`
- `src/components/UserMenu/index.tsx`
- `src/components/SupportDialog/mains/SupportSuccess/index.tsx`, `src/components/SupportDialog/components/SubmitButton/index.tsx`
- `src/components/CustomSidebar/components/CollapseToggle/index.tsx`
- `src/components/FavoriteButton/index.tsx`, `src/components/CategoryChip/index.tsx`, `src/components/AppCard/index.tsx`, `src/components/CustomDateInput/index.tsx`

- [ ] **Step 1:** Header nav icon (menu/bell/search) → `size="icon"` (40²) + `aria-label`. UserMenu avatar trigger → giữ `icon`/rounded-full hiện có. SupportDialog submit → `default`. Chip/AppCard inline CTA → `sm`. CustomDateInput calendar trigger → `icon-sm` + `aria-label` (nếu thiếu). Bỏ mọi `h-*`/`text-*` ép.
- [ ] **Step 2: Verify** — `npx prettier --write` + `yarn lint`. Expected: no errors.
- [ ] **Step 3: Commit** `refactor(client): shared components & layouts control sizing`

---

### Task 10: aria-label sweep cho icon-only button

**Files:** toàn `src/` (verify-and-fix).

- [ ] **Step 1:** Grep `size="icon"` / `size="icon-sm"` / `size="icon-lg"` trên `src/`. Với mỗi icon-only button (không có text con), kiểm tra có `aria-label` không. **Chỉ thêm** cho chỗ thiếu; string qua i18n (thêm key vào `src/locales/en/*` + `src/locales/vi/*` namespace tương ứng — KHÔNG hardcode). Bỏ qua chỗ đã có (vd PasswordInput đã có).
- [ ] **Step 2: Verify** — `npx prettier --write` các file đụng + `yarn lint`. Expected: no errors; mọi icon-only button có `aria-label`.
- [ ] **Step 3: Commit** `a11y(client): aria-label for icon-only buttons missing it`

---

### Task 11: Final verify (FE green gate)

**Files:** none (verification).

- [ ] **Step 1: Grep sạch control overrides** — trong `src/`, grep `h-12`/`h-11`/`h-14`. **Allow-list hợp lệ** (không phải button/input control): icon-container `h-12 w-12` trong RecoveryOptionCard/AuthOptionCardBody/LoginOptionCard (icon box), Skeleton `h-12/h-14 rounded-lg`, table header cell `h-12` (`ui/table.tsx`), `ui/sidebar.tsx` (shadcn). Mọi hit còn lại trên `<CustomButton>`/`<CustomInput>`/control phải = 0.
- [ ] **Step 2: Build** — `yarn build`. Expected: build success, no type error.
- [ ] **Step 3: Lint toàn bộ** — `yarn lint`. Expected: no error. (Nếu `.worktrees` gây nhiễu repo-wide → lint scope `src/` theo [[reference_worktrees_lint_noise]].)
- [ ] **Step 4:** Không commit (verification-only). Báo kết quả.

---

### Task 12: Tài liệu hoá design system (repo `.claude/` + `client/`)

**Files:**
- Modify: `.claude/.worktrees/control-sizing-system/uiux/frontend-reference.md`
- Modify: `.claude/.worktrees/control-sizing-system/uiux/design-guide.md`
- Modify: `client/.worktrees/control-sizing-system/.claude/rules/components.md`

- [ ] **Step 1: `frontend-reference.md`** — cập nhật:
  - §5 Spacing → bảng "Form Fields": `Button default px-4 h-10`, `Button sm px-3 h-9`, `Button lg px-6 h-12`, `CustomInput h-10 px-4`.
  - §6 Button → bảng Sizes: `default h-10`, `sm h-9 px-3`, `lg h-12 px-6`, `icon size-10`, `icon-sm size-9`, `icon-lg size-12`. Ghi: **CustomButton default = `default`** (40px/14px); height+text per size sống ở `BUTTON_SIZE_CLASSES` (`dataSources/Common`), KHÔNG ở `ui/button.tsx`. Text: `sm→text-xs`, `default→text-sm`, `lg→text-base`.
  - §8 Input → CustomInput `h-10 rounded-lg px-4`; CustomSelectTrigger `!h-10`; OTP slot `h-12 w-12`.

- [ ] **Step 2: `design-guide.md`** — thêm mục **§5.5 "Chọn size control đúng"**: thang 3 tier (compact 36 / standard 40 / large 48; input=button cùng thang) + cây quyết định vai trò→size (5 điểm như header plan) + quy tắc "cỡ chữ đi kèm size, cấm hardcode h-*/text-* trên control".

- [ ] **Step 3: `client/.claude/rules/components.md`** — thêm subsection "## Control sizing convention": thang 36/40/48, default CustomButton=`default`, cây quyết định ngắn, "muốn cỡ khác → đổi `size`, không hardcode `h-*`/`text-*`", trỏ về `.claude/uiux/` là source of truth.

- [ ] **Step 4: Commit (2 repo riêng)**

```bash
# repo .claude
cd /d/Learn/web-app-store-server-client/.claude/.worktrees/control-sizing-system
git add uiux/frontend-reference.md uiux/design-guide.md
git commit -m "docs(uiux): unified control sizing system (36/40/48) + role→size decision tree"
# repo client
cd /d/Learn/web-app-store-server-client/client/.worktrees/control-sizing-system
git add .claude/rules/components.md
git commit -m "docs(client): control sizing convention in components rule"
```

---

### Task 13: CLAUDE.md drift audit (4.6) + visual sign-off

- [ ] **Step 1:** Dispatch `claude-md-improver` (hoặc audit thủ công) trên `client/.claude/CLAUDE.md` — chỉ bắt drift cụ thể (convention/struct lệch do thêm "Control sizing convention"). Non-blocking; áp đề xuất nếu hợp lý.
- [ ] **Step 2: Visual sign-off** — chụp screenshot trang thật trước/sau (auth login, 1 admin table, 1 dialog) để xác nhận thị giác (chiều cao control gọn lại, không vỡ layout). (App-running tiền đề; nếu chưa chạy → khởi động worktree theo runner.)
- [ ] **Step 3:** Báo trạng thái tổng + chuẩn bị `finishing-a-development-branch` → PR per-repo (client / .claude / docs).

---

## Self-Review

**Spec coverage:** §3.1 thang → Task 1+12. §3.2 button map+default → Task 1. §3.3 input → Task 1 (+ toolbar inputs Task 5, form inputs Task 6/8). §3.4 cây quyết định → Task 2-9 (rule trong header). §3.5 cấm hardcode → verify Task 11. §4 component code → Task 1. §5 refactor usage → Task 2-9. §6 docs → Task 12. §8 process (E2E/Pencil/security skip) → đã quyết trong design, không cần task. Green checks → Task 11. Drift audit → Task 13.

**Placeholder scan:** Task refactor area dùng RULE + file-list thay vì diff từng nút (73 file) — đây là chủ ý cho refactor rule-governed, không phải placeholder; mỗi task có file path chính xác + tiêu chí verify (grep/lint) cụ thể. Foundation (Task 1) + docs (Task 12) có code/nội dung đầy đủ.

**Type consistency:** `BUTTON_SIZE_CLASSES` (Task 1) — tên dùng nhất quán ở CustomButton import. `ButtonSize` type giữ nguyên. Map keys khớp `VariantProps<typeof buttonVariants>["size"]`.
