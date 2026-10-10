# Design — `automation-test/`: one regression suite for the whole app

> Date: 2026-10-10 · Status: approved in brainstorming, implemented on `feat/automation-test`

## Problem

Tests were written per feature and scattered: 39 Playwright specs under
`client/e2e/<feature-branch-name>/`, their scenario lists in 27
`docs/specs/<feature>/e2e.md` files, their failure logs in 10 `e2e-bugs.md`.
Nothing answered "which shipped behaviour is covered and which is not", there
was no way to run the whole app's regression in one command with a meaningful
report, whole areas (every sign-in / sign-up / recovery flow, OIDC, the
support form, the contact status workflow) had no test at all, and the
Playwright config picked the admin session by matching folder names in a regex,
so renaming a folder silently changed the role a spec ran as.

## Decisions (agreed with the owner)

1. **One root, `automation-test/`** — a standalone pnpm package beside
   `client/` and `server/`. All Playwright code and all tester documents move
   there; `client/e2e/`, `client/playwright.config.ts`, the client's
   `@playwright/test` dependency and its `e2e*` scripts are removed.
2. **Feature work keeps writing tests at feature time**, but into
   `automation-test/` (requirements → test cases → specs, same PR as the code).
3. **Two layers: UI e2e + API.** API tests use Playwright's request context —
   no second framework. Non-functional testing (a11y scan, visual, perf) is out.
4. **Server Jest unit tests stay beside the code.**
5. **Roles are fixtures, not projects.** `test.use({ role })` plus
   `userPage/adminPage/guestPage` and `userApi/adminApi/guestApi`; the config
   has `setup → e2e | api → cleanup` and no role logic.
6. **All `.md` references are rewritten** to the new layout, including the
   historical specs under `docs/specs/`. Per-feature `e2e.md` files are merged
   into `test-cases/<module>.md` and deleted; `e2e-bugs.md` files are merged
   into `defects/bug-log.md` and deleted.

## Layout

See `automation-test/README.md`. Documents: `test-strategy.md`,
`test-plan.md`, `requirements.md` (REQ IDs from README `## Features`),
`traceability-matrix.md` (generated), `test-design-techniques.md`,
`test-data.md`, `conventions.md`; `test-cases/<module>.md`;
`defects/bug-log.md`; `reports/`.

Modules follow the README's feature groups, not branch names: `auth`,
`password`, `home`, `apps`, `favorites`, `recently-used`, `login-history`,
`notifications`, `support`, `profile`, `settings`, `oidc`, `ops`, `authz`,
`admin-apps`, `admin-categories`, `admin-users`, `admin-login-history`,
`admin-contact`, `admin-entitlements`.

## How the hard parts work

- **One-time codes.** The server stores every OTP / magic-link token / unlock
  token only as a bcrypt hash and sends the plaintext by email. Tests call the
  real send endpoint, then overwrite the stored hash with the hash of a known
  code (`helpers/redis.ts`, TTL preserved). No server change, no test-only
  endpoint.
- **Rate limits.** Per-IP windows are smaller than one run from a single IP; an
  auto fixture deletes `rate-limit:*` before each test, with a
  `keepRateLimits` opt-out for the tests that verify limits.
- **State isolation.** Seeded `user@test.com` / `admin@test.com` are read-only.
  Anything that changes account state uses a throwaway account created through
  the real sign-up API under `@e2e.example.com` (RFC 2606 reserved — `.test`
  is rejected by Joi's TLD check); the `cleanup` project deletes those accounts
  and every row they produced by matching that domain.
- **Traceability.** Every test case has a permanent `TC-<MODULE>-NNN` naming
  its `REQ-…`; every test carries `@TC-…` tags; `pnpm coverage:check` fails on
  an uncovered requirement, a dangling path or an unknown tag, and `--write`
  regenerates the matrix.

## Risks

- Five open worktrees (`access-control`, `design-system-migration`,
  `notification-events`, `rename-ducker-id`, `unlock-token-to-redis`) branch
  from before the move. Any that edit `client/e2e/**` conflict on merge — the
  spec has to be moved by hand to its new path under
  `automation-test/tests/`.
- `helpers/redis.ts` mirrors the server's Redis key layout; a server-side
  rename breaks planted codes loudly (the helper names the key it looked for).
