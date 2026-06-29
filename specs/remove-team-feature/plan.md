# Remove Team (collaboration placeholder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the mock-only Team (`/team`) collaboration placeholder from the FE entirely, and codify "Team collaboration" as a definitive Non-Goal in `project-goals.md`.

**Architecture:** Pure deletion + reference cleanup. The Settings sidebar renders dynamically from `NAV_GROUPS`, so dropping the dataSources nav entry auto-removes the link — no sidebar component edit. Verification is `next build` (type-checks dangling refs), `yarn lint`, a grep audit, and a negative-assertion E2E suite (Team absent, `/team` not-found, i18n en+vi clean).

**Tech Stack:** Next.js 15 / React 19 / TypeScript, next-intl, Playwright E2E.

## Global Constraints

- **Branch / isolation**: `chore/remove-team-feature` worktrees already created for `client/` and `docs/` from `origin/main`. All edits happen in those worktrees.
- **No new behavior**: this is a removal — do not add redirects, replacement pages, or new copy.
- **i18n**: every locale file edit applies to BOTH `en/` and `vi/`. JSON must stay valid (mind trailing commas).
- **FE convention**: obey `client/.claude/CLAUDE.md` — after FE edits run `yarn format && yarn lint && npx tsc --noEmit` (or `yarn build`); fix all errors before handing off.
- **`team` i18n namespace** (`team.json`) is consumed ONLY in `views/Team/**`; the Settings nav label is a different key `dashboard.sidebar.nav.team`. Both go away.
- **Scope guard**: do NOT touch the Billing placeholder or any non-Team file.

---

### Task 1: FE — remove Team feature + all references

**Files:**
- Delete (folders/files):
  - `client/src/views/Team/` (entire folder: `index.tsx`, `mains/{PageHeader,TeamMembersCard,PendingInvitationsCard,RolesCard}/`, `components/{TeamMemberRow,PendingInvitationRow,RoleBadge,RoleDefinitionRow}/`)
  - `client/src/types/Team/index.ts`
  - `client/src/mocks/Team/index.ts`
  - `client/src/app/[locale]/(private)/(settings)/team/` (folder + `page.tsx`)
  - `client/src/locales/en/team.json`
  - `client/src/locales/vi/team.json`
- Modify:
  - `client/src/locales/en/index.ts` — remove `import team from "./team.json";` and the `team,` entry
  - `client/src/locales/vi/index.ts` — same two removals
  - `client/src/dataSources/Dashboard/index.ts:42` — remove nav item `{ key: "team", icon: Users, href: ROUTES.TEAM }`; remove `Users` from the `lucide-react` import (now unused)
  - `client/src/types/Dashboard/index.ts:28` — remove `| "team"` from the `NavKey` union
  - `client/src/constants/routes.ts:23` — remove `TEAM: "/team",`
  - `client/src/locales/en/dashboard.json:38` — remove `"team": "Team"` (drop trailing comma now on `"billing"` line 37)
  - `client/src/locales/vi/dashboard.json:38` — remove `"team": "Nhóm"` (drop trailing comma on `"billing"` line 37)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `NavKey` no longer includes `"team"`; `CONSTANTS.ROUTES.TEAM` no longer exists; `IntlMessages` no longer has a `team` namespace.

- [ ] **Step 1: Delete the Team source folders/files**

```bash
cd client/.worktrees/remove-team-feature   # or the client worktree root
git rm -r src/views/Team \
          src/types/Team \
          src/mocks/Team \
          "src/app/[locale]/(private)/(settings)/team" \
          src/locales/en/team.json \
          src/locales/vi/team.json
```

- [ ] **Step 2: Unregister the `team` i18n namespace**

In `src/locales/en/index.ts` AND `src/locales/vi/index.ts`, delete the line `import team from "./team.json";` and the `team,` line inside the exported messages object. Leave all other namespaces and ordering intact.

- [ ] **Step 3: Remove the nav item + unused icon import**

Edit `src/dataSources/Dashboard/index.ts`:

```ts
import {
  Home,
  LayoutGrid,
  History,
  Star,
  Clock,
  User,
  Settings,
  CreditCard
} from "lucide-react";
```

and the settings group becomes:

```ts
  {
    key: "settings",
    items: [
      { key: "profile", icon: User, href: ROUTES.PROFILE },
      { key: "accountSettings", icon: Settings, href: ROUTES.ACCOUNT_SETTINGS },
      { key: "billing", icon: CreditCard, href: ROUTES.BILLING }
    ]
  }
```

- [ ] **Step 4: Remove `"team"` from the `NavKey` union**

In `src/types/Dashboard/index.ts` the union ends at `| "billing";` (delete the `| "team"` line).

- [ ] **Step 5: Remove the route constant**

In `src/constants/routes.ts` delete the `TEAM: "/team",` line.

- [ ] **Step 6: Remove the nav label key (both locales)**

`src/locales/en/dashboard.json` — the `sidebar.nav` object ends at `"billing": "Billing"` (no trailing comma). `src/locales/vi/dashboard.json` — ends at `"billing": "Thanh toán"`. Delete both `team` lines and fix the comma.

- [ ] **Step 7: Grep audit — no dangling Team reference remains**

```bash
cd client && git grep -nE '\bTEAM\b|"team"|views/Team|types/Team|mocks/Team|ROUTES\.TEAM' -- src ':!src/locales/**/notifications.json'
```
Expected: NO matches referencing the removed Team feature. (Unrelated substrings like `NotificationGroups`, `RequiredRolesGroup`, `OtpInputGroup`, `teamwork`-free — none should appear from the patterns above.)

- [ ] **Step 8: Green checks**

```bash
cd client && yarn format && yarn lint && yarn build
```
Expected: lint clean, build succeeds (type-check passes → confirms no dangling `NavKey`/`ROUTES.TEAM`/`team` namespace reference).

- [ ] **Step 9: Stage (no commit — overall review gate handled by orchestrator)**

```bash
git add -A
```

---

### Task 2: docs — codify Team as a Non-Goal in `project-goals.md`

**Files:**
- Modify: `docs/project-goals.md` (§6.2 Settings row, §11 Out of Scope, §10 Roadmap Backlog, §13 Changelog)

**Interfaces:**
- Consumes: nothing.
- Produces: `project-goals.md` reflects Team removal — used by future brainstorming as source of truth.

- [ ] **Step 1: §6.2 — drop `/team` from the Settings route group**

Change the Settings row routes from
`` `/profile`, `/account-settings`, `/security`, `/billing`, `/team` ``
to
`` `/profile`, `/account-settings`, `/security`, `/billing` ``
and update its status note to drop the Team mention (keep Billing as placeholder).

- [ ] **Step 2: §11 Out of Scope — rewrite the Team line**

Replace:
`- Team collaboration thực (Team UI giữ làm placeholder).`
with:
`- Team collaboration (mời thành viên, vai trò owner/admin/member): **Non-Goal** — trái mô hình single-tenant (§5). Placeholder UI `/team` đã được gỡ bỏ.`

- [ ] **Step 3: §10 Roadmap — remove "Team multi-user" from Backlog**

In the Backlog row, delete `Team multi-user,` from the comma-separated list (keep the remaining items: Discover algorithm, Billing thực, Anomaly detection nâng cao, OAuth provider khác).

- [ ] **Step 4: §13 Changelog — add an entry**

Add a row:
`| 2026-06-29 | Gỡ bỏ Team collaboration placeholder (FE + docs); Team thành Non-Goal dứt khoát (single-tenant). |`

- [ ] **Step 5: Stage (no commit)**

```bash
cd docs && git add project-goals.md
```

---

### Task 3: E2E — negative-assertion suite + `e2e.md`

**Files:**
- Create: `client/e2e/team-removal/team-removal.e2e.ts`
- Create: `docs/specs/remove-team-feature/e2e.md`

**Interfaces:**
- Consumes: Task 1 removal must be applied (suite asserts absence). Runs under the `chromium` project (logged-in regular user via `auth.setup.ts` storageState).
- Produces: committed gate-A suite covering matrix rows 1, 4, 9, 10, 12, + no-dangling-link.

- [ ] **Step 1: Write the E2E suite (matrix rows 1/4/9/10/12 + no-link)**

```ts
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Negative-assertion suite for the Team placeholder removal (design.md matrix).
// Auth from global auth.setup.ts (logged-in regular user). Read-only — nothing
// to revert. Locale switching is URL-prefix based (next-intl as-needed):
// en = no prefix, vi = "/vi".

const SETTINGS_PAGE = "/account-settings"; // a real surviving Settings page

// Collect console errors during a navigation to guard against missing-message
// (i18n) regressions from the removed `team` namespace / `dashboard.sidebar.nav.team`.
const collectConsoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
};

test.describe("Team placeholder removal", () => {
  // Row 1 (happy) + no-dangling-link: sidebar shows the surviving Settings
  // items and NO Team link, in en.
  test("Settings sidebar has no Team link (en)", async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    await expect(
      page.getByRole("link", { name: "Account Settings" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Billing" })).toBeVisible();
  });

  // Row 9 (i18n) + no-link: same in vi, with the localized label absent.
  test("Settings sidebar has no Team link (vi)", async ({ page }) => {
    await page.goto(`/vi${SETTINGS_PAGE}`);
    await expect(page.getByRole("link", { name: "Nhóm" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Cài đặt tài khoản" })
    ).toBeVisible();
  });

  // Row 4 (validation): /team and /vi/team resolve to Next.js not-found, no crash.
  test("/team is not-found (en)", async ({ page }) => {
    const res = await page.goto("/team");
    expect(res?.status()).toBe(404);
  });

  test("/vi/team is not-found (vi)", async ({ page }) => {
    const res = await page.goto("/vi/team");
    expect(res?.status()).toBe(404);
  });

  // Row 9/10 (i18n + error): no missing-message / console error on the Settings
  // shell in either locale, and no leaked `team.*` raw key text.
  test("no console error or leaked team key on Settings (en)", async ({
    page
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(SETTINGS_PAGE);
    await expect(
      page.getByRole("link", { name: "Account Settings" })
    ).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\bteam\.(title|members|invitations|roles)/);
    expect(errors.filter((e) => /MISSING_MESSAGE|team\./i.test(e))).toEqual([]);
  });

  test("no console error on Settings (vi)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto(`/vi${SETTINGS_PAGE}`);
    await expect(
      page.getByRole("link", { name: "Cài đặt tài khoản" })
    ).toBeVisible();
    expect(errors.filter((e) => /MISSING_MESSAGE|team\./i.test(e))).toEqual([]);
  });

  // Row 12 (a11y): the Settings nav group is reachable by role and keyboard —
  // surviving links are focusable.
  test("Settings nav is keyboard-reachable with Team gone", async ({ page }) => {
    await page.goto(SETTINGS_PAGE);
    const accountLink = page.getByRole("link", { name: "Account Settings" });
    await accountLink.focus();
    await expect(accountLink).toBeFocused();
  });
});
```

- [ ] **Step 2: Run the suite (gate A)**

```bash
cd client && yarn e2e --grep "Team placeholder removal"
```
Expected: all tests PASS (requires the app running — BE :5000, FE :3000 — and Task 1 applied). If `/team` returns a status other than 404, confirm Next.js not-found behavior for the locale.

- [ ] **Step 3: Write `e2e.md` (scenario doc mirroring the matrix)**

Create `docs/specs/remove-team-feature/e2e.md` with the final scenario list (rows 1, 4, 9, 10, 12, no-dangling-link), each mapped to a test name above, plus the `A only` note (none here — all `A+B`) and any follow-up gaps.

- [ ] **Step 4: Stage (no commit)**

```bash
cd client && git add e2e/team-removal/team-removal.e2e.ts
cd ../docs && git add specs/remove-team-feature/e2e.md
```

---

## Self-Review

**Spec coverage:** §2.1 footprint (10 items) → Task 1 (all 10). §2.2 docs (§6.2/§11/§10/§13) → Task 2. §4 E2E matrix (rows 1/4/9/10/12 + no-link) → Task 3. §2.3 BE (nothing) → no task. ✅
**Placeholder scan:** no TBD/TODO; every edit shows exact target + content. ✅
**Type consistency:** `NavKey` (Task 1 Step 4) ↔ `team` removed everywhere it's referenced (dataSources Step 3, routes Step 5); E2E uses real surviving labels ("Account Settings"/"Cài đặt tài khoản", "Billing"). ✅
**Completeness critic (full flow):** run during execution — one subagent hunts a missed `/team` link (breadcrumb, user menu, locale switcher landing).
