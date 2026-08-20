# Ducker ID — one account and one launcher for a constellation of web apps

Ducker ID (Identity Management System) is the sign-in gateway and app portal for the owner's family of web apps. Users register once, sign in with a password, an email OTP or a magic link, and land on a dashboard that lists the apps they can open, plus their own login history, notifications and support tickets. Administrators use the same site to register apps, manage accounts and work the support inbox.

This repository is a monorepo: `client/` is the Next.js web UI, `server/` is the Express REST API. It was assembled from the two former repositories `web-store-apps` (client) and `api-web-store-apps` (api).

## Features

- **One email-first entry point for sign-in and sign-up**
  - Type your email on the login screen; known addresses go to the password step, unknown ones are sent a sign-up code automatically and continue into registration
- **Sign up with email verification**
  - A one-time code is emailed to you, with a resend option, and must be verified before the account exists
  - Finish by filling in your name and password
- **Three ways to sign in**
  - Email + password
  - One-time code sent to your email
  - Magic link sent to your email — clicking it signs you in
  - The alternative-methods screen lets you switch between them mid-flow
- **Account lockout and self-service unlock**
  - Too many wrong passwords locks the account temporarily and the message says how long
  - Request an unlock code by email and verify it to get back in
- **Password recovery and change**
  - Forgot-password by one-time code or by magic link, then set a new password
  - Change your own password from the profile page
  - After an admin resets your password you are sent to a forced change-password screen and cannot use the rest of the site until you set a new one
- **App launcher dashboard**
  - Home page greets you by time of day and shows quick-access and recommended app tiles
  - `/apps` lists every app you may see, filtered by your role, with text search, category filter, grid/list toggle and pagination
  - Opening a tile launches that app's own URL in a new tab
  - Header search finds apps as you type, with keyboard navigation, and opens one directly or jumps to the full list
- **Favourites**
  - Star or unstar any app from its tile
  - `/favorites` shows just your starred apps
- **Login history**
  - Your own sign-in attempts with method, success/failure and reason, IP, country and city, device type, OS and browser, and an anomaly flag
  - Summary stat cards above the table
- **Notifications inbox**
  - Unread badge and panel in the header, plus a full `/notifications` page grouped by date
  - Mark a single notification or all of them as read
- **Support requests**
  - Submit a request from the support dialog anywhere in the app — as a signed-in user or as a guest
  - `/contacts/me` lists the requests you submitted with their ticket ID and status, and a read-only detail page
- **Your profile**
  - View and edit full name, phone, date of birth, gender and address
- **Language and appearance**
  - English and Vietnamese (Vietnamese pages under `/vi`), switched from the user menu
  - Light, dark or system theme
- **Admin — app registry**
  - `/admin/apps` lists registered apps with search, status and category filters and column controls
  - Create or edit an app: display name, description, icon URL, home URL, category, required roles, redirect URIs, post-logout redirect URIs, back-channel logout URI, grant and response types, scopes and token-endpoint auth method
  - A client ID and client secret are generated on creation; the secret is shown once, with a copy button
  - Activate or deactivate an app with a status switch
- **Admin — user accounts**
  - `/admin/users` lists accounts with search plus role and status filters
  - Lock and unlock an account
  - Reset a user's password: a temporary password is issued and the user must change it at next sign-in
- **Admin — login history and support inbox**
  - `/admin/login-history` shows sign-in attempts across all accounts, with a detail page per entry
  - `/admin/contact` lists incoming support requests with a detail view and a `new → processing → resolved` status workflow
  - `/admin` is a landing page linking to each admin area
- **Operator tooling**
  - Swagger UI at `/api-docs` (and `/api-docs.json`) on the API
  - `/health` reports MongoDB and Redis status
  - Bull Board email-queue dashboard at `/admin/queues`

### Not built yet

These have a user interface but no working backend, or are named in `docs/project-goals.md` and not started. See `docs/unfinished-features.md`.

- **OAuth 2.0 / OIDC provider** — none of `/oauth/authorize`, `/oauth/token`, `/oauth/introspect`, `/oauth/revoke`, `/oauth/userinfo`, the JWKS or discovery documents exist, and there is no consent screen. App-registry entries already store OAuth client metadata (client ID/secret, redirect URIs, grant types, scopes) but nothing consumes it, and the `oauth_consents` schema has no routes. Launching an app just opens its URL — there is no single sign-on handoff.
- **Per-user entitlements** — `/admin/entitlements` has a full user × app matrix with a multi-select user picker, role filter and edit mode, but it reads and writes mock data; the server's entitlement module is a schema only. App visibility today is by role, not per user.
- **Admin force logout** — the dialog and success toast are wired to a mock; there is no endpoint. Signing out only clears the current browser's refresh-token cookie, so there is no global or back-channel sign-out and no server-side session revocation list.
- **Recently used apps** — `/recently-used` groups apps by Today / Yesterday / This Week / Earlier with search and a clear button, but the list is hardcoded in the client and nothing is persisted.
- **Billing** — `/billing` shows payment methods, invoices and usage from hardcoded data; the Add and Download buttons do nothing and there is no billing module on the server.
- **Smaller gaps** — the three stat badges on the profile card are hardcoded, as is the weekly-activity chart on the home page; the profile Danger Zone "delete account" button has no handler; avatar upload has no endpoint.

## Tech Stack

| Layer     | Stack                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Client    | Next.js 15.3 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui + Radix · TanStack Query 5 · Zustand 5 · React Hook Form 7 + Zod 4 · next-intl 4 · Axios · Framer Motion |
| Server    | Node.js · Express 4 · TypeScript 5 · MongoDB with Mongoose 8 · Redis + BullMQ · JWT + bcrypt · Joi 17 · i18next · Nodemailer + React Email · Winston · Swagger UI |
| Testing   | Jest 30 + ts-jest on the server — **43 suites / 276 tests, all passing**. Playwright 1.60 on the client — 30 E2E spec files under `client/e2e/` (require a running client, server, MongoDB and Redis, so they are not counted here) |
| Tooling   | Yarn (classic) · ESLint · Prettier · Husky pre-commit running lint-staged in both `client/` and `server/`                 |

## Running

MongoDB and Redis must be running locally. There is no docker-compose or Makefile in this repo.

**1. Hooks (once, at the repo root)**

```bash
yarn install          # installs husky only — the root package has no app dependencies
```

**2. Server** — from `server/`

```bash
cp .env.example .env  # then fill in the values
yarn install
yarn seed             # optional: seed apps, categories, users, contacts, notifications
yarn dev              # API on http://localhost:5000, Swagger UI at /api-docs
```

Required environment variables are listed in `server/.env.example`: `APP_PORT`, `CLIENT_URL`, `CORS_ORIGINS`, `TRUST_PROXY`, `DB_URL` / `DB_NAME`, the `REDIS_*` group, `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `JWT_ID_SECRET`, and `USERNAME_EMAIL` / `PASSWORD_EMAIL` for outgoing mail. There is no migration framework — Mongoose creates collections and indexes on boot, and `yarn seed` / `yarn seed:clear` manage sample data.

**3. Client** — from `client/`

```bash
cp .env.example .env.local
yarn install
yarn dev              # http://localhost:3000
```

`client/.env.example` covers `NEXT_PUBLIC_API_PREFIX`, `API_SERVER_URL` (the backend origin that `next.config.ts` rewrites the API prefix to), `NEXT_PUBLIC_SITE_URL`, and the `E2E_*` variables used by Playwright.

**4. Tests**

```bash
cd server && yarn test     # Jest unit tests — no database needed
cd client && yarn e2e      # Playwright — needs client, server, MongoDB and Redis up and the DB seeded
```

## Project structure

```
.
├── client/                     # Next.js web UI
│   ├── src/
│   │   ├── app/[locale]/       # App Router: (public) auth pages, (private) dashboard/settings/admin
│   │   ├── views/              # One folder per page — the actual screens
│   │   ├── components/         # Shared UI, incl. shadcn primitives in components/ui
│   │   ├── layouts/            # Shells and guards: AppHeader, DashboardLayout, AdminLayout, AuthGuardLayout
│   │   ├── requests/           # Typed API callers, one file per feature
│   │   ├── hooks/ stores/      # React Query hooks; Zustand client state
│   │   ├── forms/ schemas/     # Form definitions and Zod validation
│   │   ├── locales/            # en/ and vi/ message catalogues
│   │   ├── mocks/              # Placeholder data for the not-yet-built features above
│   │   ├── ghosts/             # Headless side-effect components (e.g. TokenRefresher)
│   │   ├── dataSources/ constants/ contexts/ i18n/ libs/ types/ utils/
│   │   └── middleware.ts       # Locale routing
│   ├── e2e/                    # Playwright specs and setup projects
│   └── public/
├── server/                     # Express REST API, mounted under /api/v1
│   ├── src/
│   │   ├── app.ts server.ts    # Express wiring; boot with graceful shutdown
│   │   ├── loaders/            # Boot sequence: db, redis, services, queues, modules, health, errors
│   │   ├── modules/            # Feature modules (routes/controller/service/repository/swagger)
│   │   │                       #   auth: signup, login, logout, token, unlock-account,
│   │   │                       #   forgot-password, change-password, authentication
│   │   │                       #   product: user, web-app, favorite, login-history,
│   │   │                       #   notification, contact-admin
│   │   │                       #   schema-only stubs: entitlement, oauth-consent
│   │   ├── models/             # Mongoose schemas
│   │   ├── middlewares/        # Guards, validation pipes, rate limiter, error handler
│   │   ├── validators/         # Joi schemas
│   │   ├── services/           # Email (Nodemailer + React Email) and BullMQ queue
│   │   ├── database/           # MongoDB and Redis connections, seeders
│   │   ├── libs/ i18n/ common/ constants/ types/ utils/
│   ├── test/                   # Jest factories, helpers and mocks
│   └── postman-collection.json
├── docs/
│   ├── project-goals.md        # Scope, goals, non-goals, MVP roadmap
│   ├── erd.md                  # Target MongoDB schema
│   ├── unfinished-features.md  # Backlog of UI-without-API features
│   ├── specs/<feature>/        # Per-feature design, plan, e2e and security notes
│   ├── adr/                    # Architecture decision records
│   └── ui-designs/
├── .husky/pre-commit           # Runs lint-staged in client/ then server/
└── package.json                # Root: husky only
```
