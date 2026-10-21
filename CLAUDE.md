# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ducker ID (web-app-ducker-id)

Ducker ID (Identity Management System) is the sign-in gateway and app launcher portal for the owner's constellation of satellite web apps: it owns accounts, authentication flows, the app registry and the admin console. Monorepo with `client/` (Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query, Zustand, next-intl) and `server/` (Express 4, MongoDB/Mongoose 8, Redis + BullMQ, JWT, Joi, Jest) — formerly the two separate repos `web-store-apps` (client) and `api-web-store-apps` (api), merged via `git subtree`.

`README.md` is the user-facing description — every shipped feature, the tech-stack table, setup steps and the folder tree. This file covers what the README does not: how the pieces wire together and where the traps are.

> **Naming debt from the 2026-08-20 rename:** the product is **Ducker ID** and the slug is
> `web-app-ducker-id`, but two places still say `IDMS` on purpose. The demo app seeded as
> `IDMS Portal` in `server/src/database/seeders/data/web-apps.ts` is asserted on by 22 lines
> across five Playwright specs, and `automation-test/src/tests/e2e/favorites/favorites-page.e2e.ts` reasons
> about its **alphabetical position** to tell Recent order apart from alphabetical order.
> Renaming the fixture and its assertions is one atomic change that has to be verified by
> running e2e — which needs MongoDB plus a running client and server, so it was not attempted
> blind. Dated specs under `docs/specs/` keep `IDMS` as historical record.
> The OpenAPI document also still calls itself `AppStore Web API` (`server/src/libs/swagger/openapi.ts`).

The OIDC core is implemented — `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`, discovery and JWKS, with Authorization Code + PKCE. Missing from MVP-1: consent screen, `/oauth/introspect`, `/oauth/revoke`, refresh-token grant and back-channel logout. See `docs/project-goals.md` and `docs/unfinished-features.md`.

**These endpoints do not live under `/api/v1`.** OIDC discovery must sit at the origin root, so `oauth.routes.ts` is mounted straight onto `app` by `mountHttp` in `loaders/http.ts`, and `client/next.config.ts` rewrites `/oauth/*` and `/.well-known/*` to the API. The client's `middleware.ts` matcher excludes both — letting next-intl touch them would prefix a locale and break every registered `redirect_uri`.

## Commands

pnpm everywhere (`packageManager` pins the version in each `package.json`). There is no docker-compose and no Makefile; MongoDB runs locally and Redis is whatever `server/.env` `REDIS_URL` points at — today a cloud Redis instance (see `server/.env.example`).

| Where     | Command                                             | Purpose                                     |
| --------- | --------------------------------------------------- | ------------------------------------------- |
| repo root | `pnpm install`                                       | installs husky only (`prepare`) — root has no app deps |
| `client/` | `pnpm install`                                       | install frontend deps                        |
| `client/` | `pnpm dev`                                           | Next.js dev server (Turbopack) on :3000      |
| `client/` | `pnpm build` / `pnpm start`                          | production build / serve                     |
| `client/` | `pnpm lint` / `pnpm lint:fix` / `pnpm format`         | ESLint / autofix / Prettier                  |
| `client/` | `pnpm exec tsc --noEmit`                             | type check — the client has **no** `type-check` script |
| `server/` | `pnpm install`                                       | install backend deps                         |
| `server/` | `pnpm dev`                                           | nodemon + ts-node API on :5000               |
| `server/` | `pnpm dev:check` / `pnpm type-check`                 | tsc watch / one-shot                         |
| `server/` | `pnpm build` / `pnpm start`                          | compile to `dist/` / build+run               |
| `server/` | `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Jest unit tests (no DB needed)             |
| `server/` | `pnpm seed` / `pnpm seed:clear`                      | seed / clear MongoDB — the only schema tooling; there is no migration framework |
| `server/` | `pnpm lint` / `pnpm lint:fix` / `pnpm format`          | ESLint / autofix / Prettier                  |
| `automation-test/` | `pnpm install` + `pnpm exec playwright install chromium` | install the regression suite              |
| `automation-test/` | `pnpm test` / `pnpm test:smoke`                 | full regression / `@smoke` subset (needs client + server + DB up) |
| `automation-test/` | `pnpm test:e2e` / `pnpm test:api`               | browser layer / HTTP layer only              |
| `automation-test/` | `pnpm coverage:check [--write]`                 | requirement ↔ test case ↔ spec ↔ bug check, `@smoke` ⇔ P0; `--write` regenerates the traceability matrix |
| `automation-test/` | `pnpm test:unit` / `pnpm typecheck`             | config unit tests (no app needed) / TypeScript |

Husky's pre-commit hook runs `lint-staged` in `client/`, `server/` then `automation-test/`.

### Running a single test

```bash
# server — one file, then one case by name
cd server && pnpm test src/modules/user/user.service.spec.ts
cd server && pnpm test -t "returns paginated users"

# regression suite — one module, one file, one test case
cd automation-test && pnpm test src/tests/e2e/admin-apps
cd automation-test && pnpm test src/tests/api/oidc/token.api.ts
cd automation-test && pnpm test -g "@TC-AUTH-014"
```

Jest picks up `src/**/*.spec.ts` plus `test/integration/**` and `test/e2e/**`; factories, helpers and mocks live in `server/test/`. Service tests sit in `services/spec/`, repository tests in `repository/spec/`. Current suite: **101 suites / 762 tests**, no database required.

`jest.config.ts` sets `resetMocks: true`, which clears the *implementations* a `jest.mock` factory set up, not just the call history. A factory must therefore close over bare `jest.fn()`s and the implementations be rebuilt in `beforeEach`, or the mock works in the first test of a file and returns `undefined` in every one after it.

All Playwright tests live in **`automation-test/`** — a standalone pnpm package at the repo root (it was `client/e2e/` until 2026-10-10; since 2026-10-13 it follows the workspace skill `scaffold-automation-testing`: everything under `src/`, Vietnamese docs, its own `CLAUDE.md`). `src/tests/e2e/<module>/*.e2e.ts` drive Chromium, `src/tests/api/<module>/*.api.ts` hit the API over HTTP; both run with `workers: 1` against one seeded database, in one `app` project between `session` (logs user and admin in once) and `teardown`. Each spec **declares its own session** with `test.use({ role: "user" | "admin" | "guest" })` from `@/fixtures` (default `user`), and can take `userPage` / `adminPage` / `guestPage`, `userApi` / `adminApi` / `guestApi`, or the REST client `api` / `newApi()`. **Configuration is read from the app, not re-declared**: `src/config/` takes the web URL, API prefix and API origin from `client/.env(.local)`, Redis and Mongo from `server/.env` (a feature worktree reads the main checkout's `.env` files, then `.env.example`) and the seeded accounts from `server/src/database/seeders/data/users.ts`; `automation-test/.env` only overrides for the e2e stack. One-time codes are stored only as bcrypt hashes, so tests call the real send endpoint and then **plant** a known code in Redis (`src/utils/redis.ts`); rate-limit counters are cleared before every test; any test that changes account state uses a throwaway `…@e2e.example.com` account from `createAccount()`, which `teardown` deletes. Seeded `user@test.com` / `admin@test.com` are shared by every spec and must never be locked, have their password changed, or be signed out through the shared session — logout revokes that refresh token for every spec that runs after it. Every test carries the `@TC-<MODULE>-NNN` tag of the test case it proves (`src/test-cases/<module>.md`), traced to `src/docs/requirements/<module>.md`; open bugs live in `src/defects/<module>.md` and are marked in specs with `// BUG:` + `test.fail()`; `pnpm coverage:check` fails on any gap. Module codes in IDs are the folder name upper-cased without dashes (`ADMINUSERS`, `PASSWORD`) — the pre-2026-10-13 codes (`ADMUSERS`, `PWD`, `BUG-001`…) that dated specs under `docs/specs/` still use map via `automation-test/src/docs/id-migration.md`. The base URL resolves as `E2E_BASE_URL` → `.worktree-state.json` → client `NEXT_PUBLIC_SITE_URL` — set `E2E_BASE_URL` explicitly in a worktree, or the run hits the main checkout on `:3000`. Run it only against a **dedicated seeded database** (`DB_NAME=ducker-id-e2e`, API `:5600` with `OIDC_ISSUER` = the test client's URL, client `:3600`) — `server/.env` points at real working data, and `user.setup.ts` refuses any database that is not the seed. Use a production build of the client for a full run (`next dev` outgrows 16 GB of RAM within one UI batch), and keep any other Ducker ID server off the shared Redis while it runs (BullMQ queues are per Redis, not per database). Every module is on page objects / API clients (2026-10-14); `src/helpers/` no longer exists. Full rules: `automation-test/CLAUDE.md`; run procedure: `automation-test/src/docs/test-plan.md`.

## Architecture

### Server — boot order and hand-wired DI

`server.ts` boots `app.ts` (helmet → CORS with credentials → `requestId` → i18next → json/urlencoded 10mb → cookie-parser → `RequestContext` → `requestLogger` → Swagger UI at `/api-docs`), then `bootstrap()` in `loaders/index.ts` — the composition root — runs four stages: **`connectInfrastructure()`** (MongoDB, Redis, OIDC signing keys; `infrastructure.ts`) → **`createServices()`** (email and notification services, their BullMQ queues and dispatchers; `services.ts`) → **`createModules()`** (`modules.ts`) → **`mountHttp()`** (`http.ts`). Every `app.use` the loaders add lives in `mountHttp`, in match order: Bull Board → OAuth at the origin root → `/api/v1` → `/health` → 404 → error handler. Connections are opened there and passed down as arguments — nothing holds them in module state — and `bootstrap` returns the shutdown, which `server.ts` calls on SIGTERM/SIGINT: queues first, then MongoDB and Redis. `bootstrap` does not log failures; `server.ts` logs once and exits. `requestId` and i18next deliberately run **before** the body parsers: a malformed, oversized or wrong-typed body is rejected inside `express.json`, and `error.filter.ts` still has to answer it in the translated envelope with an `X-Request-Id` — 400 `MALFORMED_BODY`, 413 `PAYLOAD_TOO_LARGE` or 415 `UNSUPPORTED_MEDIA_TYPE`, never a 500. Moving either below the parsers brings the 500 back.

There is no DI container. Every module exports a `create<Name>Module(...)` factory that news up repository → service → controller → router and returns the routers plus any service other modules need. `createModules()` in `loaders/modules.ts` calls those factories **in dependency order by hand** (`userService` and `loginHistoryService` exist before `login`, which takes both) and returns the routers unmounted — `oauthRouter` plus the ordered `apiRouters` array that `mountHttp` puts under `/api/v1`. Consequences:

- **A new module is dead code until it is added to `loaders/modules.ts`** — its factory call and its router in `apiRouters`. `modules/oauth-consent/` is a schema-only stub (`constants/` + `types/`, no routes) and is intentionally unwired.
- Adding an endpoint touches up to **three** places: the module's `*.routes.ts`, `loaders/modules.ts` (only for a new module or router), and `src/libs/swagger/openapi.ts`, which imports each module's `swagger/` barrel and spreads it into `allSchemas` / `allPaths`. Every module that mounts routes under `/api/v1` is registered there (`login-history`, `favorite`, `unlock-account` and the admin contact paths were added on 2026-10-15), and `openapi.spec.ts` fails if a module's prefix goes missing or a `$ref` does not resolve — so a new module's `swagger/` barrel belongs in the same change. The root-mounted OIDC routes are not in `/api-docs`.
- A module exposing both a user and an admin surface returns two routers (`userRouter` + `userAdminRouter`, `webAppUserRouter` + `webAppAdminRouter`, …) instead of branching inside one.

Module anatomy: `<name>.module.ts` (factory), `<name>.routes.ts`, `<name>.controller.ts`, plus `dtos/`, `types/`, `constants/` and `swagger/` (`paths.ts` + `schemas.ts` + a Postman collection). 16 wired modules, ~62 route handlers.

Service and repository live in folders rather than single files (`docs/specs/module-struct-batch*/`) — those are the two that grow worst:

- `repository/<name>.repository.ts` holds only `interface <Name>Repository` (type imports and nothing else); the Mongoose class moves to `repository/impl/mongo-<name>.repository.ts`. There is **deliberately no barrel** — the service imports the interface, and only the module factory is allowed to reach into `impl/`, which is what keeps the boundary real.
- `services/` holds **one public method per file** (`update-password.ts` exports `updatePassword(authRepo, …)` — a plain function whose first argument is the dependency), with `services/index.ts` as a façade class whose methods are one-line delegates and `services/spec/` for the unit tests. Validation, logging and `try/catch` live in the method file, never in the façade.

Two shapes fall out of that:

- A service with **one** public method keeps class and logic together in `services/index.ts` — splitting 23 lines across two files buys nothing the module name does not already give. The uniform `@/modules/<name>/services` import path is the part worth keeping.
- A service with **two or more** dependencies declares them in `services/deps.ts` as `interface <Name>ServiceDeps`; method files take `deps` as their first argument and the façade constructor takes one object instead of a positional list. With seven dependencies, `refreshAccessToken(authService, userService, g1, g2, g3, g4, g5, token)` is not a signature anyone can read.

A module with two or more **different** repositories (not two implementations of one contract) uses `repositories/` instead, laid out the same way: interfaces at the folder root, classes under `repositories/impl/`. Repository tests sit in `repository/spec/`, mirroring `services/spec/`.

Private methods follow the call graph. One that serves a single public method becomes an unexported function in that method's file; one shared by two or more goes to `services/shared/<name>.ts`, same shape, not on the façade. Neither becomes a helper — `helpers/` is for pure functions, and these touch Redis, Mongo or a transaction.

A module with two or more services puts each one in its own sub-folder — `services/login/`, `services/login-audit/` — and `strategies/` is laid out the same way. Neither folder has a barrel; the only `index.ts` is the class inside each sub-folder. Where a `strategies/` folder already splits the work per use case, the façade's one-line delegates stay on the façade: a method file holding `return deps.otpStrategy.sendCode(req)` adds a hop to a trace rather than removing one.

Every module with code uses this layout; `oauth-consent` is a schema-only stub with nothing to split. No `*.service.ts` or `*.repository.ts` remains at a module root — one appearing means somebody created it off-standard, not that a module was missed. Full rules in `server/.claude/rules/modules.md`; design rationale in `docs/specs/authentication-module-structure/design.md` and the `docs/specs/module-struct-batch*/design.md` series.

Categories are their own module (`modules/category/`), wired **before** `web-app` so its repository can be handed to `createWebAppModule` for the `categoryIds` existence check. It owns both `/admin/categories*` and the public `GET /apps/categories`; `/admin/apps/categories` no longer exists. An app carries 1–5 ordered `categoryIds` (first = primary); category names are `{ en, vi }` and the client picks one by locale — there is no slug→locale map anymore. Data from before this shape is moved by `pnpm migrate:category-management` (idempotent; `server/src/database/migrations/`).

**Who may open an app is decided in one place.** `entitlements` stores only exceptions to the role default — `allow` beyond the role, `deny` despite it; with no record a user gets an app when `requiredRoles` is empty, lists their role, or they are an admin. `createEntitlementModule` is wired **before** `web-app` and hands its `AccessPolicy` to `web-app`, `favorite`, `recent-app` and `oauth`; each resolves the user's `AccessScope` per request (no cache, so a revoke holds on the next request) and checks it with `canAccessApp` (one app) or `buildAccessFilter` (a list — its clauses go into `$and`, because `buildWebAppFilter` already owns `$or` for search). Never filter by `requiredRoles` directly in a new launcher query. `PATCH /admin/entitlements` takes the value the admin wants and stores an override only when it differs from the role default.

Every paginated endpoint goes through `src/common/pagination/`: `resolvePaging(query)` turns a validated query into the `{ skip, limit, sort }` a repository takes plus the `page` the response needs, and `toPageMeta(total, page, limit)` builds the `meta`. `PaginatedResult<T>` and `PageMeta` live there too. Don't recompute `(page - 1) * limit` in a service, and don't clamp `page` — every paginated Joi schema already enforces `min(1)`.

An empty result is `totalPages: 0` on every paginated endpoint. `web-app.listUserApps` used to answer `1`; that was unified away once the helper landed.

Cross-cutting concerns deliberately live **outside** the modules:

| Concern | Location | Notes |
| --- | --- | --- |
| Mongoose schemas | `src/models/` | never inside a module |
| Joi schemas | `src/validators/schemas/` | applied per route via `bodyPipe` / `paramsPipe` / `queryPipe`; they `stripUnknown` and overwrite `req[source]` with the validated value |
| Guards | `src/middlewares/guards/` | `authGuard`, `adminGuard`, `optionalAuthGuard`, `passwordChangeAuthGuard` (see below) |
| Rate limiting | `src/middlewares/common/rate-limiter.middleware.ts` | Redis-backed; one `RateLimiterMiddleware` instance is passed into route factories and applied per route (`rl.updateProfileByIp`, …) |
| Errors | `src/common/exceptions/` + `src/middlewares/filters/error.filter.ts` | handlers are wrapped in `asyncHandler`, so throwing is how you fail a request |
| Responses | `src/common/responses/`, `pagination/`, `sort/` | envelope `ResponsePattern<T> = { timestamp, path, message, data }`; errors `{ code, message, timestamp, path, errors? }`. There is no envelope-level `meta` — paginated endpoints return `data.meta`, built by `toPageMeta` |
| Messages | `src/i18n/` | error and success text is an i18next **key** translated per request (`req.t`) — by `error.filter.ts` for errors and `SuccessResponse.send` for successes — not a literal. A namespace only loads if it is listed in `ns` in `src/i18n/config.ts`; `src/i18n/catalogue.spec.ts` fails when a `ns:key` used in code is missing from either locale or `ns` drifts from the locale files |

Email is never sent inline: `EmailDispatcher` pushes onto the BullMQ `emailQueue` (templates are React Email components rendered server-side), with Bull Board at `/admin/queues`. Bull Board is mounted behind `adminGuard` in `loaders/http.ts` (guest 401, non-admin 403) because job payloads carry one-time codes in plaintext — it now needs an admin's Bearer token, so a browser cannot open it directly. `/health` reports MongoDB and Redis status.

**Session revocation is not purely stateless any more.** `POST /auth/logout` puts the request's refresh token on a Redis denylist (`revoked-refresh-token:<sha256>`, TTL = the token's remaining life) and `/auth/token/refresh` checks it through `RefreshTokenNotRevokedGuard` (`modules/token/guards/`) → 403 `REFRESH_TOKEN_INVALID`; access tokens still live until they expire. A temporary-password session (after an admin reset or a self-service unlock) carries a `mustChangePassword: true` claim, and `authGuard` refuses it with 403 `AUTH_PASSWORD_CHANGE_REQUIRED` everywhere except `PATCH /auth/change-password` and `POST /auth/logout`, which use `passwordChangeAuthGuard`. A new route that such a user must reach has to opt in the same way. Known gap: the IdP `sid` session is not checked, so a temp-password user who already has one can still complete SSO through `/oauth/authorize`.

Notifications follow the same shape. A module that wants to tell a user something takes `NotificationDispatcher` (`src/services/notification/`) through its factory and calls `notify({ userId })`, `notifyByAuthId({ authId })` (login history only knows the auth id) or `broadcast({ roles, dedupeKey })`; the `notification` queue's worker writes the rows. The dispatcher **never throws** — a failed write must not fail the password change or sign-in that caused it. The writer lives in `src/services/`, not in `modules/notification/`, because queues are built before modules load. Rows hold `type + params + link`, never text: the client renders `notifications.types.<TYPE>` from its own catalogue, so a new type needs an entry in **both** `client/src/locales/{en,vi}/notifications.json`. Producers today: change-password, admin reset-password, password lockout, login-history (new device or country → `LOGIN_ANOMALY`, and the row's `isAnomaly`), web-app (an app announced once, claimed through `webApp.announcedAt`) and entitlement (`ENTITLEMENT_GRANTED` / `_REVOKED`, only for pairs whose effective access flipped, active apps only).

### Client — thin routes, thick views

Files under `src/app/[locale]/(public|private)/…` are thin wrappers; the real screen is `src/views/<Page>/` with `mains/` (page sections), `components/` (local UI), `hooks/` (React Query) and `ghosts/`. **Ghosts** (`src/ghosts/`, also per view) are headless components that render `null` and exist only for a side effect — `TokenRefresher`, `TableLoadingAnnouncer`, `AutoVerifyOTPEffect`.

- **Auth is not in middleware.** `src/middleware.ts` handles locale routing only; access control is `AuthGuardLayout` / `GuestGuardLayout` / `AdminGuardLayout` / `SessionGate` in `src/layouts/`. `AdminGuardLayout` wraps the `(admin)` route group and `router.replace`s a non-admin to Home before the admin shell renders; it reads the role from the id token, so the API's `adminGuard` remains the real boundary.
- **Tokens:** the access token lives in the Zustand `auth` slice **in memory only**, never persisted. `ghosts/TokenRefresher` polls every 30s and refreshes when under 60s of life remains; `libs/axios.ts` attaches it as a Bearer header and force-logs-out when a 401 carries `REFRESH_TOKEN_REQUIRED` / `REFRESH_TOKEN_INVALID`. Outside React, read it with `useAuthStore.getState()`.
- **API proxy:** axios `baseURL` is `NEXT_PUBLIC_API_PREFIX` (`/api/v1`) and `next.config.ts` rewrites that prefix to `API_SERVER_URL`. Never hardcode a backend origin. One file per feature under `src/requests/`.
- **List pages are one system:** `useListQuery(filterDefs)` keeps search/filter/page/sort in the **URL query params** as source of truth, rendered through `components/PageContainer/*` (`PageShell` → `PageHeader` → `PageToolbar` → `PageContent`) plus `CustomTable` and `CustomPagination`. Filter definitions and table columns are declared as data in `src/dataSources/<Feature>/`. Build React Query params from `query.appliedSearch` (debounced), not `query.search` (the live value — it refetches on every keystroke).
- **`Custom*` wrapper layer:** `src/components/ui/*` (shadcn) is treated as immutable — extend by wrapping (`CustomButton`, `CustomInput`, `CustomDateInput`, `CustomImage`, …). Navigation helpers (`Link`, `useRouter`, `redirect`) must come from `@/i18n/navigation` to stay locale-aware; routes, endpoints and storage keys go through `CONSTANTS.<DOMAIN>.<KEY>` from `@/constants`.
- **i18n:** `en` (no URL prefix) and `vi` (`/vi`) via next-intl with the `as-needed` strategy; catalogues in `src/locales/{en,vi}/`.

### Where the conventions actually live

Four instruction layers stack here, and **two of them are not in this repo**:

1. `CLAUDE.md` (this file) — committed to the app repo.
2. `.claude/CLAUDE.md` — the Vietnamese methodology layer. `.claude/` is gitignored by this repo **and is its own git repo** (`claude-architecture-ducker-id`); commit changes to it separately. It also holds the shared skills (`standard-security`, `standard-shadcn`, `design-bootstrap`, `e2e-scenario-coverage`, `triage-lessons`) and `settings.local.json`, whose `PostToolUse` hooks run incremental `tsc`, Prettier and ESLint after every edit — that is where the extra output after a file write comes from.
3. `client/.claude/` and `server/.claude/` — per-side code conventions (`CLAUDE.md` + `rules/*.md`, and `skills/` on the server). **Both are gitignored**, so they are absent from a fresh clone or a worktree checkout; never commit rule edits from there into this repo.
4. On conflict: `docs/design-system/ducker-id/MASTER.md` > `<side>/CLAUDE.md` > `<side>/.claude/rules/*.md` > shared skill. The one exception is the 36/40/48 control-size scale in `client/.claude/rules/components.md`, which matches `BUTTON_SIZE_CLASSES` in code and which MASTER.md explicitly defers to.

### Design system

`docs/design-system/ducker-id/MASTER.md` is the token source of truth for every UI change: palette (Prussian `#143A5A` primary, Brass `#B07D2B` accent, warm stone neutrals, three-layer primitive → semantic → component tokens), typography (Space Grotesk display + IBM Plex Sans body + IBM Plex Mono, via `next/font/google`), the engineered-flat style, the app-shell page pattern, and the verified contrast table. It was produced once, on 2026-09-25, by the `design-bootstrap` skill — `ui-ux-pro-max` supplies the non-overridable a11y/UX constraints, `frontend-design` decided palette, type pairing and the signature element (the 2px brass keyline). What was overridden and why is recorded in `docs/adr/0002-design-system-bootstrap.md`. **Never re-run the bootstrap for a feature** — regenerating drifts the tokens.

Three project constraints outrank the plugins because they are wired into code and tests: **Lucide** is the only icon set, motion is **Framer Motion** only (no GSAP), and control heights come from `BUTTON_SIZE_CLASSES`.

Feature work is spec-driven and worktree-isolated: branch from a fresh `origin/main`, keep `design.md` / `plan.md` / `security-report.md` under `docs/specs/<feature-name>/`, the feature's requirements, test cases, specs and bugs in `automation-test/src/` (`docs/requirements/<module>.md`, `test-cases/<module>.md`, `tests/`, `defects/<module>.md`), UI mockups under `docs/ui-designs/<feature-name>/` (read MASTER.md before drawing one), and read plus update `docs/project-goals.md` and `docs/unfinished-features.md` in the same PR. A user review gate precedes every commit.

### Still mock-backed

`docs/unfinished-features.md` is the backlog, but it was last audited 2026-07-09 and now overstates the gap — AdminUsers lock/unlock/reset and the entitlements matrix (05.10.2026) have since been wired to real endpoints. What still imports from `@/mocks` today: `useForceLogoutAdminUser`, all three Billing cards, and the Profile stat badges.

## README — keep `## Features` in sync

`README.md` describes what the app does for its users — it is not a boilerplate page. Every commit that adds or changes user-facing behaviour (`feat:`) also updates the `## Features` section of `README.md` in the same branch, before merging — one short English bullet in the existing style.

While touching README, refresh any stale numbers you notice (test counts, stack versions).

README-only documentation commits use a `docs:` prefix.

## Commits

Conventional Commits with a feature scope, English subject and body: `feat(admin-users): wire lock/unlock to real API (#57)`, `docs(my-contacts): design, plan, e2e (#51)`, `fix(a11y): …`, `refactor(i18n): …`, `chore(seed): …`. Bodies explain reasoning, not the diff. User-facing conversation is expected in Vietnamese; commit messages, code and identifiers stay English.
