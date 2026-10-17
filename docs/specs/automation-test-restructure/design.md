# automation-test restructure — design

Date: 2026-10-13 · Status: approved in chat (2026-10-13)

## Goal

Bring `automation-test/` onto the layout and conventions of the workspace skill
`scaffold-automation-testing` (`D:\Learn\web-app-ecosystem\.claude\skills\scaffold-automation-testing`),
while keeping two project constraints the skill does not know about:

- **pnpm 10** stays the package manager (the skill's templates say `npm`).
- Configuration is **read from the client and server**, not re-declared: `client/.env`,
  `server/.env` (falling back to their `.env.example`, which is what a fresh worktree has),
  and the seeded accounts in `server/src/database/seeders/data/users.ts`.
  `automation-test/.env` only holds overrides for the dedicated e2e stack.

## Decisions taken in chat

| #   | Question                     | Decision                                                                                                                                       |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Where does config come from? | `process.env` > `automation-test/.env` > `client/.env` + `server/.env` > their `.env.example`; seed accounts parsed from the seeder            |
| D2  | Scope                        | Whole skeleton now + module `auth` fully on page objects / api client. The other 19 modules move one PR at a time, each verified by an e2e run |
| D3  | Doc format                   | The skill's format completely: per-module requirements / decisions / defects, `BUG-<MODULE>-NN`, P0–P2, Vietnamese prose                       |
| D4  | Module codes in IDs          | Renamed to the skill rule (folder name upper-cased, dashes dropped) — see `automation-test/src/docs/id-migration.md`                           |
| D5  | Language                     | Docs in Vietnamese; TC titles and test names stay English (matching is a convention — see below)                                               |

## Layout

```
automation-test/
├── CLAUDE.md · README.md · .claude/skills/write-tests/SKILL.md
├── package.json (pnpm) · playwright.config.ts · tsconfig.json (@/* → src/*)
├── scripts/coverage-check.ts      REQ ↔ TC ↔ spec ↔ bug, title == test name
└── src/
    ├── docs/{requirements,decisions}/<module>.md, traceability-matrix.md, id-migration.md,
    │        test-plan.md, test-strategy.md, test-design-techniques.md, test-data.md, runs/
    ├── test-cases/<module>.md · defects/<module>.md
    ├── config/ utils/ data/ api/ components/ pages/ fixtures/
    ├── helpers/<module>.ts        transitional: business helpers of not-yet-migrated modules
    └── tests/{seed.spec.ts, setup/, e2e/<module>/, api/<module>/}
```

`src/helpers/` is the one deviation from the skill. Each file there mixes HTTP, Redis/Mongo and
page actions for one module; splitting it into `api/` / `pages/` / `utils/` is exactly the
per-module migration of D2. No new file may be added there; a module's helper is deleted when
that module is migrated.

## Config (D1)

`src/config/env.ts` builds one layered lookup. `urls.ts`, `accounts.ts` and `datastores.ts` read
from it:

| Value           | Source, first hit wins                                                    |
| --------------- | ------------------------------------------------------------------------- |
| web URL         | `E2E_BASE_URL` → `.worktree-state.json` → client `NEXT_PUBLIC_SITE_URL`   |
| API prefix      | client `NEXT_PUBLIC_API_PREFIX`                                           |
| API origin      | `E2E_API_URL` → client `API_SERVER_URL`                                   |
| Redis           | `REDIS_URL` → server `REDIS_URL`                                          |
| Mongo           | `DB_URL` / `DB_NAME` → server `DB_URL` / `DB_NAME`                        |
| seeded accounts | `E2E_*_EMAIL` / `_PASSWORD` → `server/src/database/seeders/data/users.ts` |

The seeder is parsed as text, not imported: it uses the server's `@/` alias, which collides with
the suite's. A unit test pins the parse. The existing `assertSeededDatabase` guard still refuses a
database that is not a seed.

Asserted copy (`src/data/copy.ts`) imports `client/src/locales/en/*.json` and
`server/src/i18n/locales/en/*.json` directly, so a copy change reaches the tests without a copy step.

## IDs (D3, D4)

Eleven module codes change (ADMAPPS→ADMINAPPS, ADMCAT→ADMINCATEGORIES, ADMCONTACT→ADMINCONTACT,
ADMENT→ADMINENTITLEMENTS, ADMLOGHIST→ADMINLOGINHISTORY, ADMUSERS→ADMINUSERS, FAV→FAVORITES,
LOGHIST→LOGINHISTORY, NOTIF→NOTIFICATIONS, PWD→PASSWORD, RECENT→RECENTLYUSED). Bugs
`BUG-001…` become `BUG-<MODULE>-NN` in the file of the module of their first TC. Priorities shift
P1→P0, P2→P1, P3→P2; bug severity S1/S2/S3 → Cao/Trung bình/Thấp. Dated specs under `docs/specs/`
keep the old IDs as historical record; `id-migration.md` maps them.

## Verification

- `pnpm typecheck`, `pnpm test:unit`, `pnpm coverage:check` green.
- `playwright test --list` lists the same tests (by file + title) as before, modulo the moved paths
  and the two new infra tests (`seed`, `INFRA-01`).
- A real run of `auth` + `@smoke` on the e2e stack when MongoDB and Redis are up.

## What changed during implementation (2026-10-13/14)

- **Title == test name is a convention, not a check.** 708 of 808 TCs have a test name that differs from the
  TC title (wording, or several tests proving one TC). Renaming them blind would touch every spec of the 19
  unmigrated modules, so `coverage:check` does not enforce it; each module aligns names when it migrates
  (`automation-test/CLAUDE.md` → "Chuyển dần từng module").
- **`@smoke` ⇔ P0 is enforced.** After the P1→P0 shift, 120 P0 TCs had no `@smoke` test; their tags were added
  (smoke set 94 → 214 TCs), and `coverage:check` now fails either way round.
- **16 bugs named the wrong TC** in the old `bug-log.md` (its TC column had drifted from where the `test.fail()`
  marker actually sits). Each bug's **TC:** / **Requirement:** were re-derived from the marker's test, and
  `coverage:check` now fails when a `// BUG:` marker sits in a test that is not one of the bug's TCs.
- **`src/stores/`** was added beside `api/` for direct Redis / Mongo writes (planted codes, rate-limit
  counters, throwaway accounts) — the skill has no layer for it.
- **The 11 `waitForTimeout` calls** were replaced by deterministic waits; one test
  (`password/force-change.e2e.ts`, TC-PASSWORD-039) gained an assertion that no "redirected" announcement fires.
- **Not run against a live stack.** No local Redis was available (server/.env points at a shared cloud Redis
  the suite must not flush). Verified instead: typecheck, 10 unit tests, `coverage:check`, Prettier, and the
  `--list` of every test (1072 file+title pairs identical to before; +10 unit, +`seed`, +`INFRA-01`).
