# Test data

## Seed (`cd server && pnpm seed`)

Source: `server/src/database/seeders/data/`. Specs assert on these values, so a
seed change is a test change.

### Accounts

| Email                 | Password         | Role  | State                | Use in tests                             |
| --------------------- | ---------------- | ----- | -------------------- | ---------------------------------------- |
| `admin@test.com`      | `Admin@123`      | admin | active, verified     | the shared admin session — **read-only** |
| `user@test.com`       | `User@123`       | user  | active, verified     | the shared user session — **read-only**  |
| `user2@test.com`      | `User@123`       | user  | active, verified     | a second user for isolation checks       |
| `inactive@test.com`   | `Inactive@123`   | user  | **inactive**         | sign-in refused                          |
| `unverified@test.com` | `Unverified@123` | user  | **email unverified** | sign-in refused                          |

"Read-only" means: never lock, fail passwords for, reset or change the password
of these accounts. Their per-user data (favourites, recent apps, read flags) may
change only if the test restores it.

### Apps

| Name                          | Required roles | Status       |
| ----------------------------- | -------------- | ------------ |
| `blog`                        | user           | active       |
| `analytics-dashboard`         | admin          | active       |
| `idms-portal` ("IDMS Portal") | user, admin    | active       |
| `team-calendar`               | user           | **inactive** |
| `notes`                       | user           | active       |
| `ops-console`                 | admin          | active       |

A regular user therefore sees `blog`, `idms-portal`, `notes`; an admin also sees
`analytics-dashboard` and `ops-console`; nobody sees `team-calendar` in the
catalogue. `favorites-page.e2e.ts` relies on "IDMS Portal" sorting where it
does alphabetically.

### Categories

`content` (Content / Nội dung), `internal-tools` (Internal Tools / Công cụ nội
bộ), `identity` (Identity / Định danh), `productivity` (Productivity / Năng
suất) — in that order.

### Other

- **Notifications** — 26 rows each for `user@test.com` and `admin@test.com`,
  stored as `type + params + link` (no text). Rows 1–5 cover LOGIN_ANOMALY,
  APP_AVAILABLE, PASSWORD_CHANGED (admin / self) and ACCOUNT_LOCKED; rows 6–26
  are APP_AVAILABLE for "Seed App N", read when N is odd, so each renders a
  unique sentence. The notifications suite reads #10 / #11 and consumes #12 /
  #14 (put back to unread afterwards). See `helpers/notifications.ts`.
- **Entitlement overrides** — `user2@test.com` (John Doe) is denied Notes and
  allowed Operations Console (`entitlements.ts`); everyone else is on the role
  default. Tests that write overrides do it to a throwaway account — every
  grant / revoke notifies the user for real.
- **Support requests** — 10, statuses mixed `new` / `processing` / `resolved`,
  one with no email.

## Throwaway accounts

`createAccount()` (`helpers/accounts.ts`) registers a fresh account through the
real sign-up API:

- address `<tag>-<time><n>@e2e.example.com` — `example.com` is reserved
  (RFC 2606), so a queued email can never reach anyone,
- password `Throwaway@123`, name "Throwaway Tester", gender `other`, born
  1995-06-15,
- deleted, together with its login history, refresh tokens, favourites, app
  usage, notifications, addresses, entitlements and support requests, by the `cleanup` project
  after the run (and by `user.setup.ts` before it, in case a run died).

## One-time codes

Every code the server issues is stored only as a bcrypt hash, so a test cannot
read one. The pattern:

1. call the real send endpoint (sets cooldowns and counters exactly as for a
   user),
2. `plantCode(kind, email, KNOWN_OTP)` replaces the stored hash with the hash of
   `424242`, keeping the TTL,
3. continue the flow with `424242`.

| `kind`                    | Redis key                  |
| ------------------------- | -------------------------- |
| `signup`                  | `otp-signup:<email>`       |
| `login`                   | `otp-login:<email>`        |
| `magicLinkLogin`          | `magic-link-login:<email>` |
| `forgotPasswordOtp`       | `otp-forgot-pw:<email>`    |
| `forgotPasswordMagicLink` | `ml-forgot-pw:<email>`     |
| `unlock`                  | `login-unlock-token:<id>`  |

The layout mirrors `server/src/constants/redis/store/index.ts`.

## Rate limits

All tests come from one IP and the per-IP windows (e.g. 30 password logins per
15 minutes) are smaller than one run. The auto fixture `_resetRateLimits`
deletes every `rate-limit:*` key before each test; a test that checks a limit
opts out with `test.use({ keepRateLimits: true })` and uses its own throwaway
email.
