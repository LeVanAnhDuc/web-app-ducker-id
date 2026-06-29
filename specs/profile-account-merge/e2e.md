# E2E Scenario Document — Profile/Account Merge

**Suite:** `client/e2e/profile-account-merge/merge.e2e.ts`
**Feature:** Merge `/account-settings` (ChangePasswordCard) into `/profile`; delete `/account-settings` route; rename nav label to "Account"/"Tài khoản"; consolidate i18n into namespace `account`.

---

## Scenario Matrix

| Row | Group | Scenario | Describe (merge.e2e.ts) | Gate | Notes |
|-----|-------|----------|-------------------------|------|-------|
| 1 | Happy path | All six card sections render on `/profile` in one page | `Profile/Account merge — happy path` | A+B | Headings: title + personalInfo + connectedAccounts + notificationPreferences + changePassword + dangerZone |
| 2 | AuthN | Unauthenticated user redirected away from `/profile` → `/login` | `Profile/Account merge — AuthN` | A+B | Fresh browser context, no storageState, clearCookies |
| 4 | Validation | Change-password form validation (empty, mismatch, policy violations) | **Delegated** → `e2e/change-password` suite | — | Suite repointed to `/profile` in Task 3 Step 1; rows 4/10/11 fully covered there |
| 8 | Data rendering | Page title is "Account" (not the old "Profile"); old heading absent | `Profile/Account merge — page identity` | A+B | `getByRole("heading", { name: "Account" })` visible; `"Profile"` exact count = 0 |
| 9 | i18n en + vi | EN `/profile` renders no missing-message; VI `/vi/profile` renders localized strings | `Profile/Account merge — i18n` | A+B | Console error filter on `MISSING_MESSAGE\|IntlError\|MessageFormat`; body must not expose raw key tokens |
| 10 | Error / loading | Change-password API errors (500, loading disabled state) | **Delegated** → `e2e/change-password` suite | — | |
| 11 | Mutation-safety | Real password change + session survival + token revoke | **Delegated** → `e2e/change-password` suite (Gate A only, mutating) | — | |
| F1 | Route removal [ST invalid] | `/account-settings` → 404 not-found (EN + VI locales) | `Profile/Account merge — route removal` | A+B | `NOT_FOUND_TEXT` regex; Change Password heading absent |
| F2 | Nav integrity | Settings nav has Account/Billing/Team; "Account Settings" link absent; Account link navigates to `/profile` | `Profile/Account merge — nav integrity` | A+B | Uses `getByRole("navigation")` + `[aria-label="Settings"]` fallback |

**Rows not in matrix (N/A):**
- Row 3 (AuthZ) — N/A: `/profile` has no role-based access control beyond authentication; no admin vs. user distinction on this page.
- Row 5 (Empty/null state) — N/A: no empty-state UI on this page; all cards render unconditionally.
- Row 6 (Boundary/pagination) — N/A: no paginated data on this page.
- Row 7 (Filter/search) — N/A: no filter or search on this page.
- Row 12 (Accessibility) — Covered by the change-password suite (tab-order, aria-invalid). Nav landmark aria-label follow-up flagged below.

---

## Gate Column Notes

- All scenarios in `merge.e2e.ts` are **Gate A+B** (read-only, no mutation).
- No scenario in this suite mutates data — password-change mutation scenarios stay in `e2e/change-password` (Gate A only, mutating describes).
- Gate B (MCP walk) reads these scenarios from this document; it shares no storageState with Gate A.

---

## DEFER Registry

| Item | Reason | Condition to enable |
|------|--------|---------------------|
| Rate-limit: 6th change-password attempt → 429 | `test.skip` in `e2e/change-password` — rate-limit bucket (5 req/IP+user/15 min) is shared across runs; flaky without per-test Redis flush or short test window | Provide short rate-limit window or per-test bucket reset in test env |
| Nav landmark `aria-label` = group label | Sidebar `<nav>` may not expose `aria-label="Settings"` yet; F2 uses `.or()` fallback to `[aria-label="Settings"]` | Wire `aria-label` on the sidebar nav group element (accessibility follow-up) |

---

## Delegated Suites

Rows **4** (validation), **10** (error/loading), and **11** (mutation-safety / session) are fully covered by `client/e2e/change-password/change-password.e2e.ts`, which was repointed from `/account-settings` → `/profile` in Task 3 Step 1. The rate-limit case in that suite remains `test.skip` (see DEFER registry above).
