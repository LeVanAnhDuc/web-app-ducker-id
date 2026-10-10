# Test strategy

## Purpose

One regression suite that proves every shipped Ducker ID feature still works,
run **on request** — before a release, after a large merge, or whenever someone
wants to know the state of the app. It is not wired to CI and does not run on
commit.

The suite is also where feature work puts its tests: a feature branch adds its
requirements, test cases and specs here, in the same PR as the code
(see `test-plan.md` → "Keeping the suite current").

## Test levels

| Level         | Where                        | Tool                            | Owns                                                                                    |
| ------------- | ---------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| Unit          | `server/src/**/*.spec.ts`    | Jest (`cd server && pnpm test`) | service / repository logic in isolation, no database. **Not part of this suite.**       |
| API           | `automation-test/tests/api/` | Playwright request context      | HTTP contract, validation, authorisation, rate limits, OIDC protocol — fast, no browser |
| UI end-to-end | `automation-test/tests/e2e/` | Playwright + Chromium           | what a user sees and can do on each screen, in `en` and `vi`                            |

API and UI tests run against the real stack — Next.js client, Express API,
MongoDB, Redis — with seed data. Nothing in the server is mocked. The browser
tests mock an API response only to reach a state the seed cannot produce (a
5xx, a slow response, a token claim); each such mock says why in a comment.

## Scope

In scope: everything listed under `## Features` in the root `README.md`, as
catalogued in `docs/requirements.md`.

### Not covered

| What                                 | Why                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Features not built yet               | listed under "Out of scope" in `requirements.md`; they get cases when they ship |
| Email delivery                       | the queue is the boundary; codes are planted in Redis (`helpers/redis.ts`)      |
| Performance / load                   | no target defined yet                                                           |
| Visual regression                    | the design system is still settling; screenshots would churn                    |
| Automated a11y scanning (axe)        | a11y is asserted through role/label locators and keyboard cases instead         |
| Browsers other than Chromium, mobile | internal tool used on desktop Chrome                                            |

## Environments and data

The suite runs against a stack on a **dedicated seeded database** (by
convention `ducker-id-e2e`, client `:3600`, API `:5600` — `test-plan.md` §1), never
against a developer's working data; `user.setup.ts` refuses to start otherwise. It needs direct access to the same Redis and MongoDB the
API uses (`.env`), to plant one-time codes, clear rate-limit counters and delete
the throwaway accounts it creates. See `test-data.md`.

## Entry and exit criteria

**Entry** — client and API up, MongoDB and Redis reachable, `pnpm seed` run.

**Exit** — a run passes when:

- every test is green, or is `test.fail()` with a `// BUG:` comment that has a
  matching open entry in `defects/bug-log.md`,
- `pnpm coverage:check` reports no gaps,
- the run is summarised in `reports/` (see `test-plan.md`).

## Roles and accounts

| Role  | Account                            | Used for                                    |
| ----- | ---------------------------------- | ------------------------------------------- |
| guest | none                               | public pages, 401 checks                    |
| user  | `user@test.com` (seed, read-only)  | everything a signed-in user does            |
| admin | `admin@test.com` (seed, read-only) | admin console, 403 checks for the user role |
| —     | throwaway `…@e2e.example.com`      | anything that changes account state         |

## Risks

| Risk                                                      | Mitigation                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A run leaves seed data changed and the next run fails     | state-changing tests use throwaway accounts or restore in `afterAll`; `cleanup` project deletes throwaways |
| Per-IP rate limits trip during a long run                 | counters cleared before each test (`fixtures/index.ts`)                                                    |
| Server stores secrets hashed, so codes cannot be read     | plant a known code after the real send call                                                                |
| Redis key layout changes in the server                    | `helpers/redis.ts` names the server files it mirrors; tests fail loudly with the key name                  |
| A worktree run silently hits the main checkout on `:3000` | set `E2E_BASE_URL` to the worktree's client port                                                           |
