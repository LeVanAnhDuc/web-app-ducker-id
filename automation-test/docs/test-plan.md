# Test plan

How a regression run is done, recorded and kept current.

## 1. Before a run

**Run against a dedicated, seeded database — never against data you care
about.** The suite creates and deletes accounts, apps and contacts, locks and
resets accounts, and writes login history. `server/.env`'s `DB_NAME` is usually
a developer's working data, so give the suite its own database and its own
ports (environment variables beat `.env` in both apps):

```bash
# once per fresh database
cd server && DB_NAME=ducker-id-e2e pnpm seed

# API and client on that database (separate terminals)
cd server && DB_NAME=ducker-id-e2e APP_PORT=5600 CLIENT_URL=http://localhost:3600 pnpm dev
cd client && API_SERVER_URL=http://localhost:5600 npx next dev --port 3600

# once per clone
cd automation-test
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cp .env.example .env   # E2E_BASE_URL=http://localhost:3600, E2E_API_URL=http://localhost:5600,
                       # MONGO_DB_NAME=ducker-id-e2e, REDIS_URL = the server's
```

`user.setup.ts` stops the run before anything is written if the database is
not the seed (no `content` category / `blog` app) or is not the one the API
under test reads. Stop any other client dev server running from the same
`client/` folder first — two `next dev` processes share `.next/`.

## 2. Running

| Command                             | Runs                                                                                        | When                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| `pnpm test`                         | everything (setup → e2e + api → cleanup)                                                    | full regression                 |
| `pnpm test:smoke`                   | `@smoke` cases only                                                                         | "is the app usable?" in minutes |
| `pnpm test:api` / `pnpm test:e2e`   | one layer                                                                                   | backend-only or UI-only change  |
| `pnpm test tests/e2e/admin-users`   | one module                                                                                  | after touching that area        |
| `pnpm test -g "@TC-AUTH-014"`       | one test case                                                                               | reproducing a failure           |
| `pnpm test:headed` / `pnpm test:ui` | with a visible browser / Playwright UI mode                                                 | debugging                       |
| `pnpm report`                       | opens the last HTML report (`reports/html/`)                                                | after a run                     |
| `pnpm coverage:check [--write]`     | requirement ↔ test-case ↔ spec check; `--write` regenerates `docs/traceability-matrix.md` | before committing test changes  |

Runs are serial (`workers: 1`) because every spec shares one database.

## 3. After a run

1. Open the report: `pnpm report`. Each failure has a trace, screenshot and
   error context under `test-results/`.
2. Triage every failure:
   - **Test is wrong** (selector drift, stale copy, timing) → fix the test.
   - **App is wrong** → add an entry to `defects/bug-log.md`; mark the test
     `test.fail()` with `// BUG: <BUG-id> <one line>` so the run stays
     readable and the bug stays visible. Remove the marker when it is fixed —
     Playwright then fails the test if it unexpectedly passes, which is the
     reminder.
   - **Environment** (server down, seed missing) → fix the environment, re-run.
3. Write a summary to `reports/run-YYYY-MM-DD.md` from
   `reports/TEMPLATE.md` and commit it with any test fixes.

## 4. Keeping the suite current

The suite is updated in the **same branch** as the code that changes
behaviour.

### New feature

1. Add its requirements to `docs/requirements.md` (new IDs at the end of the
   module, or a new module section).
2. Write its test cases in `test-cases/<module>.md` using the rubric and
   techniques in `test-design-techniques.md`. This replaces the old
   per-feature `docs/specs/<feature>/e2e.md`; the feature's `design.md` links
   to the TC IDs instead.
3. Write the specs under `tests/e2e/<module>/` and `tests/api/<module>/`,
   tagged with the TC IDs.
4. `pnpm test tests/e2e/<module> tests/api/<module>` green, then
   `pnpm coverage:check --write`.

### Changed requirement

Reconcile all three artefacts together — requirement text, test cases, specs:
add cases for the new behaviour, **update** the ones whose expected result
changed, **remove** the ones for behaviour that no longer exists (strike the
TC through with `Removed (YYYY-MM-DD)` rather than deleting the ID). Then
`coverage:check --write`.

### Removed feature

Strike its requirements and test cases through, delete the specs, regenerate
the matrix.

## 5. Defects

`defects/bug-log.md` holds every app defect the suite has found, open or
fixed, with its BUG ID, the failing TC, evidence and status. The per-feature
`e2e-bugs.md` files that existed before this suite were merged into it.
