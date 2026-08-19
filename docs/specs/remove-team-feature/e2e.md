# E2E Scenarios — Remove Team (collaboration placeholder)

> Suite: `client/e2e/team-removal/team-removal.e2e.ts` (gate A). Runs under the
> `chromium` project (logged-in regular user via `auth.setup.ts`). Read-only —
> nothing to revert. All scenarios `A+B` (no mutation → no contamination risk).

This change **removes** the mock `/team` Settings placeholder, so every scenario
is a **negative assertion** (absence + no-breakage), not new behavior. No
forms/inputs/mutations are introduced → EP/BVA/DT/ST depth techniques are N/A
(recorded in `design.md` §4). See `design.md` for the full rubric walk.

| #   | Matrix row          | Scenario                                                                                  | Test name                                                          | Gate |
| --- | ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| 1   | Happy + no-link     | Settings sidebar shows Account Settings + Billing, **no Team link** (en)                  | `F2 nav integrity › settings sidebar has no Team link (en)`        | A+B  |
| 2   | i18n (vi)           | Same in vi; localized "Nhóm" label absent                                                 | `F2 nav integrity › settings sidebar has no Team link (vi)`        | A+B  |
| 3   | Validation          | `/team` → Next.js not-found shell (no crash)                                              | `route removal › /team renders not-found (en)`                    | A+B  |
| 4   | Validation (vi)     | `/vi/team` → not-found                                                                     | `route removal › /vi/team renders not-found (vi)`                 | A+B  |
| 5   | i18n + error (en)   | No MISSING_MESSAGE / leaked `team.*` key on Settings after namespace removal (en)         | `no missing-message regression › ... Settings (en)`              | A+B  |
| 6   | i18n + error (vi)   | No MISSING_MESSAGE on Settings (vi)                                                        | `no missing-message regression › no console error on Settings (vi)` | A+B  |
| 7   | a11y                | Surviving settings links keyboard-focusable with Team gone                                | `a11y › settings nav remains keyboard-reachable`                 | A+B  |

**N/A rows** (see `design.md` §4): AuthN, AuthZ, Empty/null, Boundary/pagination,
Filter/search, Data rendering, Mutation safety — no surface remains for a deletion.

**Reconcile note**: the existing `account-settings-cleanup` suite (`F2 nav
integrity`) previously asserted Team was **present** in the settings nav. It was
updated in this change to assert Team is **absent** (alongside its existing
Security-absent check), keeping that feature's matrix/test in sync.

**Follow-up gaps**: none. Gate B (Playwright MCP walk) mirrors rows 1–7 in both
locales using its own auth context.
