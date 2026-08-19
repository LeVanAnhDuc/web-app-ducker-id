# Trim `/profile` Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify `/profile` by removing the redundant disabled Email input and deleting the Connected Accounts + Notification Preferences sections entirely.

**Architecture:** FE-only. Remove one `FormItem` and reflow the `PersonalInfoForm` grid; delete two `mains/` cards + their molecule components; prune their mocks, types, and i18n namespaces; reconcile the existing `profile-account-merge` E2E suite.

**Tech Stack:** Next.js 15, React 19, TypeScript, next-intl, Playwright.

## Global Constraints

- Convention source of truth: `client/.claude/CLAUDE.md` + `client/.claude/rules/*`.
- No hard-coded strings; i18n via `next-intl` namespaces (`en` + `vi` in lockstep).
- View files ≤ 200 lines; component = one folder with `index.tsx`, single default export.
- Green-checks gate before PR: `cd client && yarn lint && yarn build`.
- Work happens in worktree `client/.worktrees/profile-trim` (branch `chore/profile-trim`).
- Commit review is opted-out this session → commit per-task without pausing.

---

### Task 1: Remove Email input + reflow PersonalInfoForm grid

**Files:**
- Modify: `client/src/views/Profile/components/PersonalInfoForm/index.tsx`

**Interfaces:**
- Consumes: `profile: MyProfileResponse` prop (unchanged — still needed by `mapProfileToFormValues`).
- Produces: nothing new.

- [ ] **Step 1: Remove the Email `FormItem` block and reflow the grid.**

Replace the two grid rows (current lines 113-135, the `Email | Phone` row through the `DateOfBirth | Gender` row) with:

```tsx
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
  <PhoneField control={methods.control} isPending={isPending} />
  <GenderField control={methods.control} isPending={isPending} />
</div>
<AddressField control={methods.control} isPending={isPending} />
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
  <DateOfBirthField control={methods.control} isPending={isPending} />
</div>
```

Resulting field order: `First | Last` → `Phone | Gender` → `Address` (full) → `Date of Birth` (left half, right empty).

- [ ] **Step 2: Remove now-unused imports.**

Delete these import lines (only used by the removed Email block):
- `import { FormItem, FormLabel } from "@/components/ui/form";`
- `import CustomInput from "@/components/CustomInput";`

- [ ] **Step 3: Verify no other reference.**

Run: `grep -n "FormItem\|FormLabel\|CustomInput\|profile.email" client/src/views/Profile/components/PersonalInfoForm/index.tsx`
Expected: no matches.

- [ ] **Step 4: Commit.**

```bash
git add src/views/Profile/components/PersonalInfoForm/index.tsx
git commit -m "refactor(profile): remove redundant email input, pair phone with gender"
```

---

### Task 2: Delete Connected Accounts + Notification Preferences

**Files:**
- Delete dir: `client/src/views/Profile/mains/ConnectedAccountsCard/`
- Delete dir: `client/src/views/Profile/mains/NotificationPreferencesCard/`
- Delete dir: `client/src/views/Profile/components/ConnectedAccountRow/`
- Delete dir: `client/src/views/Profile/components/NotificationToggleRow/`
- Modify: `client/src/views/Profile/index.tsx`
- Modify: `client/src/mocks/Profile/index.ts`
- Modify: `client/src/types/Profile/index.ts`
- Modify: `client/src/locales/en/account.json`
- Modify: `client/src/locales/vi/account.json`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing.

- [ ] **Step 1: Delete the four component folders.**

```bash
rm -rf src/views/Profile/mains/ConnectedAccountsCard \
       src/views/Profile/mains/NotificationPreferencesCard \
       src/views/Profile/components/ConnectedAccountRow \
       src/views/Profile/components/NotificationToggleRow
```

- [ ] **Step 2: Update `views/Profile/index.tsx`.**

Remove the two imports and two render lines. Final file:

```tsx
// components
import PageHeader from "./mains/PageHeader";
import ProfileCard from "./mains/ProfileCard";
import PersonalInfoCard from "./mains/PersonalInfoCard";
import ChangePasswordCard from "./mains/ChangePasswordCard";
import DangerZoneCard from "./mains/DangerZoneCard";

const Profile = () => (
  <div className="flex flex-col gap-6">
    <PageHeader />
    <ProfileCard />
    <PersonalInfoCard />
    <ChangePasswordCard />
    <DangerZoneCard />
  </div>
);

export default Profile;
```

- [ ] **Step 3: Prune `mocks/Profile/index.ts`.**

Remove `CONNECTED_ACCOUNTS_MOCK` + `NOTIFICATION_PREFS_MOCK` and unused imports. Final file:

```ts
// types
import type { ProfileStatsMock } from "@/types/Profile";

export const PROFILE_STATS_MOCK: ProfileStatsMock = {
  appsCount: 12,
  teamsCount: 3,
  planName: "Pro"
};
```

- [ ] **Step 4: Prune `types/Profile/index.ts`.**

Remove `ConnectedAccountKey`, `ConnectedAccountMock`, `NotificationPrefKey`, `NotificationPrefMock`, and the now-unused `LucideIcon` import. Final file:

```ts
export interface ProfileStatsMock {
  appsCount: number;
  teamsCount: number;
  planName: string;
}
```

- [ ] **Step 5: Remove i18n namespaces (en + vi).**

In both `client/src/locales/en/account.json` and `client/src/locales/vi/account.json`:
- Delete the entire `"connectedAccounts": { ... }` object.
- Delete the entire `"notificationPreferences": { ... }` object.
- Inside `"personalInfo"`, delete `"email"` from both `"fields"` and `"placeholders"` (the input is gone).

- [ ] **Step 6: Verify no dangling references.**

Run: `grep -rn "ConnectedAccount\|NotificationPref\|NOTIFICATION_PREFS_MOCK\|CONNECTED_ACCOUNTS_MOCK\|connectedAccounts\|notificationPreferences" client/src`
Expected: no matches (signup.json has its own unrelated keys — confirm none match these tokens).

- [ ] **Step 7: Commit.**

```bash
git add -A
git commit -m "feat(profile): remove connected accounts and notification preferences sections"
```

---

### Task 3: Reconcile `profile-account-merge` E2E suite

**Files:**
- Modify: `client/e2e/profile-account-merge/merge.e2e.ts`
- Modify: `docs/specs/profile-account-merge/e2e.md` (docs repo worktree)

**Interfaces:**
- Consumes: nothing.
- Produces: updated regression assertions.

- [ ] **Step 1: Update the happy-path test in `merge.e2e.ts` (Row 1).**

Replace the `renders all six sections` test body so it (a) asserts only the four remaining headings visible, and (b) asserts the two removed headings are absent:

```tsx
test("renders remaining sections on /profile in one page", async ({ page }) => {
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: EN.title, exact: true })
  ).toBeVisible();
  for (const name of [
    EN.personalInfo,
    EN.changePassword,
    EN.dangerZone
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: EN.connectedAccounts })
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: EN.notificationPreferences })
  ).toHaveCount(0);
});
```

Keep the `EN.connectedAccounts` / `EN.notificationPreferences` constants (now used by the absence assertions).

- [ ] **Step 2: Update `docs/specs/profile-account-merge/e2e.md` Row 1.**

Change Row 1 wording from "All six card sections render" to reflect the trim: four sections render (title + personalInfo + changePassword + dangerZone); connectedAccounts + notificationPreferences asserted absent. Add a one-line note referencing `docs/specs/profile-trim/` as the change source.

- [ ] **Step 3: Commit (client repo).**

```bash
git add e2e/profile-account-merge/merge.e2e.ts
git commit -m "test(profile): reconcile merge e2e after removing two sections"
```

Docs `e2e.md` change is committed in the docs worktree alongside the profile-trim design/plan.

---

## E2E Dual-Gate (§4.3) — after Task 3

Run the reconciled suite scoped to the feature on the live app (self-check app running first):
- **Gate A:** `cd client && yarn e2e profile-account-merge`
- **Gate B:** MCP walk of the reconciled Row 1 + i18n scenarios (read/render only — no mutation).

Both PASS → proceed to green-checks gate + PR.

## Green-Checks Gate (§4.7)

```bash
cd client && yarn lint && yarn build
```

Must be green before `creating-github-pr`.

## Self-Review

- **Spec coverage:** design §2.1 → Task 1; §2.2 + §2.3 + §2.4 → Task 2; §4 E2E reconcile → Task 3. All covered.
- **Placeholder scan:** none.
- **Type consistency:** `ProfileStatsMock` retained and matches `mocks/Profile` usage; removed types have no remaining consumers (Task 2 Step 6 guard).
