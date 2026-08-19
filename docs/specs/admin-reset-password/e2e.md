# E2E — Admin Reset Password (+ force-change enforcement)

> Author phase only (this doc). Suites are NOT run yet (`yarn e2e` needs the
> app up — see Dual-gate below and CLAUDE.md §4.3). Scenario source of truth:
> `design.md` > "## E2E Scenario Matrix" (12 rows, S1 admin-reset-action,
> S2 force-change flow). Plan task: `plan.md` > PHẦN C > Task C1.

## Files

- `client/e2e/admin-users-reset/reset-action.e2e.ts` — S1 (admin reset action), `admin` Playwright project.
- `client/e2e/admin-users-reset/force-change.e2e.ts` — S2 (force-change flow), `admin` project but almost every test fabricates its own session (see "Mocking strategy" below) so the project's default storageState is largely irrelevant.
- `client/e2e/helpers/session.ts` — **new helper**: `fakeJwt()` + `mockSessionWithClaims()`, intercepts `POST /auth/token/refresh` (the app's session-bootstrap call — `SessionGate`) to fabricate a session carrying an arbitrary `mustChangePassword` idToken claim, without a real login.
- `client/e2e/admin-authz/admin-authz.e2e.ts` — **extended** (not a new file): added non-admin 403 (`AUTH_ADMIN_ONLY`) + token-less 401 (`AUTH_MISSING_TOKEN`) checks for `POST /admin/users/:id/reset-password`, mirroring the existing lock/unlock blocks in that same file (project convention: cross-cutting non-admin AuthZ denial lives here, not duplicated per-feature).
- `client/playwright.config.ts` — added `admin-users-reset` to the `chromium` project's `testIgnore` and the `admin` project's `testMatch` (both new spec files run under the `admin` project, same as `admin-users-lock`/`admin-login-history`/etc.).

## KNOWN GAP — read this before running/extending the suite

`UserService.adminResetPassword` (server) returns only `{ _id, email }`. The
generated temp password is dispatched by email (`EmailDispatcher` → BullMQ →
SMTP) and is **never surfaced over any HTTP-observable channel** in this
environment: no Mailhog/test-inbox capture, no `NODE_ENV=test` debug-echo
field, no dev-only endpoint. Confirmed by reading
`server/.worktrees/admin-reset-password/src/modules/user/user.service.ts`
(`adminResetPassword` return value) and grepping the repo for
mailhog/ethereal/maildev/test-email-capture (none found).

This blocks exactly the sub-scenarios that require actually knowing the new
password after a real reset:

1. **S1 matrix row #11**, second half: "login B bằng temp pw OK" — cannot
   verify at all (password unknown).
2. **S1 matrix row #11**, first half: "login B bằng mật khẩu CŨ → fail" —
   *technically* provable with a real reset, but only against a
   **login-capable** seed user, and every login-capable seed user is either
   shared global auth state (`user@test.com`, used by the whole suite's
   default storageState) or owned by another feature's suite
   (`user2@test.com`/`inactive@test.com` — `admin-users-lock`). The one idle
   seed user, `unverified@test.com`, is blocked from password-login
   **regardless of password** (`EmailVerifiedGuard` fires before the password
   comparison) — using it would silently validate the wrong guard, not the
   reset's password mutation. It's still used (see below) for the *narrower*
   "valid target → 200" contract check, which doesn't need login capability.
3. **S2 matrix row #11 (ST invalid)**: "refresh token captured before a real
   reset is rejected afterward (tokenVersion bump)" — same blocker: needs a
   real login-capable victim to capture a real pre-reset refresh token.
4. **S1+S2 combined real round trip** (matrix row #1's full intent: admin
   resets someone for real → they log in with the emailed temp password →
   redirected → change it → land home) — blocked for the same reason.

**What's covered instead**: every FE-observable mechanic that does NOT
require knowing the real temp password — S1's admin-side contract (format
400 → not-found 404 → self 403 → success 200, all via direct API calls,
using the admin's own id for self and synthetic ids for format/not-found) and
UI (dialog/toast/announce/i18n/error/loading/a11y/double-submit, all via
`page.route` mocking so zero real mutations happen), and S2's FE mechanics
(redirect gate, form validation/boundary/i18n/a11y/error/loading/double-submit,
all via the fabricated-session technique in `helpers/session.ts`). These are
marked `test.fixme` with the reasoning inlined at each site, not silently
dropped.

**Prerequisite to unblock (not implemented here — flagging per task
instructions rather than inventing untracked infra)**:

1. A **dedicated, login-capable seed user** reserved for this suite (e.g.
   `reset-target@test.com` / a known password, `verifiedEmail:true`,
   non-admin), added to `server/src/database/seeders/data/users.ts`, not
   touched by any other suite.
2. A **test-only way to read the generated temp password** — e.g. a
   `NODE_ENV=test`-gated debug field on the response (never in
   prod/staging), or a Mailhog/test-inbox capture wired into
   `EmailDispatcher` that E2E can poll. Without #2, #1 alone is not
   sufficient: even with a dedicated user, a REAL reset still burns their
   password to an unknown value with no way to log back in as them or revert
   — the fixture would become permanently "spent" after one real test run
   (`server/src/database/seeders/user.seeder.ts`'s `seedUsers()` **skips**
   already-existing users, so `yarn seed` alone does not restore a changed
   password — only `yarn seed:clear && yarn seed` would, which is a much
   heavier reset than a normal test run should require).

Once both exist, un-`fixme` the three scenarios above and wire them exactly
per the matrix's original intent (this is intentionally NOT stubbed with a
guessed implementation now — a wrong guess would be worse than an honest
`fixme`).

## Mocking strategy (why, not just what)

- **S1 UI tests** (`reset-action.e2e.ts`): `page.route` intercepts
  `POST /admin/users/*/reset-password` entirely, so the mocked describe
  blocks (happy path, data rendering, i18n, error/loading, double-submit,
  a11y) never reach the real backend — safe to use ANY seed user as the
  visual target (`user2@test.com` chosen for a readable name in assertions).
- **S1 real-contract tests**: direct `apiContext` calls, no UI, no dedicated
  seed user needed for format/not-found/self (synthetic ids / admin's own
  id). The ONE real mutation (`unverified@test.com`, "valid target → 200")
  is deliberately chosen because its password never matters (see KNOWN GAP).
- **S2 (`force-change.e2e.ts`)**: `mockSessionWithClaims()` intercepts
  `POST /auth/token/refresh` — the app's session-bootstrap call fired by
  `SessionGate` on every fresh full page load (tokens live only in an
  in-memory Zustand store, never persisted) — and fulfills it with a
  fabricated (unsigned) JWT pair carrying whatever `mustChangePassword` claim
  the test needs. This works because `jwt-decode` (client-side,
  `useUserInfo.ts`) and the app's own `isTokenExpired`/`getTokenExpSeconds`
  helpers never verify the token signature — only the real BE does, on every
  protected request. This is an E2E-only technique that lets the whole FE
  mechanic (gate redirect → form → success → HOME) be tested deterministically
  and non-destructively, independent of the temp-password gap above.

## Scenario matrix → test mapping

| # | Group | S1 (`reset-action.e2e.ts`) | S2 (`force-change.e2e.ts`) |
|---|---|---|---|
| 1 | Happy path | "admin resets a user via row menu — dialog, toast, announce, dialog closes" (mocked) | "mustChangePassword=true redirects HOME -> /change-password; a successful change lands HOME" (mocked session + mocked PATCH) |
| 2 | AuthN | Covered in `admin-authz.e2e.ts` ("token-less POST … → 401 AUTH_MISSING_TOKEN") | "unauthenticated visit to /change-password redirects to /login" (real, no mocking) |
| 3 | AuthZ | Covered in `admin-authz.e2e.ts` ("non-admin POST … → 403 AUTH_ADMIN_ONLY") | `test.fixme` — role-agnostic route, no distinct behavior beyond the flag-driven gate tests; `admin-authz/` already covers `/admin/*` denial for the non-admin project |
| 4 | Validation | `[BVA]` malformed id → 400; `[BVA]` 24-hex non-existent → 404; `[DT]` self → 403; real 200 on safe target | `[EP]` 5 invalid newPassword classes + empty current + confirm-mismatch (no API call); `[DT]` currentWrong+newValid → 400 inline error; `[DT]` currentOK+newInvalid → client blocks first |
| 5 | Empty/null | "no dialog is rendered before any row action is triggered" | "mustChangePassword=false visiting /change-password directly redirects HOME" |
| 6 | Boundary | N/A — no pager on this endpoint (uses AdminUsers' existing list pagination, out of this feature's scope) | `[BVA]` 7/8/128/129-char newPassword (reject/accept/accept/reject) |
| 7 | Filter/search | N/A — feature adds no filter/search surface | N/A — form only |
| 8 | Data rendering | "dialog and toast render the target's name/email, never a raw i18n key" | "renders i18n labels; never a raw key or the mustChangePassword claim as text" |
| 9 | i18n en+vi | EN + VI dialog/confirm/toast tests (mocked) | EN + VI title/labels/submit tests (mocked session) |
| 10 | Error/loading | BE 500 → error toast, confirm re-enabled, dialog stays open (mocked) | BE 500 → generic 5xx toast, stays on page; delayed PATCH → inputs+submit disabled |
| 11 | Mutation safety | Double-submit exactly-one-POST (mocked). Full temp-pw round trip: `test.fixme` (see KNOWN GAP #1/#2) | "[ST valid]" success lands HOME and doesn't bounce back; double-submit exactly-one-PATCH. "[ST invalid]" refresh-token revocation: `test.fixme` (see KNOWN GAP #3) |
| 12 | Accessibility | Keyboard open+confirm exactly-one-request; Cancel/Escape dismiss zero-requests | Tab order through fields+toggles+submit; keyboard-only submit exactly-one-PATCH |

## Flagged observation (not fixed — out of this task's scope)

While tracing the exact toast shown on a `500` from `PATCH /auth/change-password`,
neither `useChangePassword` (`src/hooks/useChangePassword.ts`) nor either of its
two consumers (`ChangePasswordCard`, `ForceChangePasswordForm`) define a
component-level `onError` toast — only field-error mapping via
`FIELD_ERROR_MAP` (which has no entry for a 500). The toast that actually
fires is the **global** `mutationCache` handler's generic 5xx branch
(`src/libs/query-client.ts` → `"Server error. Please try again later."`).
`force-change.e2e.ts`'s own 500 test asserts that string. However the
**existing** `client/e2e/change-password/change-password.e2e.ts` test "shows
an error toast and keeps form values when the API fails (500)" asserts
`account.changePassword.toast.error` ("Failed to update password") instead —
a string that, by this trace, should never actually render for a plain 500.
This looks like a pre-existing drift in that test (not introduced by this
feature) rather than a bug in the app; flagging for the run phase to confirm
live via Gate B (MCP walk) before assuming either the test or the app is
wrong.

## Prerequisites for the run phase (Gate A + Gate B)

- App up per CLAUDE.md §4.3 (BE :5000/proxy, FE dev server, Mongo, Redis).
- No new seed data is required to run what's implemented here — every test
  either mocks the network or uses existing seed users
  (`admin@test.com`, `user2@test.com`, `unverified@test.com`).
- The 3 `test.fixme` scenarios stay skipped until the KNOWN GAP prerequisites
  (dedicated seed user + temp-password observability) are delivered — this is
  a deliberate, documented scope boundary, not an oversight.
- Rate-limit awareness (CLAUDE.md known gotcha): this suite performs at most
  1 real login (admin, in `reset-action.e2e.ts`'s `beforeAll`) and 1 real
  mutating POST (`unverified@test.com`'s reset, in the validation describe).
  All other reset/change-password calls in both files are `page.route`-mocked
  — nowhere close to the BE's login (30/15min) or change-password (5/15min)
  limits.

## Dual-gate plan (§4.3)

- **Gate A**: `cd client && yarn e2e --project=admin -g "Admin reset-password|Force change-password"` (adjust the grep to the suite's actual `describe` titles once run — see file headers above for the literal titles used).
- **Gate B**: MCP browser walk of the same matrix, own auth context (fresh browser + the `mockSessionWithClaims`-equivalent manual network stubs, or real admin login for S1's UI portion). Walk every `A+B` row; SKIP the real-mutation "valid target → 200" check (S1) — verify its read/render/i18n/a11y equivalents only, per the `A only` convention.
- Fail → `systematic-debugging` → `e2e-bugs.md` → fix → re-run (max 3 rounds, per CLAUDE.md §4.3).

## Completeness-critic

Not yet run (feature is auth-sensitive/multi-surface per CLAUDE.md §4.3's
trigger) — recommend dispatching 1 subagent to review this matrix mapping +
the two spec files before treating C1 as fully closed, per plan.md Task C1's
own checklist item.
