# Conventions

How a test is named, where it lives, which session it runs as and how it is
linked back to a requirement. `pnpm coverage:check` enforces the parts marked
**(checked)**.

## Layout

```
tests/
  setup/            user.setup.ts, admin.setup.ts, cleanup.teardown.ts
  e2e/<module>/     <topic>.e2e.ts   — drives the browser
  api/<module>/     <topic>.api.ts   — HTTP only, no browser
test-cases/<module>.md               — the test cases for that module
```

`<module>` is the lower-case module code from `docs/requirements.md`
(`auth`, `password`, `admin-users`, …). File names are the topic, not the
feature branch that produced them: `lock-unlock.e2e.ts`, never
`frontend-cleanup.e2e.ts`.

Pick the layer by what is being proven:

| Prove that…                                                      | Layer |
| ---------------------------------------------------------------- | ----- |
| the user sees / can do X on a screen                             | e2e   |
| an endpoint accepts, rejects, paginates, authorises, rate-limits | api   |
| a protocol behaves (OIDC, refresh rotation, PKCE)                | api   |

Do not re-prove in e2e what an api test already proves; e2e asserts what the
user sees.

## Roles

Import `test` and `expect` from `@fixtures`, never from `@playwright/test`
(types and `request` may still come from there).

```ts
import { test, expect } from "@fixtures";

test.use({ role: "admin" }); // file or describe — default is "user"

test("…", async ({ page }) => {}); // page as the declared role
test("…", async ({ adminPage, userPage, guestPage }) => {}); // several at once
test("…", async ({ adminApi, userApi, guestApi }) => {}); // API with Bearer token
```

`role: "guest"` is an empty context. Never select a session by folder name and
never hard-code `.auth/*.json` paths in a new spec.

## Test data

- **Seeded accounts are read-only.** `user@test.com` and `admin@test.com` are
  the sessions every spec shares. A test that locks, fails a password for,
  changes or resets the password of, or signs up an account uses
  `createAccount()` from `@helpers/accounts` instead.
- Throwaway accounts live under `@e2e.example.com`; the `cleanup` project
  deletes them and their rows after each run.
- One-time codes are planted, not read: call the real _send_ endpoint, then
  `plantCode(kind, email, KNOWN_OTP)` from `@helpers/redis`.
- Rate-limit counters are cleared before every test. A test that verifies rate
  limiting sets `test.use({ keepRateLimits: true })`.
- A test that changes shared state (seeded app, category, notification) puts it
  back in `afterEach` / `afterAll`.
- Never hard-code a host or port — use relative URLs (`baseURL` is set).

## Linking tests to test cases **(checked)**

Every test case in `test-cases/<module>.md` has a permanent ID
`TC-<MODULE>-NNN`. Every automated test carries the ID of each test case it
proves as a tag:

```ts
test(
  "locked account shows how long it stays locked",
  { tag: ["@TC-AUTH-014", "@smoke"] },
  async ({ page }) => {}
);
```

A `describe` may carry the tag when every test inside proves the same case.

`coverage:check` fails when:

- a requirement in `docs/requirements.md` has no test case,
- a test case marked automated names a file that does not exist or has no
  test tagged with its ID,
- a spec carries a `@TC-…` tag that no test case defines.

## Test-case format

```md
### TC-AUTH-014 — Locked account shows how long it stays locked

- **Requirement:** REQ-AUTH-09
- **Layer:** e2e · **Priority:** P1 · **Role:** guest
- **Technique:** State Transition (active → locked), BVA (attempts 4 / 5)
- **Preconditions:** a throwaway account
- **Steps:**
  1. Enter a wrong password 5 times.
- **Expected:** the 5th attempt shows the lockout message with the remaining
  time; a correct password is refused until the lock ends.
- **Automated:** `tests/e2e/auth/lockout.e2e.ts`
```

`Automated` is a path, or `manual — <reason>` for a case that cannot be
automated (it still counts as covering its requirement, and the reason must
say why).

Priorities: **P1** a broken case blocks release (sign-in, authorisation,
data loss), **P2** a feature is wrong, **P3** cosmetic or edge.

`@smoke` marks the P1 cases that together answer "is the app usable at all?" —
keep it to about 10% of the suite so `pnpm test:smoke` finishes in a couple of
minutes.

## Writing assertions

- Locate by role and accessible name (`getByRole`, `getByLabel`), then by
  text; `data-testid` only where the markup gives nothing better.
- Asserted copy comes verbatim from `client/src/locales/{en,vi}/*.json`.
- Use web-first assertions (`await expect(locator).toBeVisible()`), never
  fixed sleeps.
- Every test must be able to run alone (`pnpm test -g "@TC-AUTH-014"`) and in
  any order.
