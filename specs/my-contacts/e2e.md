# E2E — MyContacts

> Author + type-check only (this pass). Suite has NOT been run — app was not up. See "Prerequisites for the run phase" below.

Suite: `client/e2e/my-contacts/{list.e2e.ts, detail.e2e.ts}`. Project: `chromium` (regular-user storageState `user.json`, `user@test.com` / `User@123`). No `playwright.config.ts` change needed — `my-contacts/` is not in the admin-only folder list, so it's already picked up by the default `chromium` project glob.

Real backend throughout both files (no seed-data stubbing) **except**:
- `list.e2e.ts` → "error / loading" describe block, which stubs `GET /api/v1/contacts` on that test's page only (delay for skeleton, 500 for error state) — same convention as `admin-authz.e2e.ts`'s stable-deny-state pattern.

## Seed prerequisite (BLOCKING for the run phase)

`server/src/database/seeders/data/contacts.ts` + `contact.seeder.ts` (`attachMyContactsOwner`, task A4) must have run against the target DB (`yarn seed`, idempotent) so that `user@test.com` owns exactly these 3 sample contacts, spanning all 3 statuses:

| Subject | Status | Priority |
|---|---|---|
| "App crashes on launch after latest update" | new | high |
| "Billing question about pro plan" | processing | medium |
| "Suggestion: dark mode for dashboard" | resolved | low |

Plus at least one seeded contact NOT owned by `user@test.com` (guest, `userId: null`) — the seeder already provides this ("Cannot login with Google OAuth", "Anonymous bug report...", etc.) — used to assert list data-isolation (Row 3).

If the seeder has not been run, the happy-path / filter / data-rendering / i18n tests will fail with "element not visible" (not a app bug — a seed-state gap). Re-running `yarn seed` is safe (idempotent, matches on subject).

## Scenario Matrix → test mapping

| # | Group | Scenario | Test file | Test name |
|---|---|---|---|---|
| 1 | Happy path | Own contacts render (ticket id/subject/status badge/priority/date); row → detail read-only, no status control | `list.e2e.ts` | "list renders own contacts with ticket id, subject, status badge, priority and date; row navigates to detail" |
| 1 | Happy path | Detail read-only render (own contact) | `detail.e2e.ts` | "renders full message, priority, status badge and date; no status-change control" |
| 2 | AuthN | Unauth → `/contacts/me` redirects `/login` | `list.e2e.ts` | "unauthenticated access to /contacts/me redirects to /login" |
| 2 | AuthN | `GET /contacts` no token → 401 | `list.e2e.ts` | "GET /contacts with no token returns 401" |
| 3 | AuthZ | List never leaks guest/other contacts (data isolation) | `list.e2e.ts` | "guest/other contacts never render in the owner-scoped list" |
| 3 | AuthZ (KEY) | Detail of a not-owned contact (guest, on-the-fly) → 404 not-found, no leak (UI) | `detail.e2e.ts` | "a contact not owned by the current user 404s as not-found, not leaked" |
| 3 | AuthZ (KEY) | Detail of a not-owned contact → 404 at the API level (authenticated bearer) | `detail.e2e.ts` | "GET /contacts/:id for a not-owned contact returns 404 at the API level (authenticated)" |
| 3 | AuthZ | Absent id (well-formed, non-existent) → 404 not-found | `detail.e2e.ts` | "an absent (well-formed but non-existent) id 404s as not-found" |
| 4 | Validation | Invalid `status=xyz` dropped client-side, list unfiltered | `list.e2e.ts` | "invalid status=xyz is silently dropped — table renders unfiltered" |
| 4 | Validation | `page=abc` sanitized to 1 | `list.e2e.ts` | "page=abc is sanitized to page=1 — table renders normally" |
| 4 | Validation | Malformed `:id` (non-ObjectId) → 400 at BE, generic not-found on FE, no crash | `detail.e2e.ts` | "a malformed id renders the not-found state, not a crash" |
| 5 | Empty / null | Search no-match → empty state + Clear filters | `list.e2e.ts` | "search with no match shows the empty state with Clear filters" |
| 5 | Empty / null | Clear filters restores full list | `list.e2e.ts` | "clicking Clear filters restores the full list" |
| 6 | Boundary / pagination | `page=0`/`page=-1` sanitized to 1 | `list.e2e.ts` | "page=0 is sanitized..." / "page=-1 is sanitized..." |
| 6 | Boundary / pagination | `page=9999` beyond range → graceful, no crash | `list.e2e.ts` | "page=9999 beyond range does not crash — graceful empty state" |
| 7 | Filter / search | `status=resolved` shows only matching contact | `list.e2e.ts` | "status filter shows only the matching contact" |
| 7 | Filter / search | Search by subject persists in URL | `list.e2e.ts` | "typing in search filters by subject and persists in the URL" |
| 7 | Filter / search | Combined status+search (AND) | `list.e2e.ts` | "combined status + search filters apply together" |
| 7 | Filter / search | Reload preserves URL state | `list.e2e.ts` | "reload preserves search and status filter state" |
| 8 | Data rendering | Status badge translated, not raw enum | `list.e2e.ts` | "status renders as a translated badge, never the raw enum" |
| 8 | Data rendering | Ticket id ShortId form, not raw ObjectId | `list.e2e.ts` | "ticket id renders as the ShortId form..." |
| 8 | Data rendering | Date via `<time>`, not raw ISO | `list.e2e.ts` | "date column renders formatted text, not a raw ISO timestamp" |
| 9 | i18n (en+vi) | List: title/table headers/submit button (en, vi) | `list.e2e.ts` | "EN: ..." / "VI: ..." |
| 9 | i18n (en+vi) | Detail: title/breadcrumb/fields (en, vi) + not-found translated (vi) | `detail.e2e.ts` | "EN: detail title..." / "VI: detail title..." / "VI: not-found state..." |
| 10 | Error / loading | Skeleton visible while list loading | `list.e2e.ts` | "shows a skeleton while the list is loading" |
| 10 | Error / loading | 5xx settles into stable empty state, no crash | `list.e2e.ts` | "5xx from the list API settles into a stable, non-crashing state" |
| 11 | Mutation safety (Gate A only) | Submit new request (logged in) → list refetch shows it | `list.e2e.ts` | "submitting a new request while logged in shows it in the list after refetch" |
| 12 | Accessibility | Search/Filters accessible names; row link keyboard-reachable; badge is text; Filters popover Escape | `list.e2e.ts` | "MyContacts — accessibility" describe block (4 tests) |
| 12 | Accessibility | Heading order; breadcrumb keyboard-reachable; not-found `role=alert` | `detail.e2e.ts` | "MyContact Detail — accessibility" describe block (3 tests) |

## Follow-up / defer (no silent gap)

- **Guest-submit-no-owner** (design.md Row 11 follow-up): NOT re-verified via Playwright — already covered as a BE unit test in `server/src/modules/contact-admin/contact-admin.service.spec.ts` ("sets userId null for a guest (unauthenticated) submit"). Re-driving guest logout/login in Playwright would be strictly less reliable than the existing unit test.
- **Beyond-range deep pagination** (design.md Row 6 defer, confirmed): the seed user owns only 3 contacts (< `DEFAULT_PAGE_SIZE=20`), so a real second-page dataset does not exist. `page=9999` is still tested for graceful no-crash behavior, but true "next page shows different data" is deferred — would need a dedicated seed with >20 owned contacts, out of scope for this feature.
- **Genuinely-empty MyContacts** (list Row 5, new defer, documented in list.e2e.ts inline): the "user has never submitted anything" empty-state (title "No requests submitted yet" + "Submit new" CTA, `hasActiveFilters=false` branch) cannot be exercised against the shared seed user (`user@test.com` always owns ≥3 sample contacts per the seeder — by design, to give the suite ≥2 statuses to test). The same `PageEmptyState` component IS exercised via the "no search match" path (`hasActiveFilters=true` branch) instead. Exercising the true zero-contacts branch would need a dedicated throwaway user seeded with 0 contacts — out of scope for this suite; flagged as a coverage gap for a future backfill if desired.
- **Role-based non-admin redirect precedent (N/A here)**: MyContacts has no role gate (any authenticated user, own data only) — no analogous case needed.

### BE contract tests (already exist, NOT re-driven via Playwright)

Covered in `server/src/modules/contact-admin/contact-admin.service.spec.ts`:
- `submitContact`: attaches `userId` from `RequestContext` when authenticated; sets `userId: null` for a guest submit.
- `getMyContacts`: scopes strictly to the given `userId`; never returns another user's contacts.
- `getMyContactDetail`: returns the contact when owned by the caller; throws `NotFoundError` (no leak) when it belongs to another user or is absent.

These are the authoritative owner-scope contract tests. The Playwright AuthZ tests above (Row 3) re-verify the same guarantee end-to-end (through the real HTTP boundary + FE render), which is why they're marked the "KEY security case" rather than duplicative — they catch wiring bugs (e.g. wrong guard order, route not mounted) that a service-level unit test cannot.

## Dual-gate plan (§4.3)

- **Gate A**: `cd client && yarn e2e --project=chromium e2e/my-contacts` (or `-g "MyContacts|MyContact Detail"` to scope by title) — runs against the real running app. Requires: BE + FE up, Mongo seeded (see Prerequisites below).
- **Gate B**: MCP browser walk (Playwright MCP `browser_*` tools), auth context **separate** from Gate A (own login, no shared storageState) — walks the full Scenario Matrix rows 1–10, 12 as **read/render-only** verification (visual, console, network). Row 11 (mutation — submit new request) is `Gate: A only` — Gate B does **not** drive a second real submission concurrently (would double-consume the 5/15min `contact:submit` per-IP rate limit and risk racing Gate A's own submission/list-refetch assertions). Gate B may passively observe the "Submit new request" button + dialog OPEN state without clicking Send.
- **Fail → systematic-debugging → `e2e-bugs.md` → fix → re-run (max 3)**, per §4.3.

## Prerequisites / blockers for the run phase

1. **Seed**: `cd server && yarn seed` (idempotent) — MUST include the `attachMyContactsOwner` step (task A4) so `user@test.com` owns the 3 sample contacts listed above.
2. **App up**: BE (`:5000` or worktree port) + FE (`:3000` or worktree port) + Mongo + Redis running. Use `node .claude/scripts/worktree.mjs up my-contacts` (or user's own dev servers) per root CLAUDE.md §4.3 tiered app-running step.
3. **Env**: `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` default to `user@test.com`/`User@123` (matches the seed owner) — no override needed unless the target env uses different seed creds.
4. **Rate-limit budget**: this suite makes 3 real `POST /contact/submit` calls total (1 authenticated in `list.e2e.ts` mutation test + 2 guest in `detail.e2e.ts` AuthZ tests) against the 5-requests/15-min per-IP `contact:submit` limiter — safe in isolation, but if run repeatedly in quick succession (e.g. retries) may hit 429. Space out re-runs by 15 min if this budget is exhausted, or clear the Redis rate-limit key (`rate-limit:contact:ip:*`) between runs.
5. **Type-check**: `npx tsc --noEmit` passes clean (verified this pass). `yarn lint` + `npx prettier --check` also verified clean on both new files.
6. **NOT yet run**: `yarn e2e` was intentionally NOT executed this pass (app was not up) — this is deferred to the run phase (dual-gate above).

## Run-phase status (2026-07-24) — verification caveat

- **Gate A — verified in isolation (not a single consolidated green run).** With the app up + seeded, the suite was run: `detail.e2e.ts` **12/12 pass** (twice), `list.e2e.ts` submit test **2/2 pass**, `npx tsc --noEmit` + `eslint` clean. A full-suite run landed **37/39**, where the only 2 reds were **BE per-IP `contact:submit` rate-limit (429) exhaustion** from cumulative real submits across the iteration session — confirmed via the captured toast, NOT a test/app defect; each of those 2 tests passes when run individually. Round-1 selector defects fixed + logged in `e2e-bugs.md`.
- **A final consolidated 39/39 run + Gate B (MCP visual walk) were NOT obtained** — the local MongoDB service (localhost `rs0`, db `Apartment_App`) went down mid-run and could not be restarted (no admin rights in the agent shell). Per the user's explicit instruction ("bỏ qua bước mongo"), the merge proceeded on the isolation-verified Gate A evidence above; **Gate B is deferred** as a follow-up to run once MongoDB is back up.
- Green checks §4.7 (DB-independent) all pass: BE `lint`+`type-check`+`test` (276) +`build`; FE `lint`+`build`.
- **A11y follow-up (pre-existing, not this feature)**: `SupportDialog` `SubjectField`/`EmailField` label↔input association is broken — `useFieldProps` sets `field.id = field.name`, overriding shadcn `FormControl`'s Slot-injected id that `<FormLabel htmlFor>` targets. Flagged, not fixed (out of MyContacts scope).
