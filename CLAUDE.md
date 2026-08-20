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

Yarn (classic) everywhere. There is no docker-compose and no Makefile; MongoDB and Redis must be running locally (see `server/.env.example`).

| Where     | Command                                             | Purpose                                     |
| --------- | --------------------------------------------------- | ------------------------------------------- |
| repo root | `yarn install`                                       | installs husky only (`prepare`) — root has no app deps |
| `client/` | `yarn install`                                       | install frontend deps                        |
| `client/` | `yarn dev`                                           | Next.js dev server (Turbopack) on :3000      |
| `client/` | `yarn build` / `yarn start`                          | production build / serve                     |
| `client/` | `yarn lint` / `yarn lint:fix` / `yarn format`         | ESLint / autofix / Prettier                  |
| `client/` | `yarn e2e` / `yarn e2e:ui` / `yarn e2e:headed`        | Playwright E2E (needs client + server + DB up) |
| `server/` | `yarn install`                                       | install backend deps                         |
| `server/` | `yarn dev`                                           | nodemon + ts-node API on :5000               |
| `server/` | `yarn dev:check` / `yarn type-check`                 | tsc watch / one-shot                         |
| `server/` | `yarn build` / `yarn start`                          | compile to `dist/` / build+run               |
| `server/` | `yarn test` / `yarn test:watch` / `yarn test:coverage` | Jest unit tests (no DB needed)             |
| `server/` | `yarn seed` / `yarn seed:clear`                      | seed / clear MongoDB — the only schema tooling; there is no migration framework |
| `server/` | `yarn lint` / `yarn lint:fix` / `yarn format`          | ESLint / autofix / Prettier                  |

## README (REQUIRED — keep in sync with features)

`README.md` describes what the app does for its users — it is not a boilerplate page. Every commit that adds or changes user-facing behaviour (`feat:`) MUST update the `## Features` section of `README.md` in the same branch, before merging — one short English bullet in the existing style.

While touching README, refresh any stale numbers you notice (test counts, stack versions).

README-only documentation commits use a `docs:` prefix.

## Commits

Conventional Commits with a feature scope, English subject and body: `feat(admin-users): wire lock/unlock to real API (#57)`, `docs(my-contacts): design, plan, e2e (#51)`, `fix(a11y): …`, `refactor(i18n): …`, `chore(seed): …`. Feature work is spec-driven: each feature keeps its design/plan/e2e notes under `docs/specs/<feature-name>/`.
