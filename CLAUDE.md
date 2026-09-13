# Ducker ID (web-app-ducker-id)

Ducker ID (Identity Management System) is the sign-in gateway and app launcher portal for the owner's constellation of satellite web apps: it owns accounts, authentication flows, the app registry and the admin console. Monorepo with `client/` (Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query, Zustand, next-intl) and `server/` (Express 4, MongoDB/Mongoose 8, Redis + BullMQ, JWT, Joi, Jest) — formerly the two separate repos `web-store-apps` (client) and `api-web-store-apps` (api), merged via `git subtree`.

> **Naming debt from the 2026-08-20 rename:** the product is **Ducker ID** and the slug is
> `web-app-ducker-id`, but two places still say `IDMS` on purpose. The demo app seeded as
> `IDMS Portal` in `server/src/database/seeders/data/web-apps.ts` is asserted on by 22 lines
> across five Playwright specs, and `client/e2e/favorite-apps/favorites-page.e2e.ts` reasons
> about its **alphabetical position** to tell Recent order apart from alphabetical order.
> Renaming the fixture and its assertions is one atomic change that has to be verified by
> running e2e — which needs MongoDB plus a running client and server, so it was not attempted
> blind. Dated specs under `docs/specs/` keep `IDMS` as historical record.

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
| `client/` | `pnpm e2e` / `pnpm e2e:ui` / `pnpm e2e:headed`        | Playwright E2E (needs client + server + DB up) |
| `server/` | `pnpm install`                                       | install backend deps                         |
| `server/` | `pnpm dev`                                           | nodemon + ts-node API on :5000               |
| `server/` | `pnpm dev:check` / `pnpm type-check`                 | tsc watch / one-shot                         |
| `server/` | `pnpm build` / `pnpm start`                          | compile to `dist/` / build+run               |
| `server/` | `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Jest unit tests (no DB needed)             |
| `server/` | `pnpm seed` / `pnpm seed:clear`                      | seed / clear MongoDB — the only schema tooling; there is no migration framework |
| `server/` | `pnpm lint` / `pnpm lint:fix` / `pnpm format`          | ESLint / autofix / Prettier                  |

## README (REQUIRED — keep in sync with features)

`README.md` describes what the app does for its users — it is not a boilerplate page. Every commit that adds or changes user-facing behaviour (`feat:`) MUST update the `## Features` section of `README.md` in the same branch, before merging — one short English bullet in the existing style.

While touching README, refresh any stale numbers you notice (test counts, stack versions).

README-only documentation commits use a `docs:` prefix.

## Commits

Conventional Commits with a feature scope, English subject and body: `feat(admin-users): wire lock/unlock to real API (#57)`, `docs(my-contacts): design, plan, e2e (#51)`, `fix(a11y): …`, `refactor(i18n): …`, `chore(seed): …`. Feature work is spec-driven: each feature keeps its design/plan/e2e notes under `docs/specs/<feature-name>/`.
