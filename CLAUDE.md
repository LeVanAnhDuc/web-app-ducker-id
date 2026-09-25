# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ducker ID (web-app-ducker-id)

Ducker ID (Identity Management System) is the sign-in gateway and app launcher portal for the owner's constellation of satellite web apps: it owns accounts, authentication flows, the app registry and the admin console. Monorepo with `client/` (Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query, Zustand, next-intl) and `server/` (Express 4, MongoDB/Mongoose 8, Redis + BullMQ, JWT, Joi, Jest) — formerly the two separate repos `web-store-apps` (client) and `api-web-store-apps` (api), merged via `git subtree`.

`README.md` is the user-facing description — every shipped feature, the tech-stack table, setup steps and the folder tree. This file covers what the README does not: how the pieces wire together and where the traps are.

> **Naming debt from the 2026-08-20 rename:** the product is **Ducker ID** and the slug is
> `web-app-ducker-id`, but two places still say `IDMS` on purpose. The demo app seeded as
> `IDMS Portal` in `server/src/database/seeders/data/web-apps.ts` is asserted on by 22 lines
> across five Playwright specs, and `client/e2e/favorite-apps/favorites-page.e2e.ts` reasons
> about its **alphabetical position** to tell Recent order apart from alphabetical order.
> Renaming the fixture and its assertions is one atomic change that has to be verified by
> running e2e — which needs MongoDB plus a running client and server, so it was not attempted
> blind. Dated specs under `docs/specs/` keep `IDMS` as historical record.
> The OpenAPI document also still calls itself `AppStore Web API` (`server/src/libs/swagger/openapi.ts`).

Note: despite the OAuth client metadata stored on app-registry entries, the OAuth 2.0 / OIDC endpoints (`/oauth/authorize`, `/oauth/token`, JWKS, consent screen) are **not implemented yet** — see `docs/project-goals.md` (MVP-1) and `docs/unfinished-features.md`.

## Commands

pnpm everywhere (`packageManager` pins the version in each `package.json`). There is no docker-compose and no Makefile; MongoDB and Redis must be running locally (see `server/.env.example`).

| Where     | Command                                             | Purpose                                     |
| --------- | --------------------------------------------------- | ------------------------------------------- |
| repo root | `pnpm install`                                       | installs husky only (`prepare`) — root has no app deps |
| `client/` | `pnpm install`                                       | install frontend deps                        |
| `client/` | `pnpm dev`                                           | Next.js dev server (Turbopack) on :3000      |
| `client/` | `pnpm build` / `pnpm start`                          | production build / serve                     |
| `client/` | `pnpm lint` / `pnpm lint:fix` / `pnpm format`         | ESLint / autofix / Prettier                  |
| `client/` | `pnpm exec tsc --noEmit`                             | type check — the client has **no** `type-check` script |
| `client/` | `pnpm e2e` / `pnpm e2e:ui` / `pnpm e2e:headed`        | Playwright E2E (needs client + server + DB up) |
| `server/` | `pnpm install`                                       | install backend deps                         |
| `server/` | `pnpm dev`                                           | nodemon + ts-node API on :5000               |
| `server/` | `pnpm dev:check` / `pnpm type-check`                 | tsc watch / one-shot                         |
| `server/` | `pnpm build` / `pnpm start`                          | compile to `dist/` / build+run               |
| `server/` | `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Jest unit tests (no DB needed)             |
| `server/` | `pnpm seed` / `pnpm seed:clear`                      | seed / clear MongoDB — the only schema tooling; there is no migration framework |
| `server/` | `pnpm lint` / `pnpm lint:fix` / `pnpm format`          | ESLint / autofix / Prettier                  |

Husky's pre-commit hook runs `lint-staged` in `client/` then `server/`.

### Running a single test

```bash
# server — one file, then one case by name
cd server && pnpm test src/modules/user/user.service.spec.ts
cd server && pnpm test -t "returns paginated users"

# client — one spec; --project is REQUIRED so the matching auth setup runs first
cd client && pnpm e2e e2e/home/home-page.e2e.ts --project=chromium
cd client && pnpm e2e e2e/admin-apps/ --project=admin
```

Jest picks up `src/**/*.spec.ts` (colocated with the code) plus `test/integration/**` and `test/e2e/**`; factories, helpers and mocks live in `server/test/`. Current suite: **43 suites / 276 tests**, no database required.

Playwright (`client/playwright.config.ts`) runs `*.e2e.ts` under `client/e2e/` with `workers: 1` and `fullyParallel: false`, across four projects: `setup` and `admin-setup` log in and write `e2e/.auth/{user,admin}.json`, then `chromium` runs as a **regular user** (it `testIgnore`s the admin-only folders) and `admin` runs those folders. `admin-authz/` is deliberately left in the regular-user project — its denial tests need a non-admin session. E2E needs client + server + MongoDB + Redis up **and the DB seeded**; credentials come from `E2E_*` (defaults `user@test.com` / `User@123`, `admin@test.com` / `Admin@123`). The base URL resolves as `E2E_BASE_URL` → the nearest `.worktree-state.json` entry keyed by the current folder name → `http://localhost:3000`.

## Architecture

### Server — boot order and hand-wired DI

`server.ts` boots `app.ts` (helmet → CORS with credentials → json/urlencoded 10mb → cookie-parser → `requestId` → `RequestContext` → `requestLogger` → i18next → Swagger UI at `/api-docs`), then `loaders/index.ts` runs `loadAll()` in a fixed order: **database → redis → services → queues → modules → health → error handlers**. `closeAll()` mirrors it for graceful shutdown.

There is no DI container. Every module exports a `create<Name>Module(...)` factory that news up repository → service → controller → router and returns the routers plus any service other modules need. `loaders/modules.loader.ts` calls those factories **in dependency order by hand** (`userService` and `loginHistoryService` exist before `login`, which takes both) and `mountRoutes` mounts every router under `/api/v1`. Consequences:

- **A new module is dead code until it is added to `modules.loader.ts`.** `modules/entitlement/` and `modules/oauth-consent/` are schema-only stubs (`constants/` + `types/`, no routes) and are intentionally unwired.
- Adding an endpoint touches up to **three** places: the module's `*.routes.ts`, `modules.loader.ts` (only for a new module or router), and `src/libs/swagger/openapi.ts`, which imports each module's `swagger/` barrel and spreads it into `allSchemas` / `allPaths`. That registry is incomplete today — `login-history`, `notification` and `favorite` have no Swagger entry, so their routes are missing from `/api-docs`.
- A module exposing both a user and an admin surface returns two routers (`userRouter` + `userAdminRouter`, `webAppUserRouter` + `webAppAdminRouter`, …) instead of branching inside one.

Module anatomy: `<name>.module.ts` (factory), `<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`, plus `dtos/`, `types/`, `constants/`, `swagger/` (`paths.ts` + `schemas.ts` + a Postman collection) and colocated `*.spec.ts`. 13 wired modules, ~50 route handlers.

Cross-cutting concerns deliberately live **outside** the modules:

| Concern | Location | Notes |
| --- | --- | --- |
| Mongoose schemas | `src/models/` | never inside a module |
| Joi schemas | `src/validators/schemas/` | applied per route via `bodyPipe` / `paramsPipe` / `queryPipe`; they `stripUnknown` and overwrite `req[source]` with the validated value |
| Guards | `src/middlewares/guards/` | `authGuard`, `adminGuard`, `optionalAuthGuard` |
| Rate limiting | `src/middlewares/common/rate-limiter.middleware.ts` | Redis-backed; one `RateLimiterMiddleware` instance is passed into route factories and applied per route (`rl.updateProfileByIp`, …) |
| Errors | `src/common/exceptions/` + `src/middlewares/filters/error.filter.ts` | handlers are wrapped in `asyncHandler`, so throwing is how you fail a request |
| Responses | `src/common/responses/`, `pagination/`, `sort/` | envelope `ResponsePattern<T> = { timestamp, path, message, data, meta? }`; errors `{ code, message, timestamp, path, errors? }` |
| Messages | `src/i18n/` | error and success text is an i18next **key** translated per request (`req.t`), not a literal |

Email is never sent inline: `EmailDispatcher` pushes onto the BullMQ `emailQueue` (templates are React Email components rendered server-side), with Bull Board at `/admin/queues`. `/health` reports MongoDB and Redis status.

### Client — thin routes, thick views

Files under `src/app/[locale]/(public|private)/…` are thin wrappers; the real screen is `src/views/<Page>/` with `mains/` (page sections), `components/` (local UI), `hooks/` (React Query) and `ghosts/`. **Ghosts** (`src/ghosts/`, also per view) are headless components that render `null` and exist only for a side effect — `TokenRefresher`, `TableLoadingAnnouncer`, `AutoVerifyOTPEffect`.

- **Auth is not in middleware.** `src/middleware.ts` handles locale routing only; access control is `AuthGuardLayout` / `GuestGuardLayout` / `SessionGate` in `src/layouts/`.
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

Feature work is spec-driven and worktree-isolated: branch from a fresh `origin/main`, keep `design.md` / `plan.md` / `e2e.md` / `security-report.md` under `docs/specs/<feature-name>/`, UI mockups under `docs/ui-designs/<feature-name>/` (read MASTER.md before drawing one), and read plus update `docs/project-goals.md` and `docs/unfinished-features.md` in the same PR. A user review gate precedes every commit.

### Still mock-backed

`docs/unfinished-features.md` is the backlog, but it was last audited 2026-07-09 and now overstates the gap — AdminUsers lock/unlock/reset and the entitlements matrix have since been wired to real endpoints. What still imports from `@/mocks` today: `AdminEntitlements` (`useUserGrants`, `useUpdateUserGrants`), `useForceLogoutAdminUser`, all three Billing cards, the Profile stat badges, and `RecentlyUsed`.

## README (REQUIRED — keep in sync with features)

`README.md` describes what the app does for its users — it is not a boilerplate page. Every commit that adds or changes user-facing behaviour (`feat:`) MUST update the `## Features` section of `README.md` in the same branch, before merging — one short English bullet in the existing style.

While touching README, refresh any stale numbers you notice (test counts, stack versions).

README-only documentation commits use a `docs:` prefix.

## Commits

Conventional Commits with a feature scope, English subject and body: `feat(admin-users): wire lock/unlock to real API (#57)`, `docs(my-contacts): design, plan, e2e (#51)`, `fix(a11y): …`, `refactor(i18n): …`, `chore(seed): …`. Bodies explain reasoning, not the diff. User-facing conversation is expected in Vietnamese; commit messages, code and identifiers stay English.
