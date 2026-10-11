# PWD — password recovery and change

Test cases for `REQ-PWD-01` … `REQ-PWD-05` (`docs/requirements.md`).

**Sources.** Client: `client/src/views/ForgotPasswords/**`,
`client/src/views/Profile/mains/ChangePasswordCard`,
`client/src/views/ForceChangePassword/**`,
`client/src/layouts/AuthGuardLayout/ghosts/MustChangePasswordGate`, zod rules in
`client/src/forms/{ChangePassword,ForgotPasswordReset}` and
`client/src/schemas` (`passwordSchema`), copy in
`client/src/locales/{en,vi}/{account,forgotPassword,forgotPasswordReset,forceChangePassword,common}.json`.
Server: `server/src/modules/forgot-password/**`,
`server/src/modules/change-password/**`, `adminResetPassword` in
`server/src/modules/user/services`, Joi rules in
`server/src/validators/schemas/{forgot-password,change-password,base}.ts`,
limits in `server/src/constants/redis/rate-limit`.
Converted from `docs/specs/change-password/e2e.md` (every scenario row,
TC-PWD-001 … -025) and the force-change half of
`docs/specs/admin-reset-password/e2e.md` (S2, TC-PWD-030 … -045).

**Password policy (both sides).** 8–128 characters, at least one lower-case,
upper-case, digit and one of `@$!%*?&`, nothing else. EP classes: valid /
empty / no upper / no lower / no digit / no special. BVA: 7 · 8 · 128 · 129.

**Data.** Every case that changes, resets or recovers a password uses a
throwaway from `createAccount()`; the seeded `user@test.com` is only used
where every server answer is a `page.route` mock or client validation blocks
the request. OTPs and magic-link tokens are planted after the real send call
(`plantCode`). The admin-reset temp password is read from the queued
`ADMIN_RESET_PASSWORD` email (`helpers/password.ts → readQueuedEmail`) — the
real channel that carries it — which unblocks the round trip the old spec
marked untestable.

**Old-matrix rows not given their own case.** change-password rows 3 (AuthZ —
self-service, `authId` from the JWT), 6 (password history), 7 (filter/search)
and 8 (format) were N/A in the old spec and stay N/A. Gate-B-only items
(Radix tooltip text, spinner, transient `announce.saving`) are visual and are
not separate cases; their forcing functions (disabled state, in-flight
disable) are TC-PWD-010 / -015. The old `test.fixme` for force-change AuthZ
is now TC-PWD-041; the one for pre-reset token revocation is TC-PWD-043.

## Change password on the profile page (REQ-PWD-03)

### TC-PWD-001 — Changing the password keeps the current session

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P1 · **Role:** guest + throwaway sign-in
- **Technique:** State Transition (valid: old password → new password, session rotated)
- **Preconditions:** a throwaway account signed in on `/profile`
- **Steps:**
  1. Enter the current password and a valid new one twice; click "Update Password".
  2. Reload the page.
- **Expected:** "Password updated successfully"; still on `/profile` after the
  reload (this device's refresh cookie was rotated); the new password signs
  in, the old one is refused.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-002 — A 200 from the server shows success and stays on the page

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (server answer: success)
- **Preconditions:** PATCH mocked to 200
- **Steps:**
  1. Fill a valid form, submit.
- **Expected:** success toast, URL stays `/profile`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-003 — Signed-out visitors cannot reach the form

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (direct URL without a session)
- **Preconditions:** none
- **Steps:**
  1. Open `/profile`.
- **Expected:** redirected to `/login`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-004 — A mismatched confirmation is blocked on the client

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (confirm ≠ new)
- **Preconditions:** `/profile`
- **Steps:**
  1. Enter a valid current and new password and a different confirmation; submit.
- **Expected:** confirm field `aria-invalid="true"`; no PATCH is sent.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-005 — A wrong current password is shown on the current-password field

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (current wrong × new valid)
- **Preconditions:** PATCH mocked to 400 `CHANGE_PASSWORD_WRONG_CURRENT`
- **Steps:**
  1. Submit with a wrong current password.
- **Expected:** "Current password is incorrect" under the current field, which is `aria-invalid`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-006 — A new password equal to the current one is shown on the new-password field

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Decision Table (new = current)
- **Preconditions:** PATCH mocked to 400 `CHANGE_PASSWORD_SAME_AS_CURRENT`
- **Steps:**
  1. Submit with new = current.
- **Expected:** "New password must be different from your current password", new field `aria-invalid`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-007 — Each invalid password class is blocked before the API

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (empty / no upper / no lower / no digit / no special)
- **Preconditions:** `/profile`
- **Steps:**
  1. For each class, enter it as new + confirm and submit.
- **Expected:** new field `aria-invalid`; no PATCH.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-008 — An empty current password is blocked

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (empty current)
- **Preconditions:** `/profile`
- **Steps:**
  1. Fill new + confirm, type then clear the current field, submit.
- **Expected:** current field `aria-invalid`; no PATCH.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-009 — Client policy wins when current is wrong and new is invalid

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Decision Table (current wrong × new invalid)
- **Preconditions:** `/profile`
- **Steps:**
  1. Wrong current, policy-violating new; submit.
- **Expected:** new field `aria-invalid`; no PATCH (the server is never asked).
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-010 — A pristine form cannot be submitted or cancelled

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** State Transition (pristine)
- **Preconditions:** `/profile`, nothing typed
- **Steps:**
  1. Look at the card's buttons.
- **Expected:** "Update Password" and the card's "Cancel" are disabled; no PATCH.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-011 — New-password length boundaries in the form

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** BVA (7 reject · 8 accept · 129 reject)
- **Preconditions:** PATCH mocked to 200 for the accepted case
- **Steps:**
  1. Submit a 7-, 8- and 129-character policy-valid password.
- **Expected:** 7 and 129 are `aria-invalid` with no PATCH; 8 reaches the server and shows success.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-012 — The form renders its labelled fields

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** —
- **Preconditions:** `/profile`
- **Steps:**
  1. Locate Current / New / Confirm New Password by label and the submit button.
- **Expected:** all visible (labels are programmatically tied to inputs).
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-013 — The form and its server error are Vietnamese under /vi

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** EP (locale vi)
- **Preconditions:** `/vi/profile`; PATCH mocked to 400 wrong-current for step 2
- **Steps:**
  1. Check the heading.
  2. Submit with a wrong current password.
- **Expected:** heading "Đổi mật khẩu"; error "Mật khẩu hiện tại không đúng".
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-014 — A server failure keeps the values and shows an error

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (500)
- **Preconditions:** PATCH mocked to 500
- **Steps:**
  1. Submit a valid form.
- **Expected:** "Server error. Please try again later." (global 5xx toast — the
  card maps only field errors; the old spec's "Failed to update password" is
  never rendered); values kept; still on `/profile`.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-015 — Inputs are disabled while the request is in flight

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (slow network)
- **Preconditions:** PATCH held, then aborted
- **Steps:**
  1. Submit a valid form.
- **Expected:** the three inputs are disabled until the request settles.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-016 — A rapid double click sends exactly one PATCH

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P2 · **Role:** user
- **Technique:** Error Guessing (double submit)
- **Preconditions:** PATCH mocked to a delayed 200
- **Steps:**
  1. Click "Update Password", then force-click it again.
- **Expected:** one PATCH; success toast.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-017 — Keyboard focus follows the field order

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Accessibility
- **Preconditions:** `/profile`
- **Steps:**
  1. Tab from the current field (each field has a show/hide toggle after it).
- **Expected:** current → toggle → new → toggle → confirm.
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

### TC-PWD-018 — A trailing space in the new password does not break the form

- **Requirement:** REQ-PWD-03
- **Layer:** e2e · **Priority:** P3 · **Role:** user
- **Technique:** Error Guessing (whitespace)
- **Preconditions:** `/profile`
- **Steps:**
  1. Type `NewPass@123 ` (trailing space) in new and confirm; do not submit.
- **Expected:** the page stays usable and the field reports a defined
  `aria-invalid` state (observation only — nothing is submitted; both
  policies reject the space at submit time, TC-PWD-007's pattern).
- **Automated:** `tests/e2e/password/change-password.e2e.ts`

## Change password — API (REQ-PWD-03, REQ-PWD-05)

### TC-PWD-019 — A password change signs out the other sessions

- **Requirement:** REQ-PWD-05
- **Layer:** api · **Priority:** P1 · **Role:** throwaway
- **Technique:** State Transition (invalid: refresh with a pre-change token)
- **Preconditions:** a throwaway signed in twice ("other device", "this device")
- **Steps:**
  1. Refresh with the other device's cookie (200).
  2. Change the password from this device.
  3. Refresh with the other device's cookie again.
- **Expected:** step 3 → 403 `AUTH_PASSWORD_CHANGED` (tokenVersion bumped).
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PWD-020 — Change password without a token is refused

- **Requirement:** REQ-PWD-03
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (missing auth)
- **Preconditions:** none
- **Steps:**
  1. `PATCH /auth/change-password` with no Authorization header.
- **Expected:** 401 `AUTH_MISSING_TOKEN`.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PWD-021 — Each failing rule has its own error and changes nothing

- **Requirement:** REQ-PWD-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** Decision Table (R1 current missing · R2 new fails policy · R3 confirm mismatch · R4 current wrong · R5 new = current)
- **Preconditions:** a throwaway session (≤ 5 PATCHes — the limiter counts every attempt)
- **Steps:**
  1. Send one request per rule.
- **Expected:** R1–R3 → 400 `VALIDATION_ERROR` naming the field; R4 → 400
  `CHANGE_PASSWORD_WRONG_CURRENT`; R5 → 400 `CHANGE_PASSWORD_SAME_AS_CURRENT`;
  the original password still signs in.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PWD-022 — New-password length boundaries on the server

- **Requirement:** REQ-PWD-03
- **Layer:** api · **Priority:** P2 · **Role:** throwaway
- **Technique:** BVA (7 · 8 · 128 · 129)
- **Preconditions:** one throwaway per length
- **Steps:**
  1. Change to a policy-valid password of each length.
- **Expected:** 7 and 129 → 400; 8 and 128 → 200.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PWD-023 — A successful change returns a fresh session

- **Requirement:** REQ-PWD-03
- **Layer:** api · **Priority:** P1 · **Role:** throwaway
- **Technique:** State Transition (valid)
- **Preconditions:** a throwaway session
- **Steps:**
  1. Change the password.
  2. Call `GET /users/me` with the returned access token; sign in with old and new passwords.
- **Expected:** 200 with access + id token (`mustChangePassword: false`) and a
  rotated `refreshToken` cookie; the new token works; old password 401, new 200.
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PWD-024 — Change-password errors are translated

- **Requirement:** REQ-PWD-03
- **Layer:** api · **Priority:** P3 · **Role:** throwaway
- **Technique:** Error Guessing (i18n key leak)
- **Preconditions:** a throwaway session
- **Steps:**
  1. Submit a wrong current password.
- **Expected:** `message` is "Current password is incorrect". **Known bug** —
  the server never loads the `changePassword` i18n namespace, so it answers
  `errors.wrongCurrentPassword` (spec marked `test.fail`).
- **Automated:** `tests/api/password/change-password.api.ts`

### TC-PWD-025 — Change password is throttled after five attempts

- **Requirement:** REQ-PWD-03
- **Layer:** api · **Priority:** P3 · **Role:** throwaway
- **Technique:** BVA (attempt 5 allowed / 6 throttled)
- **Preconditions:** `keepRateLimits: true`; the key is ip + this throwaway's authId
- **Steps:**
  1. Send six wrong-current attempts.
- **Expected:** 1–5 → 400; 6 → 429. (Was `test.skip` in the old spec; a
  per-account key plus the rate-limit fixture make it deterministic.)
- **Automated:** `tests/api/password/change-password.api.ts`

## Forced change after an admin reset (REQ-PWD-04, REQ-PWD-05)

### TC-PWD-030 — A must-change session is sent to /change-password and released after the change

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P1 · **Role:** mocked session
- **Technique:** State Transition (must-change → changed)
- **Preconditions:** token refresh mocked with `mustChangePassword: true`; PATCH mocked to 200
- **Steps:**
  1. Open `/`.
  2. Fill the form, submit.
- **Expected:** redirected to `/change-password` ("Set a new password"),
  "You must set a new password before continuing." announced; after submit,
  success toast and HOME.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-031 — Signed-out visitors cannot open /change-password

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** admin storage, cookies cleared
- **Technique:** Error Guessing
- **Preconditions:** empty storage state
- **Steps:**
  1. Open `/change-password`.
- **Expected:** `/login`.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-032 — Forced-change form blocks invalid input before the API

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** EP (confirm mismatch; new empty / no upper / no lower / no digit / no special; empty temp password)
- **Preconditions:** must-change session on `/change-password`
- **Steps:**
  1. Submit each invalid combination.
- **Expected:** the offending field is `aria-invalid`; no PATCH.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-033 — Wrong temp password vs. invalid new password

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** Decision Table (temp wrong × new valid → server error on temp; temp ok × new invalid → client blocks)
- **Preconditions:** PATCH mocked to 400 wrong-current for the first row
- **Steps:**
  1. Submit each row.
- **Expected:** row 1 "Current password is incorrect" on the temp field; row 2 new field invalid, no PATCH.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-034 — A normal session cannot open /change-password

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** State Transition (invalid: no flag → forced screen)
- **Preconditions:** `mustChangePassword: false`
- **Steps:**
  1. Open `/change-password`.
- **Expected:** sent to HOME.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-035 — Forced-change new-password length boundaries

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** BVA (7 · 8 · 128 · 129)
- **Preconditions:** PATCH mocked to 200 for accepted lengths
- **Steps:**
  1. Submit each length.
- **Expected:** 7 / 129 blocked on the client; 8 / 128 succeed.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-036 — The forced screen shows labels, never keys or claims

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P3 · **Role:** mocked session
- **Technique:** Error Guessing (raw key / claim leak)
- **Preconditions:** must-change session
- **Steps:**
  1. Open `/change-password`.
- **Expected:** labelled fields and submit; no `forceChangePassword.*` text, no "mustChangePassword", no bare "true".
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-037 — The forced screen in English and Vietnamese

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** EP (locale en / vi)
- **Preconditions:** must-change session
- **Steps:**
  1. Open `/` (en) and `/vi/change-password`.
- **Expected:** en "Set a new password" / "Temporary password"; vi "Đặt mật khẩu
  mới", "Mật khẩu tạm", "Xác nhận mật khẩu mới"; no raw keys.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-038 — Forced-change server failure and in-flight state

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** Error Guessing (500, slow network)
- **Preconditions:** PATCH mocked to 500 / held
- **Steps:**
  1. Submit against a 500; submit against a held request.
- **Expected:** "Server error. Please try again later.", still on `/change-password`; while held, inputs and submit disabled.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-039 — After the change the gate does not bounce back; one PATCH per submit

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P2 · **Role:** mocked session
- **Technique:** State Transition (valid), Error Guessing (double submit)
- **Preconditions:** PATCH mocked to 200 (delayed for the double-submit row)
- **Steps:**
  1. Submit; wait on HOME.
  2. Submit and force-click again.
- **Expected:** stays on HOME; exactly one PATCH.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-040 — The forced form works from the keyboard

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P3 · **Role:** mocked session
- **Technique:** Accessibility
- **Preconditions:** must-change session
- **Steps:**
  1. Tab through the fields to the submit button; press Enter there.
- **Expected:** focus order temp → toggle → new → toggle → confirm → toggle → submit; Enter sends exactly one PATCH and lands on HOME.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-041 — The gate applies to every role and every page

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P1 · **Role:** mocked session (admin and user claims)
- **Technique:** Decision Table (role admin / user × target page)
- **Preconditions:** `mustChangePassword: true`
- **Steps:**
  1. As admin open `/admin`; as user open `/apps`, `/profile`, `/vi/favorites`.
- **Expected:** every visit ends on `/change-password`.
- **Automated:** `tests/e2e/password/force-change.e2e.ts`

### TC-PWD-042 — Real admin reset: forced change with the emailed temp password

- **Requirement:** REQ-PWD-04
- **Layer:** e2e · **Priority:** P1 · **Role:** admin (API) + throwaway in the browser
- **Technique:** State Transition (active → reset/must-change → changed)
- **Preconditions:** a throwaway; temp password from the queued email
- **Steps:**
  1. Admin resets the account; sign in with the temp password; open `/` and `/apps`.
  2. Enter the temp password and a new one; submit; open `/apps`.
- **Expected:** old password 401; both visits in step 1 land on
  `/change-password`; after the change HOME, then `/apps` opens; the new
  password signs in with `mustChangePassword: false`; the temp password no
  longer works.
- **Automated:** `tests/e2e/password/admin-reset.e2e.ts`

### TC-PWD-043 — An admin reset signs out the user's existing sessions

- **Requirement:** REQ-PWD-05
- **Layer:** api · **Priority:** P1 · **Role:** admin
- **Technique:** State Transition (invalid: refresh with a pre-reset token)
- **Preconditions:** a throwaway signed in before the reset
- **Steps:**
  1. Admin resets the account; refresh with the pre-reset cookie; sign in with the old password.
- **Expected:** refresh 403; old password 401.
- **Automated:** `tests/api/password/admin-reset.api.ts`

### TC-PWD-044 — Temp-password sessions carry mustChangePassword until changed

- **Requirement:** REQ-PWD-04
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** State Transition
- **Preconditions:** a reset throwaway
- **Steps:**
  1. Sign in with the temp password; change it; sign in again.
- **Expected:** first idToken `mustChangePassword: true`; the change response
  and the next sign-in carry `false`; the temp password is then refused.
- **Automated:** `tests/api/password/admin-reset.api.ts`

### TC-PWD-045 — The API refuses a must-change session outside the change endpoint

- **Requirement:** REQ-PWD-04
- **Layer:** api · **Priority:** P2 · **Role:** admin
- **Technique:** Error Guessing (bypass the client gate)
- **Preconditions:** a temp-password session
- **Steps:**
  1. Call `GET /users/me/favorites` with it.
- **Expected:** 403. **Known bug** — the flag is enforced only by the client
  gate; the API answers 200 (spec marked `test.fail`).
- **Automated:** `tests/api/password/admin-reset.api.ts`

## Forgot password in the browser (REQ-PWD-01, REQ-PWD-02)

### TC-PWD-050 — Recovery pages need an email in the URL

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** Error Guessing (missing query parameter)
- **Preconditions:** none
- **Steps:**
  1. Open `/forgot-password`, `/forgot-password/otp`, `/forgot-password/reset?email=…` (no token).
- **Expected:** each ends on `/login`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-051 — The options page lists the recovery methods

- **Requirement:** REQ-PWD-01, REQ-PWD-02
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** —
- **Preconditions:** `/forgot-password?email=…`
- **Steps:**
  1. Read the page; click "Change email".
- **Expected:** "Password Recovery", the email, buttons for OTP, Magic Link,
  Contact administrator; 2FA shown with "Unavailable" and not a button;
  "Change email" goes to `/login`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-052 — Recovery by one-time code

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (options → code → new password → login)
- **Preconditions:** a throwaway; code planted after the real send
- **Steps:**
  1. Choose "Send OTP via email"; enter the code.
  2. Enter a new password twice; "Reset password".
- **Expected:** `/forgot-password/otp` → `/forgot-password/reset?…&token=…` →
  "Password reset successfully! Redirecting to login..." → `/login`; the new
  password signs in, the old one does not.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-053 — A wrong code clears the boxes and says how many tries remain

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (invalid code)
- **Preconditions:** a throwaway on the code step
- **Steps:**
  1. Enter `000000`.
- **Expected:** verify answers 401; "Invalid OTP. 4 attempts remaining"; boxes empty; still on the code step.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-054 — The new-password form enforces the policy before the API

- **Requirement:** REQ-PWD-01, REQ-PWD-02
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP + BVA (7 chars · no upper · no digit · no special · mismatch)
- **Preconditions:** `/forgot-password/reset?email=…&token=…`
- **Steps:**
  1. Submit each invalid value.
- **Expected:** the policy message ("Password must be at least 8 characters",
  "Password must contain uppercase, lowercase, number and special character",
  "Passwords do not match"); no POST `/reset`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-055 — Recovery by magic link

- **Requirement:** REQ-PWD-02
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (options → check email → link → new password → login)
- **Preconditions:** a throwaway; link token planted after the real send;
  repeat verify calls answered with the first response (single-mount
  behaviour — see TC-PWD-063)
- **Steps:**
  1. Choose "Send Magic Link"; open `/forgot-password/reset?…&method=magic-link`.
  2. Enter a new password twice; "Reset password".
- **Expected:** "Check your email"; the form unlocks after verification; success toast, `/login`; new password signs in.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-056 — The link in the reset email opens the form

- **Requirement:** REQ-PWD-02
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** Error Guessing (link target)
- **Preconditions:** a throwaway; the link read from the queued `MAGIC_LINK` email
- **Steps:**
  1. Request a magic link; open the emailed URL.
- **Expected:** "Set new password". **Known bug** — the email links to
  `/reset-password?…`, a route the client does not have (404); spec marked `test.fail`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-057 — An invalid or used link shows the expired message

- **Requirement:** REQ-PWD-02
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (invalid: link not issued / consumed)
- **Preconditions:** a throwaway, a token the server never issued
- **Steps:**
  1. Open the reset URL with `method=magic-link`.
- **Expected:** "This link is invalid or has expired. Please request a new one."; no reset button.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-058 — Recovery screens in Vietnamese

- **Requirement:** REQ-PWD-01, REQ-PWD-02
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (locale vi)
- **Preconditions:** none
- **Steps:**
  1. Open `/vi/forgot-password?email=…` and `/vi/forgot-password/reset?…`.
- **Expected:** "Khôi phục mật khẩu", "Gửi mã OTP qua email", "Gửi Magic Link";
  "Tạo mật khẩu mới", "Mật khẩu mới", "Xác nhận mật khẩu", "Đặt lại mật khẩu".
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-059 — A reset token the server no longer holds is refused in the UI

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (invalid: stale reset token)
- **Preconditions:** a throwaway; a well-formed but unknown token
- **Steps:**
  1. Submit a valid new password.
- **Expected:** "Invalid or expired reset token. Please start over"; stays on the page; the old password still works.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-060 — The code step shows the resend countdown and a way back

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** State Transition (cooldown)
- **Preconditions:** a code was just sent
- **Steps:**
  1. Look at the resend button; click "Try another method".
- **Expected:** "Resend in Ns", disabled; back on the options page.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-061 — "Forgot Password?" on the password step carries the email

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** —
- **Preconditions:** `/login/password?email=…`
- **Steps:**
  1. Click "Forgot Password?".
- **Expected:** `/forgot-password?email=<same email>`, "Password Recovery".
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-062 — The unavailable 2FA option is exposed as disabled

- **Requirement:** REQ-PWD-01
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** Accessibility
- **Preconditions:** options page
- **Steps:**
  1. Find the 2FA card by its accessible name.
- **Expected:** named "Two-Factor Authentication (2FA) - Unavailable" with
  `aria-disabled="true"`. **Known bug** — `FadeSlideLeft` drops the aria props;
  spec marked `test.fail`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

### TC-PWD-063 — Opening a magic link verifies it once

- **Requirement:** REQ-PWD-02
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (non-idempotent mount effect)
- **Preconditions:** a throwaway with a planted link token
- **Steps:**
  1. Open the reset URL; count `magic-link/verify` requests.
- **Expected:** exactly one. **Known bug** — the verify runs in an unguarded
  mount effect; under the dev build's StrictMode it fires twice, and the race
  either shows "link expired" or mints a second reset token that invalidates
  the first. Spec marked `test.fail`.
- **Automated:** `tests/e2e/password/forgot-password.e2e.ts`

## Forgot password — API (REQ-PWD-01, REQ-PWD-02, REQ-PWD-05)

### TC-PWD-070 — Sending a code does not reveal whether the account exists

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (known / unknown email)
- **Preconditions:** a throwaway and an unregistered address
- **Steps:**
  1. `POST /otp/send` for each.
- **Expected:** both 200 `{ success: true, expiresIn: 300, cooldown: 60 }`; only the real account has a stored code.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-071 — A second send inside the cooldown is refused

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (cooldown)
- **Preconditions:** a code just sent
- **Steps:**
  1. Send again.
- **Expected:** 400 `FORGOT_PASSWORD_OTP_COOLDOWN`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-072 — Malformed email and code are rejected

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP + BVA (email missing / empty / malformed; code 5 · 7 digits, letters); unknown account
- **Preconditions:** none
- **Steps:**
  1. Send each to `/otp/send` or `/otp/verify`.
- **Expected:** 400 `VALIDATION_ERROR`; a well-formed code for an unknown email → 401 `FORGOT_PASSWORD_AUTH_NOT_FOUND`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-073 — Wrong codes count down and the fifth locks verification

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** BVA (attempt 4 / 5), State Transition (open → locked)
- **Preconditions:** a throwaway with a planted code
- **Steps:**
  1. Verify a wrong code five times; then the right code.
- **Expected:** attempts 1–4 → 401 `FORGOT_PASSWORD_OTP_INVALID` with 4…1
  remaining; attempt 5 → 400 `FORGOT_PASSWORD_OTP_LOCKED`; the right code is then also refused as locked.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-074 — Code → reset token → new password

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (valid)
- **Preconditions:** a throwaway
- **Steps:**
  1. Send, plant, verify; reset with the returned token.
- **Expected:** a 128-hex reset token; reset 200 `{ success: true }`; old password 401, new 200.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-075 — A verified code cannot be reused

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (invalid: verify a consumed code)
- **Preconditions:** a code already verified
- **Steps:**
  1. Verify the same code again.
- **Expected:** 401 `FORGOT_PASSWORD_OTP_INVALID`.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-076 — Reset rejects malformed input and a token of another account

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (weak password, 127-char token, non-hex token), Error Guessing (token reuse across emails)
- **Preconditions:** two throwaways for the cross-account row
- **Steps:**
  1. Send each malformed body; reset account B with account A's token.
- **Expected:** malformed → 400 `VALIDATION_ERROR`; cross-account → 401 and B's password unchanged.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-077 — A consumed reset token cannot reset again

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (invalid: reuse a consumed token)
- **Preconditions:** a reset just done
- **Steps:**
  1. Reset again with the same token and another password.
- **Expected:** 401 `FORGOT_PASSWORD_INVALID_RESET_TOKEN`; the first new password still works.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-078 — A reset signs out the account's other sessions

- **Requirement:** REQ-PWD-05
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (invalid: refresh with a pre-reset token)
- **Preconditions:** a throwaway signed in before the reset
- **Steps:**
  1. Reset by code; refresh with the pre-reset cookie.
- **Expected:** 403 (was 200 before the reset).
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-079 — A locked account gets the generic answer and no code

- **Requirement:** REQ-PWD-01
- **Layer:** api · **Priority:** P2 · **Role:** admin (lock) + guest
- **Technique:** EP (inactive account)
- **Preconditions:** a throwaway locked by an admin
- **Steps:**
  1. Send a code.
- **Expected:** the same 200 body as TC-PWD-070; no code stored.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-080 — Magic link → reset token → new password; the link works once

- **Requirement:** REQ-PWD-02
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (valid, then invalid reuse)
- **Preconditions:** a throwaway; link token planted
- **Steps:**
  1. Send; verify the token; verify it again; reset with the reset token.
- **Expected:** send 200 `{ expiresIn: 900, cooldown: 60 }`; first verify 200
  with a reset token; second 401 `FORGOT_PASSWORD_MAGIC_LINK_INVALID`; reset 200, new password signs in.
- **Automated:** `tests/api/password/forgot-password.api.ts`

### TC-PWD-081 — Wrong or malformed link tokens and the link cooldown

- **Requirement:** REQ-PWD-02
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (wrong token, 126-char token), State Transition (cooldown)
- **Preconditions:** a link just sent
- **Steps:**
  1. Verify a wrong 128-hex token, a 126-char token; send again.
- **Expected:** 401 `FORGOT_PASSWORD_MAGIC_LINK_INVALID`; 400; 400 `FORGOT_PASSWORD_MAGIC_LINK_COOLDOWN`.
- **Automated:** `tests/api/password/forgot-password.api.ts`
