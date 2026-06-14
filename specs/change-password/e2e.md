# Change Password — E2E Scenario Document

> **Feature:** change-password (Account Settings)
> **Date:** 2026-06-14 (backfill)
> **Matrix source (breadth/depth):** `docs/specs/change-password/design.md` → `## 10.5. E2E Scenario Matrix`
> **Test file:** `client/e2e/change-password/change-password.e2e.ts`
> **Helpers:** `client/e2e/helpers/changePassword.ts` (`ensureDefaultPassword`, `trackPatch`, `expectNoPatch`)

This document is the per-scenario source-of-truth for the §4.3 dual-gate run. It
reconciles the matrix ↔ this doc ↔ the test file. Every applicable matrix row has
a covered scenario or an explicit N/A / DEFER with a reason (no silent gaps).

---

## BE rate-limit constraint (real vs mocked PATCHes)

`PATCH /auth/change-password` is rate-limited by the BE: **5 requests / IP+user /
900s** (key `rate-limit:change-password:ip-user:*`, keyed `ip:authId`). The limiter
counts **every** attempt, including 4xx rejects. A naïve suite issued ~11 real
PATCHes per run → after 5 the BE returns 429 → cascading failures.

**Redesign: ≤4 real change-password PATCHes per run** (verified live: the bucket
counter reads exactly `4` after a run). Each test decides whether it MUST hit the
real BE (security/server behavior) or can `page.route`-MOCK the PATCH response
(asserting FE handling of a given server response without consuming the bucket).
Mocked PATCHes do NOT count against the BE bucket.

| Test | Real / Mock | Why |
|---|---|---|
| happy path + reload-stays-authed (describe 2) | **REAL** | Core happy path; only a real change rotates the refresh cookie → true [ST] valid session-survival. (DEFAULT→NEW) |
| describe-2 afterAll revert | **REAL** | Restores NEW→DEFAULT via `ensureDefaultPassword`. |
| token-revoke [ST invalid] (describe 3) | **REAL** | Security-critical: pre-change refresh token must be rejected after the change. API contexts. (DEFAULT→NEW) |
| describe-3 afterAll revert | **REAL** | Restores NEW→DEFAULT. |
| wrong-current → field error | MOCK 400 `CHANGE_PASSWORD_WRONG_CURRENT` | Assert FE maps code → currentPassword field. |
| new == current → field error | MOCK 400 `CHANGE_PASSWORD_SAME_AS_CURRENT` | Assert FE maps code → newPassword field. |
| vi wrong-current | MOCK 400 `CHANGE_PASSWORD_WRONG_CURRENT` | Assert FE renders the localized (vi) error. |
| success-handling (200) | MOCK 200 | Assert FE toast + stays on page on a 200 (no reload — see below). |
| 8-char boundary accept | MOCK 200 | Client policy accepts 8 chars (no client block) + FE shows success on 200. |
| double-submit → exactly 1 PATCH | MOCK 200 (delayed 800ms) | Assert FE in-flight guard disables Save → one PATCH. |
| loading: inputs disabled in flight | route held then **aborted** | Assert in-flight disabled state; abort (not fake-200) so no success handler runs. |
| 500 error toast | MOCK 500 | Assert FE error toast + keeps form values. |
| client-validation tests (EP/BVA-reject/pristine/confirm-mismatch) | NO PATCH | Client policy blocks before any BE call (unchanged). |
| rate-limit 429 (6th attempt) | `test.skip` | Needs 6 real attempts; can't run inside the suite without exhausting the bucket. See DEFER registry. |

**The suite consumes the change-password bucket** (4 real PATCHes per run). Run it
**once per 15-min window**, OR clear the bucket first:
`DEL rate-limit:change-password:ip-user:*` (and `rate-limit:login:ip:*`). Running
twice within 900s without clearing pushes the counter toward the limit (4 → 8 > 5).

### Session-contamination controls (real changes)

A real change bumps `passwordChangedAt`, which **revokes every refresh token issued
before it** — including the one `auth.setup.ts` saved to `e2e/.auth/user.json`.
Since each test builds a fresh browser context from that file, the first real change
would log out every later browser test (SessionGate `/token/refresh` 401s → `/login`).
Controls (test-code only):

- The single REAL browser change (happy path) runs **last** in describe 2; it then
  calls `reestablishStorageState(page, NEW_PASSWORD)` to re-capture a valid cookie.
- `ensureDefaultPassword` (afterAll) re-saves `e2e/.auth/user.json` with a fresh
  DEFAULT-based storageState after reverting.
- The real token-revoke change uses **API contexts** (not the shared browser
  session) and runs **last** in describe 3.
- Mocked-200 tests do **not** reload (a reload after a fake-200 races the
  refresh-token bootstrap and logs the shared session out); the loading test
  **aborts** its held route instead of fulfilling a fake 200.
- token-revoke waits **1.1s** between the pre-change login and the change: the BE
  guard rejects only when token `iat` (sec) is *strictly* `< passwordChangedAt`
  (sec); same-second timing is a false negative (`server/.../password-not-changed.guard.ts`).

---

## File layout (contamination isolation)

The suite is split into 4 `describe` blocks (all `mode: "serial"`):

1. **`UI & validation (Gate A+B)`** — default storageState; never mutates the real
   password (validation, empty/null, boundary-reject, render, i18n, error-mock,
   loading-mock, a11y tab-order, error-guessing). Safe for gate B to read in parallel.
2. **`happy path & boundary (Gate A only, mutating)`** — mocked tests run first;
   the ONE real change (happy path) runs **last** + `reestablishStorageState`;
   `afterAll → ensureDefaultPassword(...)` reverts and re-saves the auth file.
   Gate B verifies read/render only.
3. **`session & security (Gate A only, isolated)`** — double-submit (mocked) runs
   first; token-revoke (REAL, API contexts) runs **last**. Revokes refresh tokens,
   so it must run isolated, never in parallel with a session-sharing read scenario.
   See `[[reference_e2e_suite_session_contamination]]`.
4. **`authentication (Gate A+B / A only)`** — network/context-level AuthN; no mutation.

**Shared constants:** `DEFAULT_PASSWORD = process.env.E2E_USER_PASSWORD ?? "User@123"`,
`NEW_PASSWORD = "NewPass@123"`, `BASE_URL = process.env.E2E_BASE_URL ?? http://localhost:3000`,
`LOGIN_EMAIL = process.env.E2E_USER_EMAIL ?? "user@test.com"`.

---

## Real i18n strings asserted (verified, not guessed)

Sourced from `client/src/locales/{en,vi}/accountSettings.json`
(namespace `accountSettings.changePassword`) and `client/src/locales/{en,vi}/common.json`
(namespace `common.validation`):

| Key | en | vi |
|---|---|---|
| `changePassword.title` (heading) | `Change Password` | `Đổi mật khẩu` |
| `changePassword.buttons.save` | `Update Password` | `Cập nhật mật khẩu` |
| `changePassword.buttons.cancel` | `Cancel` | `Hủy` |
| `changePassword.toast.success` | `Password updated successfully` | `Đã cập nhật mật khẩu thành công` |
| `changePassword.toast.error` | `Failed to update password` | `Không thể cập nhật mật khẩu` |
| `changePassword.fields.currentPassword` | `Current Password` | `Mật khẩu hiện tại` |
| `changePassword.fields.newPassword` | `New Password` | `Mật khẩu mới` |
| `changePassword.fields.confirmPassword` | `Confirm New Password` | `Xác nhận mật khẩu mới` |
| `common.validation.currentPassword.wrongCurrentPassword` | `Current password is incorrect` | `Mật khẩu hiện tại không đúng` |

> Note: field-level inline errors resolve through `FormFieldMessage` →
> `common.validation.{fieldName}.{errorKey}` (not the `accountSettings` namespace).
> The wrong-current error maps to `common.validation.currentPassword.wrongCurrentPassword`.

---

## Scenario table

| # | Scenario | Input | Expected | Technique | Gate | Status | Test name |
|---|----------|-------|----------|-----------|------|--------|-----------|
| 1 + 1b | Happy path + session survives (ST valid) — **REAL** | `current=User@123`, `new=NewPass@123` → Save, then reload | toast `Password updated successfully`, stays on `/account-settings`; reload stays authed (real token rotation) | [ST] valid | A only* | [EXISTS] folded | happy path updates password and keeps the session (reload stays authed) |
| 1c | FE success-handling on 200 — **MOCK 200** | `page.route` PATCH → 200 | toast success, stays on `/account-settings` (no reload) | EP | A+B | [NEW] | shows success and stays on the page when the change succeeds (200) |
| 2a | Unauthenticated redirect | fresh context, `storageState: undefined` + `clearCookies()` → goto `/account-settings` | redirected to `/login` | error-guessing | A+B | [NEW] | redirects unauthenticated user away from account settings |
| 2b | PATCH without bearer | `request.newContext` PATCH `/api/v1/auth/change-password` no Authorization | `401` (authGuard) | authN | A only | [NEW] | rejects change-password API call without a bearer token (401) |
| 4-confirm-mismatch | Confirm ≠ new | `confirm=Different@123` | `aria-invalid=true` on confirm, no PATCH | EP | A+B | [EXISTS] | blocks confirm mismatch on the client (no API call) |
| 4-wrong-current (DT row i) | Wrong current, valid new — **MOCK 400** | `current=WrongPass@123`, `new=NewPass@123` | mocked 400 `CHANGE_PASSWORD_WRONG_CURRENT` → mapped to `currentPassword` field (`aria-invalid`) | DT | A+B | [EXISTS-partial] | shows inline error on wrong current password |
| 4-new-equals-current | New == current — **MOCK 400** | `new=current=User@123` | mocked 400 `CHANGE_PASSWORD_SAME_AS_CURRENT` → `aria-invalid` on newPassword | EP | A+B | [EXISTS] | shows inline error when new equals current |
| 4-EP-no-upper (worked) | `new=newpass@123` | `aria-invalid` on newPassword, no PATCH | EP | A+B | [NEW] | rejects new password missing an uppercase letter (no API call) |
| 4-EP-empty | `new=""` | `aria-invalid`, no PATCH | EP | A+B | [NEW] | rejects new password empty (no API call) |
| 4-EP-no-lower | `new=NEWPASS@123` | `aria-invalid`, no PATCH | EP | A+B | [NEW] | rejects new password missing a lowercase letter (no API call) |
| 4-EP-no-digit | `new=NewPass@!!` | `aria-invalid`, no PATCH | EP | A+B | [NEW] | rejects new password missing a digit (no API call) |
| 4-EP-no-special | `new=NewPass123` | `aria-invalid`, no PATCH | EP | A+B | [NEW] | rejects new password missing a special character (no API call) |
| 4-current-empty | `current=""`, new/confirm valid | `aria-invalid` on currentPassword, no PATCH | EP | A+B | [NEW] | rejects an empty current password (no API call) |
| 4-DT row iii | `current=WrongPass@123`, `new=newpass@123` | client policy blocks newPassword first → no PATCH | DT | A+B | [NEW] | client policy wins when both current is wrong and new is invalid (no API call) |
| 5-pristine-disabled | empty pristine form | Save + Cancel disabled, no PATCH | EP | A+B | [NEW] | disables actions and blocks submit when the form is pristine |
| 6-BVA-7chars | `new=Ab@3xyz` (7 chars) | `aria-invalid`, no PATCH | BVA | A+B | [NEW] | rejects a new password of 7 characters (below the minimum, no API call) |
| 6-BVA-129chars | `new=Ab@3 + x*125` (129 chars) | `aria-invalid`, no PATCH | BVA | A+B | [NEW] | rejects a new password of 129 characters (above the maximum, no API call) |
| 6-BVA-8chars | `new=Ab@3xyzz` (8 chars), `current=User@123` — **MOCK 200** | mocked 200, toast success (client policy accepts 8 chars; no real change, no self-revert) | BVA | A+B | [NEW] | accepts a new password of exactly 8 characters (boundary) |
| 8-render-labels | render `/account-settings` | Current/New/Confirm inputs + `Update Password` button visible | — | A+B | [NEW] | renders the change-password form with the expected English labels |
| 9-vi-render | goto `/vi/account-settings` | heading `Đổi mật khẩu` visible | i18n | A+B | [NEW] | renders the form in Vietnamese on the /vi route |
| 9-vi-error | `/vi`, `current=WrongPass@123`, new/confirm valid — **MOCK 400** | mocked 400 `CHANGE_PASSWORD_WRONG_CURRENT` → vi error `Mật khẩu hiện tại không đúng` visible | i18n | A+B | [NEW] | shows the Vietnamese wrong-current error on the /vi route |
| 10-error-500 | `page.route` PATCH → 500 | toast `Failed to update password`, form keeps values, still authed | error-guessing | A+B | [NEW] | shows an error toast and keeps form values when the API fails (500) |
| 10-loading-state | `page.route` PATCH held pending then **aborted** | 3 inputs `disabled` while in flight; abort (not fake-200) → no success handler, no session contamination | error-guessing | A+B (lean B) | [NEW] | disables inputs while the change-password request is in flight |
| 11-ST-invalid | context#2 login pre-change captures refresh cookie; context#1 changes; context#2 reuses stale cookie on `/auth/token/refresh` | `401` or `403` (`PasswordNotChangedGuard`) | ST | A only | [NEW] MANDATORY | revokes other-device refresh token after password change (ST invalid) |
| 11-double-submit | click Save twice rapidly — **MOCK 200 (delayed 800ms)** | exactly 1 PATCH (Save disabled while pending), toast success | error-guessing | A only | [NEW] | fires exactly one PATCH on rapid double-submit |
| 11-rate-limit-429 | 6 PATCH attempts (wrong current) in window | 6th → `429` | BVA | A only | [NEW] DEFER (`test.skip`) | rate-limits change-password after 5 attempts in the window (6th -> 429) |
| 12-tab-order | Tab from current input | focus reaches new then confirm in DOM order | a11y | A+B | [NEW] | tabs through fields and toggles in DOM order |
| EG-trailing-space | paste `"NewPass@123 "` into new + confirm (no submit) | observe-only: record `aria-invalid` state | error-guessing | A+B | [NEW] (observe) | documents trailing-space handling in the new password (observe only) |

\* Rows 1+1b are `A only` in practice because the happy path mutates the real
password (placed in describe 2, runs **last** in that describe). The matrix labels
it `A+B`; gate B verifies render only, not the mutation.

Note: rows 4-wrong-current, 4-new-equals-current, 9-vi-error, 1c, 6-BVA-8chars,
and 11-double-submit are now **`page.route` MOCKED** (no real PATCH) to keep the
suite within the BE rate-limit bucket (≤4 real PATCHes/run). Their FE-behavior
intent (error mapping, success handling, in-flight guard) is fully preserved by the
mocked server responses. See the "BE rate-limit constraint" section above.

---

## N/A registry (no silent gaps)

| Matrix row | Reason N/A |
|---|---|
| 3 — AuthZ | Endpoint has only `authGuard`; self-service. `authId` comes from the JWT via `RequestContext`, never trusted from the body → no role/ownership surface to escalate. No test. |
| 6 — Password-history depth | No reuse-history policy beyond `new != current`. No test. |
| 6 — Pagination | No list/table surface. No test. |
| 7 — Filter / search | Feature is a 3-field form; no list/table/filter/search surface. No test. |
| 8 — Format-checking | No date/number/currency/relative-time surface to format-check. Render covered by labels test. |

---

## DEFER registry (kept, not dropped — each has reason + mitigation)

| Item | Status | Reason | Mitigation / re-enable condition |
|---|---|---|---|
| 11-rate-limit-429 | `test.skip` in describe 3 | Limit keyed by IP+user over a 15-min window backed by Redis; the bucket is shared across runs, so without a flush hook / short test-only window the test is order- and state-dependent (flaky). | Enable when the test env provides a short window OR a per-test Redis bucket reset before the test. Run isolated, last in describe 3. |
| 5-tooltip-text (`noChanges`) | DEFER → gate B | Radix tooltip renders text only on hover; transient/visual. | Gate A asserts the `disabled` state (proves the forcing-function); gate B MCP walk asserts the tooltip text on hover via `browser_snapshot`. |
| 10-loading-spinner (visual) | DEFER → gate B | Visual spinner is hard to assert deterministically at gate A. | Gate A asserts inputs `disabled` in flight; gate B observes the spinner visually. |
| 12-announce (`announce.saving`) | DEFER → gate B | `#announcer` (`aria-live=polite`) writes `announce.saving` ("Updating password...") then overwrites with `announce.saved` ("Password updated.") too fast to assert the transient value deterministically at gate A. | Gate B MCP walk captures the aria-live region during submit; gate A may assert the final `announce.saved` after success. |

---

## Mapping (cover-by — not duplicated as separate tests)

- **11-ST-valid → folded into the happy path** (`happy path updates password and
  keeps the session (reload stays authed)`). The matrix's "session survives with new
  token" is verified at the browser layer by the happy path's post-change reload —
  only the REAL change rotates the cookie, so a mock cannot prove it.
- **4-DT row ii (currentOK + newInvalid) → covered by the [EP] worked example**
  (`rejects new password missing an uppercase letter`), which uses a correct current
  password and an invalid new password → client policy blocks, no PATCH.
- **12-role-label → covered implicitly** by every `getByLabel(..., { exact: true })` +
  `getByRole("heading"/"button")` selector (proves label↔input association). No separate test.

---

## Error-guessing observation log (fill after a real run)

- **EG-trailing-space** (`"NewPass@123 "` into new + confirm, no submit): the test is
  exploratory and asserts only that the page does not crash and records the
  `aria-invalid` state of newPassword. **Observed result: _to be filled after a live run_**
  — record (a) does the client policy flag the trailing space? (b) if submitted, does the
  BE trim or reject? If a surprising behavior is found (e.g. the space reaches the hash),
  flag a follow-up — do NOT change app code in the test.

---

## Contamination & isolation notes

- Describe 3 (token-revoke + double-submit + rate-limit) runs isolated; it revokes
  refresh tokens and consumes the rate-limit window.
- Gate B uses its OWN auth context (cookie on localhost is not scoped by port → a fresh
  context uses `clearCookies()` + `storageState: undefined`). Gate B never shares
  storageState with gate A.
- Every `A only` row: gate B verifies read/render only, never mutates in parallel.
- The loading-mock test holds the PATCH pending then **aborts** it (no fake-200
  success handler), then navigates fresh + waits for the heading — leaving a
  known-good authenticated page for the next serial test (previously it fulfilled a
  fake 200 then reloaded mid-flight, which raced the refresh-token rotation and
  logged the shared session out, breaking the next test's beforeEach).
- See the "Session-contamination controls" subsection under "BE rate-limit
  constraint" for the full set of real-change controls (run order, storageState
  re-establishment, the 1.1s iat-race wait in token-revoke).

---

## Revert notes

- `afterAll → ensureDefaultPassword(KNOWN_CANDIDATE_PASSWORDS)` runs in describe 2
  and describe 3 (every describe with a real change). It logs in with
  `DEFAULT_PASSWORD` first; if not default, it changes back from whichever known
  candidate works, then re-saves `e2e/.auth/user.json` with a fresh DEFAULT-based
  storageState (the real change revoked the auth.setup token).
- After the real happy-path change, `reestablishStorageState(page, NEW_PASSWORD)`
  re-captures a valid cookie so the next browser context stays authed.
- **6-BVA-8chars is now MOCKED** (200) — it no longer sets a real third password,
  so no self-revert is needed.
- All real-mutation tests are idempotent and leave the seed user at
  `DEFAULT_PASSWORD`. **Verified live:** `POST /api/v1/auth/login` with
  `user@test.com / User@123` returns `200` after a full run.
- Real change-password PATCHes per run: **4** (verified: bucket counter = 4 < 5).

---

## Env preconditions (CLAUDE.md §4.3 app-running)

- `E2E_BASE_URL` (defaults to `http://localhost:3000`; worktree dev server may use a
  different port resolved from `.worktree-state.json`).
- `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` — seed/admin credentials used by `auth.setup.ts`
  and the helper.
- App running: BE :5000 + FE :3000 + Mongo + Redis (Redis required for the rate-limit
  scenario when un-skipped).

---

## Follow-ups flagged (no app code changed)

- **Tab order:** each `PasswordInput` renders a show/hide toggle button AFTER its input
  (`src/components/PasswordInput/index.tsx`), so the keyboard order is
  `current input → current toggle → new input → new toggle → confirm input → confirm toggle → Cancel → Save`.
  The 12-tab-order test accounts for the toggle (two `Tab` presses per field). If the
  toggle in the tab order is considered undesirable for a11y, that is a follow-up for the
  app team — not changed here.
