# Design — Remove Team (collaboration placeholder)

> **Status**: Approved scope (brainstorming) — pending spec review → writing-plans.
> **Type**: `chore` (cleanup / removal). Branch: `chore/remove-team-feature`.
> **Repos touched**: `client/` (code), `docs/` (governance). `server/` untouched.

## 1. Problem & Decision

The Settings area ships a **Team** page (`/team`) that is a **mock-only placeholder**: FE
views + static mock data, **no backend, no real interaction**. A user who clicks it lands on a
dead screen — nothing is wired, nothing is actionable. This is UX debt: a non-interactive
surface presented as a real feature.

**Strategic evaluation (vs `project-goals.md`)**: "Team collaboration" (owner/admin/member,
invitations) is a **multi-tenant / workspace concept** that directly conflicts with the IDMS
positioning:

- §5 Non-Goals: _"Không phải social network"_, _"Không là multi-tenant (chỉ 1 tổ chức / owner
  duy nhất)"_. A "team" with sub-roles + invites is exactly a sub-organization — out of model.
- The IDMS auth model has only `USER` / `ADMIN` (§3); the mock's `owner/admin/member` is an
  orphan parallel role system mapping to nothing real.
- It does not serve the core journey (SSO into satellite apps) — no identity/entitlement/launcher value.
- Roadmap: MVP-1 (OAuth/OIDC) is still ❌ not built; Team sat in Backlog _after_ MVP-4.

**Decision**: Remove the Team placeholder entirely (FE), and update `project-goals.md` to make
"Team collaboration" a definitive Non-Goal (remove from Backlog). Confirmed with owner.

> Note (out of scope): the **Billing** page is also a placeholder (§11). This change does **not**
> touch Billing — flagged only as a related observation.

## 2. Scope — exact footprint

### 2.1 FE — `client/src/`

| #   | File / folder                                          | Action                                                          |
| --- | ------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | `views/Team/` (index + 4 `mains/` + 4 `components/`)   | Delete folder                                                   |
| 2   | `types/Team/index.ts`                                  | Delete                                                          |
| 3   | `mocks/Team/index.ts`                                  | Delete                                                          |
| 4   | `app/[locale]/(private)/(settings)/team/` + `page.tsx` | Delete route folder                                             |
| 5   | `locales/en/team.json` + `locales/vi/team.json`        | Delete                                                          |
| 6   | `locales/{en,vi}/index.ts`                             | Remove `import team` + `team,` from registry object             |
| 7   | `dataSources/Dashboard/index.ts`                       | Remove nav item `{ key: "team", ... }`; remove now-unused `Users` icon import |
| 8   | `types/Dashboard/index.ts`                             | Remove `\| "team"` from `NavKey` union                          |
| 9   | `constants/routes.ts`                                  | Remove `TEAM: "/team"`                                          |
| 10  | `locales/{en,vi}/dashboard.json`                       | Remove `dashboard.nav.team` label key                           |

**Render note**: the Settings sidebar renders dynamically from `NAV_GROUPS`
(`layouts/DashboardLayout/mains/Sidebar`) — removing the dataSources entry (#7) auto-drops the
nav link; no sidebar component edit needed.

**Namespace safety**: the `team` i18n **namespace** (`team.json`) is consumed only inside
`views/Team/**`. The Settings nav label uses a **different** key (`dashboard.nav.team` in
`dashboard.json`) handled by #10. After deleting `views/Team/**`, no `useTranslations("team")`
caller remains → removing `team.json` + its registration is safe.

### 2.2 docs — `project-goals.md`

- §6.2 Settings route-group row: remove `/team` from the listed routes.
- §11 Out of Scope: rewrite the _"Team collaboration thực (Team UI giữ làm placeholder)"_ line →
  state the placeholder was **removed** and Team collaboration is a Non-Goal (single-tenant).
- §10 Roadmap → Backlog: **remove** "Team multi-user" entirely.
- §13 Changelog: add a dated entry.

### 2.3 BE — `server/`

Nothing. No Team backend, model, route, or entitlement exists.

## 3. Risk & verification

- **Risk**: a dangling reference to `ROUTES.TEAM`, the `team` namespace, or the `NavKey "team"`
  causes a TS/build break. Mitigated by `next build` (type-checks) + grep audit for `TEAM` /
  `"team"` / `views/Team` after edits → must return only intentional removals.
- **Risk**: stale deep link / bookmark to `/team` now 404s. Acceptable — the page never did
  anything; Next.js shows the standard not-found. No redirect needed (it was never a real route
  users were told to rely on).
- **Green checks (§4.7)**: `cd client && yarn lint && yarn build` must pass.
- **Security (§4.5)**: SKIP-eligible (pure deletion, no auth/input/data surface) — but per the
  chosen full flow it will still run and be recorded as a no-finding PASS.

## 4. E2E Scenario Matrix

This change **removes** user-observable surface (a Settings nav link + the `/team` route). No
existing Team E2E suite exists (Team was mock-only, never tested), so scenarios are **negative
assertions** (absence + no-breakage) rather than new behavior. No forms/inputs/mutations are
introduced → the EP/BVA/DT/ST depth techniques are almost entirely N/A (recorded per row).

`Gate` column: `A+B` = both gates; `A only` = mutation-heavy (none here).

| #   | Category            | Decision | Scenario / N/A reason                                                                                                                                                | Gate |
| --- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Happy path          | ✅       | Logged-in user opens Settings area → sidebar lists Profile, Account Settings, Billing **and NOT Team**. `[EP]` nav-item set valid class = {profile, accountSettings, billing}; invalid/removed class = {team}. | A+B  |
| 2   | AuthN               | N/A      | No auth behavior changes; we remove a route, not an auth path. Existing AuthGuard still governs the Settings group.                                                  | —    |
| 3   | AuthZ               | N/A      | Team had no role gating beyond the generic private-area guard; no role-specific visibility is added or removed.                                                      | —    |
| 4   | Validation / error  | ✅       | Direct-navigate to `/team` and `/vi/team` → Next.js **not-found** (no crash, no blank app). `[EG]` also try `/team?x=1` and a trailing slash — same not-found.        | A+B  |
| 5   | Empty / null states | N/A      | No list/data surface remains for this feature.                                                                                                                       | —    |
| 6   | Boundary/pagination | N/A      | No pagination/numeric input involved in a deletion.                                                                                                                  | —    |
| 7   | Filter / search     | N/A      | No filter/search surface involved.                                                                                                                                   | —    |
| 8   | Data rendering      | N/A      | No data is rendered by the removed feature anymore.                                                                                                                  | —    |
| 9   | **i18n (en + vi)**  | ✅       | Settings sidebar renders cleanly in **both** locales with no Team item and **no missing-message console error** (regression guard for the removed `team` namespace + `dashboard.nav.team` key). Verify console clean in en AND vi. | A+B  |
| 10  | Error / loading     | ✅       | App shell + Settings pages load with **no new console errors / failed network requests** after removal (gate B checks `browser_console_messages` + `browser_network_requests`).                                  | A+B  |
| 11  | Mutation safety     | N/A      | Deletion introduces no runtime mutation/write path. `[ST]` N/A — no stateful flow added.                                                                             | —    |
| 12  | Accessibility       | ✅       | Settings nav still keyboard-navigable; focus order intact with the item removed; remaining links reachable by role/label.                                            | A+B  |
| +   | No-dangling-link    | ✅       | No element anywhere in the app links to `/team` (sidebar, user menu, profile). Grep-level guarantee in code; gate B spot-checks Settings + user menu have no Team entry. | A+B  |

**Completeness critic**: required (full flow) — dispatch one subagent during `writing-plans` to
hunt missed cases (e.g. a hardcoded `/team` link outside the audited files, a breadcrumb that
references the removed route, locale-switcher landing on `/team`).

## 5. Process plan (full flow per CLAUDE.md)

1. ✅ Isolation worktrees created (`client/`, `docs/`) from `origin/main` — branch `chore/remove-team-feature`.
2. Spec review (this doc) → commit `design.md` (commit gate §7).
3. `writing-plans` → `plan.md` (tasks split by side: FE removal task + docs task + E2E task).
4. Implement (subagent-driven) — stage, no per-task commit; overall review gate §7.
5. §4.3 E2E dual-gate (gate A `yarn e2e` + gate B MCP walk) on the negative-assertion matrix.
6. `requesting-code-review` → §4.5 security review (expected PASS, recorded) → §4.6 CLAUDE.md
   drift audit (FE convention/struct unchanged; docs goals updated) → §4.7 green checks.
7. `finishing-a-development-branch` + README sync (no setup/env change → likely skip) →
   `creating-github-pr` per-repo (`client` + `docs`).
