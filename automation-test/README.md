# Ducker ID — automation tests

The regression suite for Ducker ID: UI end-to-end tests in a real browser and
API tests over HTTP, both with Playwright, both against the real stack (Next.js
client, Express API, MongoDB, Redis). It runs **when you ask it to** — it is not
wired to CI or to commits.

Server unit tests are not here; they live beside the code (`cd server && pnpm test`).

## Quick start

```bash
# 1. the app (two terminals) + seed data
cd server && pnpm dev            # API on :5000
cd client && pnpm dev            # client on :3000
cd server && pnpm seed

# 2. the suite
cd automation-test
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cp .env.example .env             # REDIS_URL / MONGO_URL = the server's

pnpm test                        # everything
pnpm test:smoke                  # @smoke only, a few minutes
pnpm report                      # last HTML report
```

| Command                         | What                                                           |
| ------------------------------- | -------------------------------------------------------------- |
| `pnpm test`                     | setup → e2e + api → cleanup                                    |
| `pnpm test:e2e` / `test:api`    | one layer                                                      |
| `pnpm test tests/e2e/<module>`  | one module                                                     |
| `pnpm test -g "@TC-AUTH-014"`   | one test case                                                  |
| `pnpm test:headed` / `test:ui`  | visible browser / Playwright UI mode                           |
| `pnpm coverage:check [--write]` | requirement ↔ test case ↔ spec check, regenerates the matrix |
| `pnpm type-check`               | TypeScript                                                     |

## Layout

```
automation-test/
├── docs/
│   ├── test-strategy.md          scope, levels, environments, entry/exit criteria, risks
│   ├── test-plan.md              running, triage, reporting, keeping the suite current
│   ├── requirements.md           REQ-<MODULE>-NN — what must be proven
│   ├── traceability-matrix.md    REQ ↔ TC ↔ spec (generated)
│   ├── test-design-techniques.md coverage rubric + EP / BVA / DT / ST / EG
│   ├── test-data.md              seed accounts and data, throwaway accounts, planted codes
│   └── conventions.md            naming, roles, tags, test-case format
├── test-cases/<module>.md        TC-<MODULE>-NNN, one file per module
├── defects/bug-log.md            app defects found, open and fixed
├── reports/                      run summaries (TEMPLATE.md); html/ is gitignored
├── fixtures/index.ts             role fixtures: user / admin / guest, page and API
├── helpers/                      env, Redis (planted codes, rate limits), accounts, domain helpers
├── scripts/coverage-check.ts
├── tests/
│   ├── setup/                    log in user + admin once; cleanup afterwards
│   ├── e2e/<module>/*.e2e.ts
│   └── api/<module>/*.api.ts
└── playwright.config.ts
```

## Writing a test

```ts
import { test, expect } from "@fixtures";

test.use({ role: "admin" }); // default "user"; "guest" = no session

test(
  "admin locks an account",
  { tag: ["@TC-ADMUSERS-010", "@smoke"] },
  async ({ page, guestApi }) => {
    // …
  }
);
```

Read `docs/conventions.md` before adding one: seeded accounts are read-only,
state-changing tests use `createAccount()`, and every test is tagged with the
test case it proves.

## Feature work

A feature branch adds its requirements to `docs/requirements.md`, its test
cases to `test-cases/<module>.md` and its specs under `tests/` — in the same PR
as the code. See `docs/test-plan.md` → "Keeping the suite current".
