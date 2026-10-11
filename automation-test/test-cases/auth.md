# AUTH — test cases

Sign-in (email-first, password, one-time code, magic link, alternative
methods), sign-up with an emailed code, lockout and self-service unlock,
account-status refusals, rate limits, session continuity, logout and the
guest / private page guards (REQ-AUTH-01…15).

Source of truth: `client/src/views/{Logins,Signups}/**`,
`client/src/layouts/{SessionGate,AuthGuardLayout,GuestGuardLayout}`,
`client/src/stores/slices/auth.ts`, `client/src/libs/{axios,query-client}.ts`,
`client/src/locales/{en,vi}/{login,signup,common}.json`,
`server/src/modules/{login,signup,logout,token,unlock-account,session}`,
`server/src/validators/{constants.ts,schemas/{base,login,signup,unlock-account}.ts}`,
`server/src/constants/redis/{store,rate-limit}/index.ts`,
`server/src/i18n/locales/{en,vi}/*.json`.

**Layers.** `tests/e2e/auth/*.e2e.ts` prove what the user sees on
`/login`, `/login/{password,otp,magic-link,verify-magic-link,alternative}` and
`/signup/{otp,info}`. `tests/api/auth/*.api.ts` prove the contract: status
codes, error codes and copy, validation boundaries, state transitions, rate
limits, cookies and tokens.

**Test data.** Every case that fails a password, locks, unlocks, signs up or
logs out uses a throwaway account from `createAccount()` (or just a throwaway
_address_ when no account is needed). Inactive / unverified accounts are
throwaways whose `isActive` / `verifiedEmail` flags are set directly
(`helpers/auth.ts → setAuthFlags`) — the seeded `inactive@` / `unverified@`
accounts are not used because other specs may change them. The seeded
`user@test.com` is only ever sent its correct password. One-time codes, magic
-link tokens and unlock passwords are planted over the server-issued hash
(`plantCode`); waiting out a cooldown is simulated by deleting the cooldown
key. Rate-limit cases use `keepRateLimits`, delete the counters they read
first and all `rate-limit:*` keys afterwards. The server's default locale is
**Vietnamese**, so API cases send `Accept-Language: en` unless they test vi.

**Server facts the cases rely on.** Email: trimmed, lower-cased, Joi email,
3–254 chars, no control / zero-width characters. Password policy: 8–128 chars,
≥ 1 lower, upper, digit and one of `@$!%*?&`, no other characters. OTP: exactly
6 digits; sign-up and login codes live 5 min with a 60 s cooldown; 5 wrong
codes lock (sign-up: until the 15-min window ends; login: 15 min); sign-up
allows 5 resends / hour. Magic link: 128 lower-case hex chars, 15 min, 60 s
cooldown, single use. Password lockout: the 10th wrong password locks for
1800 s; a success resets the counter. Unlock: only an active **and** locked
account; 60 s cooldown, 3 requests / hour; the emailed temporary password is
≥ 12 chars, 15 min, single use, and sets `mustChangePassword`. Rate limits
(15-min windows): login 30 / IP; login code and magic link 10 / IP and 5 /
email; sign-up code 5 / IP and 3 / email.

### TC-AUTH-001 — A registered email continues to the password step

- **Requirement:** REQ-AUTH-01
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (registered address)
- **Preconditions:** seeded `user@test.com`
- **Steps:**
  1. Open `/login`, enter `user@test.com`, press **Continue with email**.
- **Expected:** URL is `/login/password?email=user%40test.com`; heading
  "Enter your password", the email badge and the password field are shown.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-002 — The email step validates the address before calling the API

- **Requirement:** REQ-AUTH-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (empty, malformed)
- **Steps:**
  1. Press **Continue with email** with the field empty.
  2. Enter `user@` and press it again.
- **Expected:** "Please enter email", then "Invalid email format" with
  `aria-invalid="true"`; the page stays on `/login` and no
  `/auth/signup/*` request is sent.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-003 — Email equivalence classes and length boundaries on the sign-in endpoint

- **Requirement:** REQ-AUTH-01, REQ-AUTH-05
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (empty, no domain, no `@`, double `@`, zero-width
  character), BVA (254 / 255 characters)
- **Steps:**
  1. `POST /auth/login` with each invalid email; then without `password`.
  2. `POST /auth/login` with a well-formed 254-character address.
- **Expected:** every invalid email → 400 `VALIDATION_ERROR` naming the
  `email` field; missing password → 400 "Password is required"; 254 chars
  passes validation (401 `LOGIN_INVALID_CREDENTIALS`).
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-004 — The email is trimmed and case-insensitive

- **Requirement:** REQ-AUTH-01, REQ-AUTH-05
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** EP (same address, different spelling)
- **Steps:**
  1. `POST /auth/login` with `"  USER@TEST.COM  "` and the right password.
- **Expected:** 200; the idToken's `email` is `user@test.com`.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-005 — Flow sub-steps without their parameters send the user back to login

- **Requirement:** REQ-AUTH-01, REQ-AUTH-04
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** Error Guessing (deep link / bookmark without query)
- **Steps:**
  1. Open `/login/password`, `/login/otp`, `/login/magic-link`,
     `/login/alternative`, `/login/verify-magic-link?email=…` (no token),
     `/signup`, `/signup/otp`, `/signup/info?email=…` (no session token).
- **Expected:** each ends on `/login` showing the "Welcome" email step.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-006 — An unknown email is sent a sign-up code and continues to verification

- **Requirement:** REQ-AUTH-02
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (unregistered address)
- **Steps:**
  1. On `/login` enter a never-registered address and continue.
- **Expected:** URL `/signup/otp?email=…`; heading "Verify Email", the email
  and the 6-digit instruction are shown; the server holds a sign-up code for
  the address and no account exists yet.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-007 — check-email tells a registered address from a free one

- **Requirement:** REQ-AUTH-02
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (registered, free, malformed)
- **Steps:**
  1. `GET /auth/signup/check-email/:email` for `user@test.com`, a free
     address and `not-an-email`.
- **Expected:** `{ available: false }`, `{ available: true }`, 400
  `VALIDATION_ERROR`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-008 — A new user signs up end to end and lands signed in on home

- **Requirement:** REQ-AUTH-03, REQ-AUTH-04
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (email → code sent → verified → account)
- **Preconditions:** a never-registered address
- **Steps:**
  1. Enter the address on `/login`; type the (planted) code on
     `/signup/otp`.
  2. On `/signup/info` fill name, gender, birthday `15/06/1995`, password
     `Signup@123` twice; press **Create Account**.
- **Expected:** `/signup/info?sessionToken=<64 hex>&email=…` after the code;
  home `/` after submit; the user record exists with the entered name.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-009 — A wrong sign-up code shows the remaining attempts and clears the input

- **Requirement:** REQ-AUTH-03
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (wrong code), State Transition (retry allowed)
- **Steps:**
  1. Type `111111` on `/signup/otp`, then the right code.
- **Expected:** "Invalid OTP. You have 4 attempt(s) remaining", the input is
  empty, the URL is unchanged; the right code then reaches `/signup/info`.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-010 — Resend waits out the 60-second cooldown, then sends a new code

- **Requirement:** REQ-AUTH-03
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (cooldown → ready → cooldown), BVA (60 s)
- **Steps:**
  1. Arrive on `/signup/otp`; observe the resend button.
  2. Advance the clock 61 s (and expire the server cooldown); press **Resend
     OTP**.
- **Expected:** "Resend in Ns" disabled at first; after 61 s **Resend OTP** is
  enabled; pressing it shows "OTP has been resent!" and restarts the
  countdown.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-011 — send-otp issues a code and verify-otp exchanges it for a session token

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (none → code sent → verified)
- **Steps:**
  1. `POST /auth/signup/send-otp`; plant a known code; `POST /verify-otp`.
- **Expected:** send → `{ success, expiresIn: 300, cooldownSeconds: 60 }`
  and a code is stored; verify → `sessionToken` of 64 hex chars,
  `expiresIn: 1800`; still no user record.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-012 — The sign-up code must be exactly 6 digits

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (5 / 6 / 7 digits), EP (non-digit, empty)
- **Steps:**
  1. `POST /verify-otp` with `12345`, `1234567`, `12a456`, `""`, `000000`.
- **Expected:** the first four → 400 `VALIDATION_ERROR` on `otp`
  (`string.length` / `string.pattern.base` / `string.empty`); `000000` passes
  validation and fails as `SIGNUP_OTP_INVALID`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-013 — A registered email cannot start sign-up

- **Requirement:** REQ-AUTH-02, REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (registered address)
- **Steps:**
  1. `POST /auth/signup/send-otp` with `user@test.com`.
- **Expected:** 409 `SIGNUP_EMAIL_EXISTS` "Email is already registered".
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-014 — Resend is refused during the cooldown and counted once it has passed

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (cooldown → ready), Error Guessing (double
  send)
- **Steps:**
  1. Send a code; immediately call send-otp and resend-otp again.
  2. Expire the cooldown; resend; verify with a planted code.
- **Expected:** both early calls → 400 `SIGNUP_OTP_COOLDOWN`; the resend →
  `resendCount: 1, maxResends: 5, remainingResends: 4`; the resent code
  verifies.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-015 — Five wrong codes lock sign-up verification, even for the right code

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (attempts 4 / 5), State Transition (open → locked)
- **Steps:**
  1. Verify with a wrong code five times, then with the right code.
- **Expected:** attempts 1–4 → `SIGNUP_OTP_INVALID` "… You have N attempt(s)
  remaining" (4…1); attempt 5 and the right code → `SIGNUP_OTP_LOCKED`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-016 — A sign-up code that was already used cannot verify again

- **Requirement:** REQ-AUTH-03
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (invalid: verified → verify again)
- **Steps:**
  1. Verify a code successfully; verify the same code again.
- **Expected:** 400 `SIGNUP_OTP_INVALID`.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-017 — Sign-up cannot be completed without a verified code

- **Requirement:** REQ-AUTH-03, REQ-AUTH-04
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (invalid: code sent → complete), Error
  Guessing (another address's session token)
- **Steps:**
  1. Send a code but do not verify; `POST /complete` with a fabricated
     64-char session token.
  2. Verify a second address; complete the first address with its token.
- **Expected:** both → 400 `SIGNUP_SESSION_INVALID` "Session expired or
  invalid. Please verify OTP again"; no account is created.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-018 — The sign-up session token works once

- **Requirement:** REQ-AUTH-04
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (verified → account; invalid: replay)
- **Steps:**
  1. Complete sign-up with a valid token; replay the same request; sign in.
- **Expected:** first → 201 with the user and tokens; replay → 400
  `SIGNUP_SESSION_INVALID`; the chosen password signs in (200).
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-019 — Password strength policy at sign-up

- **Requirement:** REQ-AUTH-04
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (7 / 8 / 128 / 129 chars), EP (missing lower, upper,
  digit, special; disallowed `#`)
- **Steps:**
  1. `POST /complete` (fake session) varying only `password` /
     `confirmPassword`.
- **Expected:** 7 → `string.min`, 129 → `string.max`, each class violation →
  `string.pattern.base` (400 `VALIDATION_ERROR` on `password`); 8 and 128 pass
  validation (`SIGNUP_SESSION_INVALID`).
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-020 — Profile fields, confirmation and terms acceptance are validated

- **Requirement:** REQ-AUTH-04
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (name 1 / 2 chars; age 12 / 14 / 121 years), EP (name
  with digit, unknown gender, mismatched confirmation, short session token),
  Decision Table (`acceptTerms`: `true` → ok, `false` / `"true"` / missing →
  refused)
- **Steps:**
  1. `POST /complete` (fake session) varying one field at a time.
- **Expected:** each invalid value → 400 `VALIDATION_ERROR` naming the field
  and Joi rule; `fullName: "Al"` with a 14-year-old's birthday passes
  validation.
- **Automated:** `tests/api/auth/signup.api.ts`

### TC-AUTH-021 — The info step validates every field on the client

- **Requirement:** REQ-AUTH-04
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (empty, too short, weak password, mismatch)
- **Steps:**
  1. Submit the empty form; then name `A` with password `abcdefgh`; then a
     valid form with a different confirmation.
- **Expected:** "Please enter full name", "Please select birthday", "Please
  enter password", "Please confirm your password"; then "Full name must be at
  least 2 characters" and "Password must contain uppercase, lowercase, number
  and special character"; then "Passwords do not match". No
  `/signup/complete` request is sent.
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-022 — The info step asks the user to accept the terms

- **Requirement:** REQ-AUTH-04
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (requirement vs. screen)
- **Steps:**
  1. Open the info step.
- **Expected:** a terms-acceptance checkbox is shown. **Known bug** — there is
  none; `InfoStepForm` always sends `acceptTerms: true` (test marked
  `test.fail`).
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-023 — A freshly signed-up user stays signed in after a reload

- **Requirement:** REQ-AUTH-13, REQ-AUTH-04
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (account created → reload)
- **Steps:**
  1. Sign up through the UI; reload home; open the user menu.
- **Expected:** still signed in as the new address. **Known bug** —
  `/signup/complete` never sets the `refreshToken` cookie, so the reload logs
  the user out (test marked `test.fail`).
- **Automated:** `tests/e2e/auth/sign-up.e2e.ts`

### TC-AUTH-024 — A user signs in with email and password and lands on home

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (valid credentials)
- **Steps:**
  1. Email step → password step with `user@test.com` / `User@123`.
- **Expected:** home `/`; the user menu shows `user@test.com`.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-025 — A wrong password shows the error and keeps the user on the step

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (policy-valid but wrong password)
- **Preconditions:** a throwaway account
- **Steps:**
  1. Submit `Wrong@1234` on the password step.
- **Expected:** "Invalid email or password"; still on `/login/password`;
  **Sign in** enabled again.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-026 — Password login contract: tokens in the body, refresh token only in an HttpOnly cookie

- **Requirement:** REQ-AUTH-05, REQ-AUTH-13
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (valid credentials)
- **Steps:**
  1. `POST /auth/login` with `user@test.com` / `User@123`.
- **Expected:** 200; `data` has exactly `accessToken`, `idToken`,
  `expiresIn` (8 h) — no `refreshToken`; `Set-Cookie: refreshToken=…;
HttpOnly; SameSite=Lax; Path=/` and an HttpOnly `sid`.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-027 — A wrong password and an unknown email get the same answer

- **Requirement:** REQ-AUTH-05
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** Decision Table (account exists × password right), Error
  Guessing (account enumeration)
- **Steps:**
  1. `POST /auth/login` with a throwaway account + wrong password, and with an
     unknown address.
- **Expected:** both 401 `LOGIN_INVALID_CREDENTIALS` "Invalid email or
  password"; no cookie.
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-028 — Double-clicking Sign in sends a single login request

- **Requirement:** REQ-AUTH-05
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (double submit)
- **Steps:**
  1. Double-click **Sign in** with the right password.
- **Expected:** exactly one `POST /auth/login`; home is reached.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-029 — Back after signing in does not return to the login form

- **Requirement:** REQ-AUTH-05, REQ-AUTH-15
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** Error Guessing (browser back)
- **Steps:**
  1. Sign in through the UI; press Back.
- **Expected:** the guest guard returns the user to `/`; no password field.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-030 — Sign-in errors are translated for Accept-Language: vi

- **Requirement:** REQ-AUTH-05
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** EP (locale vi)
- **Steps:**
  1. `POST /auth/login` with `Accept-Language: vi`: unknown address; then a
     malformed email.
- **Expected:** "Email hoặc mật khẩu không chính xác"; the field error is
  "Email không hợp lệ".
- **Automated:** `tests/api/auth/login-password.api.ts`

### TC-AUTH-031 — Inactive and unverified accounts are told why they cannot sign in

- **Requirement:** REQ-AUTH-11
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (inactive, unverified)
- **Preconditions:** two throwaway accounts, one `isActive: false`, one
  `verifiedEmail: false`
- **Steps:**
  1. For each: email step → password step with the right password.
- **Expected:** both reach the password step (address counts as registered);
  "Your account has been deactivated. Please contact support" /
  "Please verify your email address before logging in"; still on the step.
- **Automated:** `tests/e2e/auth/sign-in.e2e.ts`

### TC-AUTH-032 — A user signs in with a one-time code from the alternative screen

- **Requirement:** REQ-AUTH-06, REQ-AUTH-08
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (alternative → code sent → signed in)
- **Preconditions:** a throwaway account
- **Steps:**
  1. `/login/alternative` → **Login with OTP**; type the (planted) code.
- **Expected:** `/login/otp` with "Enter verification code" and the 6-digit
  instruction; after the code, home with the account in the user menu.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-033 — A wrong one-time code shows how many attempts remain

- **Requirement:** REQ-AUTH-06
- **Layer:** e2e · **Priority:** P3 · **Role:** guest
- **Technique:** Error Guessing (wrong code)
- **Steps:**
  1. On `/login/otp` type `999999`.
- **Expected:** "Invalid OTP code. 4 attempts remaining"; input cleared; still
  on `/login/otp`.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-034 — Code send hides whether the address exists and enforces a cooldown

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (registered / unknown), Error Guessing (enumeration,
  double send)
- **Steps:**
  1. `POST /auth/login/otp/send` for a throwaway account and an unknown
     address; send again for the account.
- **Expected:** identical 200 `{ success, expiresIn: 300, cooldown: 60 }`;
  only the real account holds a code; the repeat → 400 `LOGIN_OTP_COOLDOWN`
  "Please wait N seconds before requesting a new OTP".
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-035 — A valid code signs in once and cannot be reused

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (code issued → consumed; invalid: reuse)
- **Steps:**
  1. Send, plant, verify; verify the same code again.
- **Expected:** 200 with an access token and an HttpOnly refresh cookie (no
  refresh token in the body); the replay → 401 `LOGIN_OTP_INVALID`.
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-036 — Five wrong codes lock code sign-in, even for the right code

- **Requirement:** REQ-AUTH-06
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (attempts 4 / 5), State Transition (open → locked)
- **Steps:**
  1. Verify a wrong code five times, then the right one.
- **Expected:** attempts 1–4 → 401 "Invalid OTP code. N attempts remaining";
  attempt 5 and the right code → 429 `LOGIN_OTP_LOCKED` "Too many failed OTP
  attempts. Please try again in 15 minutes".
- **Automated:** `tests/api/auth/login-otp.api.ts`

### TC-AUTH-037 — A user signs in by opening the magic link

- **Requirement:** REQ-AUTH-07, REQ-AUTH-08
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (alternative → link sent → signed in)
- **Preconditions:** a throwaway account
- **Steps:**
  1. `/login/alternative` → **Login with Magic Link**.
  2. Open `/login/verify-magic-link?token=<planted>&email=…`.
- **Expected:** "Check your email" with the address; opening the link lands on
  home signed in as the account.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-038 — An invalid magic link sends the user back to login

- **Requirement:** REQ-AUTH-07
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (forged / expired link)
- **Steps:**
  1. Open the verify page with a well-formed token that was never issued.
- **Expected:** "Verifying magic link..." while the API answers 401, then the
  "Welcome" step on `/login`.
- **Automated:** `tests/e2e/auth/otp-magic-link.e2e.ts`

### TC-AUTH-039 — A magic link works once; malformed tokens fail validation

- **Requirement:** REQ-AUTH-07
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (127 / 128 / 129 chars), EP (upper-case hex, empty,
  wrong value), State Transition (invalid: reuse)
- **Steps:**
  1. Send, plant a token; verify with malformed tokens, a wrong token, the
     right token, the right token again.
- **Expected:** malformed → 400 on `token` (`string.length` /
  `string.pattern.base` / `string.empty`); wrong → 401
  `LOGIN_MAGIC_LINK_INVALID` and the real link still works; right → 200 with
  an HttpOnly refresh cookie; replay → 401 "Invalid or expired magic link".
- **Automated:** `tests/api/auth/magic-link.api.ts`

### TC-AUTH-040 — Magic-link send hides whether the address exists and enforces a cooldown

- **Requirement:** REQ-AUTH-07
- **Layer:** api · **Priority:** P3 · **Role:** guest
- **Technique:** EP (registered / unknown), Error Guessing (enumeration)
- **Steps:**
  1. Send for a throwaway account and an unknown address; send both again.
- **Expected:** identical 200 `{ success, expiresIn: 900, cooldown: 60 }`;
  only the account holds a token; both repeats → 400
  `LOGIN_MAGIC_LINK_COOLDOWN`.
- **Automated:** `tests/api/auth/magic-link.api.ts`

### TC-AUTH-041 — The alternative screen switches between password, code and magic link

- **Requirement:** REQ-AUTH-08
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (password ⇄ alternative ⇄ code / link)
- **Steps:**
  1. Password step → **Try another way**; pick each method and come back with
     **Try another method**; finally **Change email**.
- **Expected:** "Choose login method" lists Magic Link, OTP, password and
  Contact administrator with the email kept on every hop; each option opens
  its step; **Change email** returns to `/login`.
- **Automated:** `tests/e2e/auth/alternative.e2e.ts`

### TC-AUTH-042 — The 10th wrong password locks the account and says for how long

- **Requirement:** REQ-AUTH-09
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (active → locked), BVA (attempts 9 / 10)
- **Preconditions:** a throwaway account; 9 wrong passwords already sent
- **Steps:**
  1. Submit a 10th wrong password; reload and submit the right one.
- **Expected:** both answer 429 and show "Account temporarily locked after 10
  failed attempts. Please try again in N seconds"; the user stays on the
  password step.
- **Automated:** `tests/e2e/auth/lockout.e2e.ts`

### TC-AUTH-043 — Lockout boundary: attempt 9 fails, attempt 10 locks, the right password is refused

- **Requirement:** REQ-AUTH-09
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** BVA (9 / 10 / 11), State Transition (active → locked)
- **Steps:**
  1. Nine wrong passwords; a tenth; then the right password.
- **Expected:** 9th → 401 `LOGIN_INVALID_CREDENTIALS`; 10th → 429
  `LOGIN_ACCOUNT_LOCKED` "… in 1800 seconds"; the right password → 429 with
  1700 < N ≤ 1800 and no cookie.
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-044 — A successful sign-in resets the failed-attempt counter

- **Requirement:** REQ-AUTH-09
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (9 failures → success → counter 0)
- **Steps:**
  1. Nine wrong passwords; the right password; nine wrong passwords again.
- **Expected:** the success is 200, the counter key disappears, and the second
  run of nine still answers 401 (not locked).
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-045 — A locked user requests an unlock code, verifies it and gets back in

- **Requirement:** REQ-AUTH-10
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (locked → unlock requested → unlocked)
- **Steps:**
  1. Lock a throwaway account; `POST /auth/unlock/request`; plant the
     temporary password; `POST /auth/unlock/verify`; sign in with the original
     password.
- **Expected:** request → 200 `{ success: true }` and a code is stored; verify
  → 200 with tokens, HttpOnly refresh cookie and `mustChangePassword: true`
  in the idToken; the original password then signs in (200).
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-046 — Unlock refuses invalid transitions

- **Requirement:** REQ-AUTH-10
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** State Transition (invalid: active → request; code used →
  verify), Error Guessing (wrong guess must not burn the code)
- **Steps:**
  1. Request unlock for an active account; lock it and request again.
  2. Verify with a wrong code, the right code, the right code again; verify
     an unknown address.
- **Expected:** not locked → 400 `UNLOCK_ACCOUNT_NOT_LOCKED`; wrong code → 401
  `UNLOCK_INVALID_TEMP_PASSWORD` while the real code still works; reuse →
  401; unknown address → 401 with the same message.
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-047 — Unlock request guards: no enumeration, disabled account, cooldown, hourly limit, code length

- **Requirement:** REQ-AUTH-10, REQ-AUTH-12
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (unknown, disabled), BVA (requests 3 / 4 per hour;
  temporary password 11 / 12 chars), State Transition (cooldown)
- **Steps:**
  1. Request for an unknown address; again at once; twice more with the
     cooldown expired; a fourth time.
  2. Request for a throwaway account with `isActive: false`.
  3. Verify with 11- and 12-character temporary passwords.
- **Expected:** unknown → 200 `{ success: true }`, nothing stored; at once →
  400 `UNLOCK_COOLDOWN`; 2nd and 3rd → 200; 4th → 429 `UNLOCK_RATE_LIMIT`;
  disabled → 400 `UNLOCK_ACCOUNT_DISABLED`; 11 chars → 400 "Temporary
  password must be at least 12 characters"; 12 chars → 401.
- **Automated:** `tests/api/auth/lockout-unlock.api.ts`

### TC-AUTH-048 — A locked user is offered the self-service unlock from the sign-in screen

- **Requirement:** REQ-AUTH-10
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** Error Guessing (requirement vs. screen)
- **Preconditions:** a locked throwaway account
- **Steps:**
  1. Submit the password step.
- **Expected:** next to the lockout message, an unlock link or button.
  **Known bug** — the client has no unlock screen, route or link (test marked
  `test.fail`).
- **Automated:** `tests/e2e/auth/lockout.e2e.ts`

### TC-AUTH-049 — Account status × sign-in method decision table

- **Requirement:** REQ-AUTH-11
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** Decision Table (`isActive` × `verifiedEmail` × method)
- **Preconditions:** throwaway accounts with the flags set
- **Steps:**
  1. For each row: password login with the right password, OTP verify and
     magic-link verify; then OTP send and magic-link send.
- **Expected:**

  | isActive | verifiedEmail | password / OTP / magic link    | send         |
  | -------- | ------------- | ------------------------------ | ------------ |
  | false    | true          | 401 `LOGIN_ACCOUNT_INACTIVE`   | 200, no code |
  | false    | false         | 401 `LOGIN_ACCOUNT_INACTIVE`   | 200, no code |
  | true     | false         | 401 `LOGIN_EMAIL_NOT_VERIFIED` | 200, no code |
  | true     | true          | 200 (password)                 | —            |

- **Automated:** `tests/api/auth/account-status.api.ts`

### TC-AUTH-050 — Password sign-in is limited to 30 requests per IP

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (30 / 31 requests)
- **Steps:**
  1. 30 `POST /auth/login` from one IP; a 31st; a 32nd for another address.
- **Expected:** 1–30 → 401 (`RateLimit-Remaining: 0` on the 30th); 31st →
  429 `TOO_MANY_REQUESTS` "Too many login attempts. Please try again later",
  `RateLimit-Limit: 30`; another address is limited too.
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-051 — Code and magic-link sends are limited to 5 per email

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (5 / 6 requests), EP (same / other address)
- **Steps:**
  1. For `otp/send` and `magic-link/send`: 5 requests for one address, a
     6th, then one for another address.
- **Expected:** 1st 200, 2nd–5th 400 (cooldown), 6th 429
  `TOO_MANY_REQUESTS`; the other address → 200.
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-052 — Sign-up codes are limited to 3 per email and 5 per IP

- **Requirement:** REQ-AUTH-12
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** BVA (3 / 4 per email, 5 / 6 per IP)
- **Steps:**
  1. Four sends for one address; reset the IP window; six sends for six
     addresses.
- **Expected:** 4th for the address → 429; addresses 1–5 → 200, 6th → 429,
  both "You have exceeded the allowed number of attempts".
- **Automated:** `tests/api/auth/rate-limit.api.ts`

### TC-AUTH-053 — The session survives a reload; the access token is never stored in the browser

- **Requirement:** REQ-AUTH-13
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (signed in → reload → signed in)
- **Preconditions:** a throwaway account
- **Steps:**
  1. Sign in through the UI; reload; inspect storage and cookies.
- **Expected:** the reload calls `/auth/token/refresh` (200) and the user is
  still signed in; neither localStorage, sessionStorage nor `document.cookie`
  holds the access token or a refresh token; the `refreshToken` cookie is
  HttpOnly, SameSite=Lax.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-054 — Refresh issues a new access token from the cookie and refuses a missing or forged one

- **Requirement:** REQ-AUTH-13
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** EP (valid, missing, forged cookie)
- **Steps:**
  1. Sign in; `POST /auth/token/refresh` with the cookie; call `GET
/users/me` with the new token.
  2. Refresh with no cookie; with a forged JWT.
- **Expected:** 200 with a new access token for the same subject that
  `/users/me` accepts; no cookie → 401
  `REFRESH_TOKEN_REQUIRED`; forged → 403 `REFRESH_TOKEN_INVALID`.
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-055 — Logging out from the user menu ends the session

- **Requirement:** REQ-AUTH-14
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (signed in → signed out)
- **Preconditions:** a throwaway account signed in through the UI
- **Steps:**
  1. User menu → **Log out**; then open `/profile`.
- **Expected:** `POST /auth/logout` → 204 and the "Welcome" step on `/login`;
  `/profile` bounces to `/login`; the menu no longer shows the account.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-056 — After logout the old refresh token no longer works

- **Requirement:** REQ-AUTH-14
- **Layer:** api · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (invalid: signed out → refresh), Error
  Guessing (replayed token)
- **Steps:**
  1. Sign in and keep the refresh token; log out; refresh with the cookie jar;
     refresh with the kept token.
- **Expected:** logout 204 empties `refreshToken` and `sid`; the jar refresh →
  401; the kept token → refused. **Known bug** — logout never revokes the
  refresh JWT, so the kept token still returns 200 (test marked `test.fail`).
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-057 — Logout requires a signed-in caller

- **Requirement:** REQ-AUTH-14
- **Layer:** api · **Priority:** P2 · **Role:** guest
- **Technique:** EP (no token, malformed token)
- **Steps:**
  1. `POST /auth/logout` without `Authorization`, and with `Bearer
not-a-jwt`.
- **Expected:** no token → 401 `AUTH_MISSING_TOKEN`; malformed token →
  refused with `JWT_INVALID` (currently 403 — see REQ-AUTHZ-01); no session
  is touched.
- **Automated:** `tests/api/auth/session.api.ts`

### TC-AUTH-058 — A signed-in user is kept out of the login and sign-up pages

- **Requirement:** REQ-AUTH-15
- **Layer:** e2e · **Priority:** P1 · **Role:** user
- **Technique:** EP (each guest page)
- **Steps:**
  1. Open `/login`, `/login/password?email=…`, `/login/alternative?email=…`,
     `/signup/otp?email=…`, `/vi/login`.
- **Expected:** each redirects to home (`/` or `/vi`) without showing the
  email step; the session is still `user@test.com`.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-059 — A guest opening a private page is sent to login and returned there after signing in

- **Requirement:** REQ-AUTH-15
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** EP (each private page), State Transition (guest → signed in
  → original page)
- **Steps:**
  1. Open `/`, `/profile`, `/login-history`.
  2. From `/profile` sign in with a throwaway account.
- **Expected:** each private page redirects to `/login`; after signing in the
  user lands on `/profile`, not home.
- **Automated:** `tests/e2e/auth/session.e2e.ts`

### TC-AUTH-060 — Vietnamese: guests are sent to /vi/login, which speaks Vietnamese

- **Requirement:** REQ-AUTH-15, REQ-AUTH-01
- **Layer:** e2e · **Priority:** P2 · **Role:** guest
- **Technique:** EP (locale vi; empty / malformed / registered email)
- **Steps:**
  1. Open `/vi/profile`; submit the empty email step; `abc`; then
     `user@test.com`.
- **Expected:** `/vi/login` with "Chào mừng" / "Tiếp tục để sử dụng dịch vụ";
  "Vui lòng nhập email", "Email không đúng định dạng"; then
  `/vi/login/password` with "Nhập mật khẩu để đăng nhập" and "Thử cách khác".
- **Automated:** `tests/e2e/auth/session.e2e.ts`
